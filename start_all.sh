#!/bin/bash

# MANET C Servers Startup Script
# This script starts all MANET C server applications in separate terminal windows
# Usage: ./start_all.sh

echo "Starting MANET C Server Applications..."
echo "======================================"

# Define the C application directory
C_APP_DIR="/home/workstation/MANET UI/MANET-UNIX/c_application"

# Array of server executables to start
# Format: "executable_name:display_name"
SERVERS=(
    "msg_server:Message Server"
    "call_server:Call Server" 
    "file_server:File Transfer Server"
    "video_receiver:Video Receiver Server"
)

# Function to start a server in a new terminal window
start_c_server() {
    local executable="$1"
    local display_name="$2"
    
    echo "Starting $display_name..."
    
    # Open new gnome-terminal window with the server
    gnome-terminal --window \
        --title="MANET - $display_name" \
        --geometry=80x24 \
        -- bash -c "
            # Change to C application directory
            cd '$C_APP_DIR' || exit 1;
            
            echo '==========================================';
            echo 'MANET $display_name';
            echo '==========================================';
            echo 'Executable: ./$executable';
            echo 'Directory: \$(pwd)';
            echo 'Starting server...';
            echo '';
            
            # Run the C server executable
            ./$executable;
            
            # Capture exit code
            exit_code=\$?;
            echo '';
            echo '==========================================';
            if [ \$exit_code -eq 0 ]; then
                echo 'Server exited normally (exit code: \$exit_code)';
            else
                echo 'Server exited with error (exit code: \$exit_code)';
            fi
            echo 'Terminal will remain open for review.';
            echo 'Press Ctrl+C or close window to exit.';
            echo '==========================================';
            
            # Keep terminal open - exec bash to replace current shell
            exec bash;
        "
    
    # Small delay between terminal spawns to prevent issues
    sleep 0.8
}

# Check if C application directory exists
if [ ! -d "$C_APP_DIR" ]; then
    echo "Error: C application directory not found: $C_APP_DIR"
    exit 1
fi

# Change to C application directory to check executables
cd "$C_APP_DIR" || exit 1

echo "Checking executables in: $(pwd)"

# Start each server in its own terminal window
for server_info in "${SERVERS[@]}"; do
    # Split the server info
    executable="${server_info%%:*}"
    display_name="${server_info##*:}"
    
    # Check if executable exists and is executable
    if [ ! -f "$executable" ]; then
        echo "Warning: $executable not found, skipping..."
        continue
    fi
    
    if [ ! -x "$executable" ]; then
        echo "Warning: $executable is not executable, skipping..."
        continue
    fi
    
    start_c_server "$executable" "$display_name"
done

echo ""
echo "All C servers started!"
echo "Check the terminal windows for each server's status."
echo ""
echo "Server Information:"
echo "  - Message Server: Listens on /tmp/msg_socket"
echo "  - Call Server: Listens on /tmp/call_socket"
echo "  - File Server: Listens on /tmp/file_socket"
echo "  - Video Receiver: Listens on /tmp/video_socket"
echo ""
echo "To stop all servers:"
echo "  - Close each terminal window, or"
echo "  - Run: pkill -f 'msg_server|call_server|file_server|video_receiver'"
echo ""
echo "To rebuild servers if needed:"
echo "  - cd c_application && make clean && make"
