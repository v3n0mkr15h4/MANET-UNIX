#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/stat.h>
#include <sys/select.h>
#include <sys/time.h>
#include <sys/types.h>
#include <fcntl.h>
#include <signal.h>
#include <errno.h>
#include <stdint.h>
#include <arpa/inet.h>

#define VIDEO_SOCKET_PATH "/tmp/video_socket"
#define VIDEO_PIPE_PATH "/tmp/video_pipe"
#define MAX_FRAME_SIZE (10 * 1024 * 1024) // 10MB max frame size
#define BUFFER_SIZE 65536

// Global variables for cleanup
static int server_socket = -1;
static int pipe_fd = -1;
static volatile sig_atomic_t should_exit = 0;

// Signal handler for clean shutdown
void signal_handler(int sig) {
    (void)sig; // Suppress unused parameter warning
    printf("\nShutting down Video Receiver...\n");
    should_exit = 1;
}

// Setup signal handlers
void setup_signal_handlers() {
    struct sigaction sa;
    sa.sa_handler = signal_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    
    sigaction(SIGINT, &sa, NULL);
    sigaction(SIGTERM, &sa, NULL);
}

// Cleanup function
void cleanup() {
    if (server_socket >= 0) {
        close(server_socket);
        server_socket = -1;
    }
    
    if (pipe_fd >= 0) {
        close(pipe_fd);
        pipe_fd = -1;
    }
    
    // Remove socket file
    unlink(VIDEO_SOCKET_PATH);
}

// Create FIFO pipe if it doesn't exist
int ensure_video_pipe() {
    struct stat st;
    
    if (stat(VIDEO_PIPE_PATH, &st) == 0) {
        if (S_ISFIFO(st.st_mode)) {
            printf("Video FIFO pipe already exists: %s\n", VIDEO_PIPE_PATH);
            return 0;
        } else {
            // File exists but is not a FIFO, remove it
            if (unlink(VIDEO_PIPE_PATH) != 0) {
                perror("Failed to remove existing file");
                return -1;
            }
        }
    }
    
    // Create FIFO pipe
    if (mkfifo(VIDEO_PIPE_PATH, 0666) != 0) {
        perror("Failed to create video FIFO pipe");
        return -1;
    }
    
    printf("Created video FIFO pipe: %s\n", VIDEO_PIPE_PATH);
    return 0;
}

// Open video pipe for writing
int open_video_pipe() {
    if (pipe_fd >= 0) {
        return 0; // Already open
    }
    
    printf("Opening video pipe for writing...\n");
    
    // Open pipe in non-blocking mode first
    pipe_fd = open(VIDEO_PIPE_PATH, O_WRONLY | O_NONBLOCK);
    if (pipe_fd < 0) {
        if (errno == ENXIO) {
            printf("Waiting for VLC to open the pipe...\n");
            // Switch to blocking mode and wait for reader
            pipe_fd = open(VIDEO_PIPE_PATH, O_WRONLY);
            if (pipe_fd < 0) {
                perror("Failed to open video pipe");
                return -1;
            }
        } else {
            perror("Failed to open video pipe");
            return -1;
        }
    }
    
    printf("Video pipe opened successfully\n");
    return 0;
}

// Handle video data from client
void handle_video_client(int client_socket) {
    printf("=== DEBUG: Video client connected ===\n");
    fflush(stdout);
    
    char buffer[BUFFER_SIZE];
    char *frame_buffer = NULL;
    uint32_t expected_frame_length = 0;
    uint32_t frame_buffer_size = 0;
    uint32_t frame_bytes_received = 0;
    int reading_length = 1; // 1 = reading length, 0 = reading frame data
    uint32_t length_bytes_received = 0;
    uint32_t length_buffer = 0;
    int frames_received = 0;
    
    while (!should_exit) {
        ssize_t bytes_received = recv(client_socket, buffer, BUFFER_SIZE, 0);
        
        if (bytes_received <= 0) {
            if (bytes_received == 0) {
                printf("Video client disconnected\n");
            } else {
                perror("Error receiving data from client");
            }
            break;
        }
        
        size_t buffer_pos = 0;
        
        while (buffer_pos < (size_t)bytes_received && !should_exit) {
            if (reading_length) {
                // Read frame length (uint32 big endian)
                size_t bytes_needed = 4 - length_bytes_received;
                size_t bytes_available = bytes_received - buffer_pos;
                size_t bytes_to_copy = (bytes_needed < bytes_available) ? bytes_needed : bytes_available;
                
                memcpy(((char*)&length_buffer) + length_bytes_received, buffer + buffer_pos, bytes_to_copy);
                length_bytes_received += bytes_to_copy;
                buffer_pos += bytes_to_copy;
                
                if (length_bytes_received == 4) {
                    expected_frame_length = ntohl(length_buffer);
                    
                    if (expected_frame_length > MAX_FRAME_SIZE) {
                        printf("Frame too large: %u bytes\n", expected_frame_length);
                        goto client_cleanup;
                    }
                    
                    // Allocate or reallocate frame buffer
                    if (frame_buffer_size < expected_frame_length) {
                        frame_buffer = realloc(frame_buffer, expected_frame_length);
                        if (!frame_buffer) {
                            perror("Failed to allocate frame buffer");
                            goto client_cleanup;
                        }
                        frame_buffer_size = expected_frame_length;
                    }
                    
                    reading_length = 0;
                    frame_bytes_received = 0;
                    length_bytes_received = 0;
                    length_buffer = 0;
                }
            } else {
                // Read frame data
                size_t bytes_needed = expected_frame_length - frame_bytes_received;
                size_t bytes_available = bytes_received - buffer_pos;
                size_t bytes_to_copy = (bytes_needed < bytes_available) ? bytes_needed : bytes_available;
                
                memcpy(frame_buffer + frame_bytes_received, buffer + buffer_pos, bytes_to_copy);
                frame_bytes_received += bytes_to_copy;
                buffer_pos += bytes_to_copy;
                
                if (frame_bytes_received == expected_frame_length) {
                    // Save first frame to disk for debugging
                    if (frames_received == 0) {
                        FILE *debug_file = fopen("/tmp/debug_frame.jpg", "wb");
                        if (debug_file) {
                            fwrite(frame_buffer, 1, expected_frame_length, debug_file);
                            fclose(debug_file);
                            printf("=== DEBUG: First frame saved to /tmp/debug_frame.jpg (size: %u bytes) ===\n", expected_frame_length);
                            fflush(stdout);
                        }
                    }
                    
                    // Complete frame received, write to pipe
                    if (pipe_fd < 0) {
                        if (open_video_pipe() != 0) {
                            printf("Failed to open video pipe, dropping frame\n");
                            goto next_frame;
                        }
                    }
                    
                    // Write proper MJPEG format with boundary for VLC
                    if (frames_received == 0) {
                        // Write initial boundary
                        const char* initial_boundary = "--boundary\r\n";
                        write(pipe_fd, initial_boundary, strlen(initial_boundary));
                    }
                    
                    // Write MJPEG frame with proper headers
                    const char* content_type = "Content-Type: image/jpeg\r\n";
                    char content_length[64];
                    snprintf(content_length, sizeof(content_length), "Content-Length: %u\r\n\r\n", expected_frame_length);
                    
                    // Write headers
                    write(pipe_fd, content_type, strlen(content_type));
                    write(pipe_fd, content_length, strlen(content_length));
                    
                    // Write JPEG data
                    ssize_t bytes_written = write(pipe_fd, frame_buffer, expected_frame_length);
                    if (bytes_written != expected_frame_length) {
                        if (bytes_written < 0) {
                            perror("Error writing to video pipe");
                            close(pipe_fd);
                            pipe_fd = -1;
                        } else {
                            printf("Partial write to video pipe: %zd/%u bytes\n", bytes_written, expected_frame_length);
                        }
                    } else {
                        // Write frame boundary
                        const char* boundary = "\r\n--boundary\r\n";
                        write(pipe_fd, boundary, strlen(boundary));
                        
                        if (frames_received < 5) {
                            printf("=== DEBUG: Frame %d written successfully (%u bytes) ===\n", frames_received + 1, expected_frame_length);
                            fflush(stdout);
                        }
                    }
                    
                    frames_received++;
                    if (frames_received == 1) {
                        printf("=== DEBUG: First frame received and written to pipe ===\n");
                        fflush(stdout);
                    }
                    if (frames_received % 30 == 0) {
                        printf("Video frames received: %d\n", frames_received);
                        fflush(stdout);
                    }
                    
                    next_frame:
                    reading_length = 1;
                    frame_bytes_received = 0;
                    expected_frame_length = 0;
                }
            }
        }
    }
    
    client_cleanup:
    printf("Total frames received: %d\n", frames_received);
    
    if (frame_buffer) {
        free(frame_buffer);
    }
    
    close(client_socket);
}
// Main server function
int main() {
    printf("Starting Video Receiver...\n");
    
    // Setup signal handlers
    setup_signal_handlers();
    
    // Ensure video pipe exists
    if (ensure_video_pipe() != 0) {
        return 1;
    }
    
    // Remove existing socket file
    unlink(VIDEO_SOCKET_PATH);
    
    // Create Unix Domain Socket
    server_socket = socket(AF_UNIX, SOCK_STREAM, 0);
    if (server_socket < 0) {
        perror("Failed to create socket");
        return 1;
    }
    
    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, VIDEO_SOCKET_PATH, sizeof(addr.sun_path) - 1);
    
    if (bind(server_socket, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("Failed to bind socket");
        cleanup();
        return 1;
    }
    
    if (listen(server_socket, 5) < 0) {
        perror("Failed to listen on socket");
        cleanup();
        return 1;
    }
    
    printf("Video Receiver listening on: %s\n", VIDEO_SOCKET_PATH);
    printf("Video pipe path: %s\n", VIDEO_PIPE_PATH);
    printf("Waiting for video frames...\n");
    printf("Start VLC with: vlc %s\n", VIDEO_PIPE_PATH);
    printf("=== DEBUG: Server ready, waiting for connections... ===\n");
    fflush(stdout);
    
    // Accept connections
    while (!should_exit) {
        fd_set read_fds;
        struct timeval timeout;
        
        FD_ZERO(&read_fds);
        FD_SET(server_socket, &read_fds);
        
        timeout.tv_sec = 1;
        timeout.tv_usec = 0;
        
        int ready = select(server_socket + 1, &read_fds, NULL, NULL, &timeout);
        
        if (ready < 0) {
            if (errno == EINTR) {
                continue; // Interrupted by signal
            }
            perror("select error");
            break;
        }
        
        if (ready == 0) {
            continue; // Timeout
        }
        
        if (FD_ISSET(server_socket, &read_fds)) {
            printf("=== DEBUG: Incoming connection detected ===\n");
            fflush(stdout);
            
            int client_socket = accept(server_socket, NULL, NULL);
            if (client_socket < 0) {
                perror("Failed to accept connection");
                continue;
            }
            
            printf("=== DEBUG: Connection accepted, handling client ===\n");
            fflush(stdout);
            
            // Handle client in the same thread (single client support)
            handle_video_client(client_socket);
        }
    }
    
    cleanup();
    printf("Video Receiver stopped\n");
    return 0;
}
