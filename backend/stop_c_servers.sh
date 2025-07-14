#!/bin/bash

# Stop C servers only
# This script stops msg_server, call_server, and file_server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to stop processes by name
stop_processes_by_name() {
    local process_name=$1
    local pids=$(pgrep -f "$process_name" 2>/dev/null)
    
    if [[ -n "$pids" ]]; then
        print_status "Stopping $process_name processes: $pids"
        for pid in $pids; do
            if kill -TERM "$pid" 2>/dev/null; then
                sleep 1
                if ! kill -0 "$pid" 2>/dev/null; then
                    print_success "$process_name (PID: $pid) stopped"
                else
                    print_warning "Force stopping $process_name (PID: $pid)"
                    kill -KILL "$pid" 2>/dev/null
                fi
            fi
        done
    else
        print_status "No $process_name processes found"
    fi
}

# Function to cleanup socket files
cleanup_sockets() {
    print_status "Cleaning up socket files..."
    rm -f /tmp/msg_socket /tmp/call_socket /tmp/file_socket /tmp/video_socket
    print_success "Socket files cleaned up"
}

# Main execution
main() {
    print_status "Stopping MANET C servers..."
    
    # Stop each server type
    stop_processes_by_name "msg_server"
    stop_processes_by_name "call_server"
    stop_processes_by_name "file_server"
    stop_processes_by_name "video_server"
    
    # Cleanup sockets
    cleanup_sockets
    
    print_success "All C servers stopped"
}

# Run main function
main "$@"
