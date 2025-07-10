#!/bin/bash

# MANET C Servers Stop Script  
# This script stops all running MANET C server applications
# Usage: ./stop_all.sh

echo "Stopping MANET C Server Applications..."
echo "======================================"

# Array of server process names to stop
SERVERS=(
    "msg_server"
    "call_server" 
    "file_server"
    "video_receiver"
)

# Function to stop a specific server
stop_server() {
    local server_name="$1"
    
    echo "Stopping $server_name..."
    
    # Find and kill the process
    pids=$(pgrep -f "$server_name")
    
    if [ -z "$pids" ]; then
        echo "  - $server_name: Not running"
    else
        for pid in $pids; do
            echo "  - Stopping $server_name (PID: $pid)"
            kill "$pid"
            
            # Wait a moment and check if it stopped
            sleep 1
            if kill -0 "$pid" 2>/dev/null; then
                echo "  - Force stopping $server_name (PID: $pid)"
                kill -9 "$pid"
            fi
        done
        echo "  - $server_name: Stopped"
    fi
}

# Stop each server
for server in "${SERVERS[@]}"; do
    stop_server "$server"
done

echo ""
echo "All C servers stopped!"
echo ""

# Clean up socket files
echo "Cleaning up socket files..."
socket_files=(
    "/tmp/msg_socket"
    "/tmp/call_socket"
    "/tmp/file_socket"
    "/tmp/video_socket"
    "/tmp/video_pipe"
)

for socket in "${socket_files[@]}"; do
    if [ -e "$socket" ]; then
        rm -f "$socket"
        echo "  - Removed: $socket"
    fi
done

echo "Cleanup complete!"
