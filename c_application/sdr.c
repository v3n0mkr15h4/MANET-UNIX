#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <signal.h>

#define SOCKET_PATH "/tmp/message_socket"
#define BUFFER_SIZE 1024

int server_fd = -1;

// Signal handler for clean shutdown
void signal_handler(int sig) {
    printf("\nShutting down SDR application...\n");
    if (server_fd != -1) {
        close(server_fd);
    }
    unlink(SOCKET_PATH);
    exit(0);
}

int main() {
    struct sockaddr_un addr;
    int client_fd;
    char buffer[BUFFER_SIZE];
    ssize_t bytes_received;
    
    // Set up signal handler
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    printf("Starting SDR Application...\n");
    
    // Create socket
    server_fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (server_fd == -1) {
        perror("socket");
        exit(EXIT_FAILURE);
    }
    
    // Remove any existing socket file
    unlink(SOCKET_PATH);
    
    // Set up address structure
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, SOCKET_PATH, sizeof(addr.sun_path) - 1);
    
    // Bind socket
    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) == -1) {
        perror("bind");
        close(server_fd);
        exit(EXIT_FAILURE);
    }
    
    // Listen for connections
    if (listen(server_fd, 5) == -1) {
        perror("listen");
        close(server_fd);
        unlink(SOCKET_PATH);
        exit(EXIT_FAILURE);
    }
    
    printf("SDR Application listening on %s\n", SOCKET_PATH);
    printf("Waiting for messages...\n\n");
    
    while (1) {
        // Accept connection
        client_fd = accept(server_fd, NULL, NULL);
        if (client_fd == -1) {
            perror("accept");
            continue;
        }
        
        printf("Client connected\n");
        
        // Receive message
        bytes_received = recv(client_fd, buffer, BUFFER_SIZE - 1, 0);
        if (bytes_received > 0) {
            buffer[bytes_received] = '\0';
            printf("Message received: %s\n", buffer);
            
            // Send acknowledgment back
            const char* ack = "Message received by SDR";
            send(client_fd, ack, strlen(ack), 0);
            
            printf("Acknowledgment sent\n\n");
        } else if (bytes_received == 0) {
            printf("Client disconnected\n");
        } else {
            perror("recv");
        }
        
        close(client_fd);
    }
    
    return 0;
}
