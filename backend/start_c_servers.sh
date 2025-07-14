#!/bin/bash

# MANET Application Startup Script for npm start
# This script is called by npm start to open each C server in a separate terminal

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to detect available terminal emulator
detect_terminal() {
    if command -v gnome-terminal >/dev/null 2>&1; then
        echo "gnome-terminal"
    elif command -v xterm >/dev/null 2>&1; then
        echo "xterm"
    elif command -v konsole >/dev/null 2>&1; then
        echo "konsole"
    elif command -v xfce4-terminal >/dev/null 2>&1; then
        echo "xfce4-terminal"
    elif command -v mate-terminal >/dev/null 2>&1; then
        echo "mate-terminal"
    elif command -v tilix >/dev/null 2>&1; then
        echo "tilix"
    else
        echo "none"
    fi
}

# Function to start a C server in a new terminal
start_server_terminal() {
    local server_name=$1
    local terminal_cmd=$2
    
    print_status "Starting $server_name in new terminal..."
    
    case $terminal_cmd in
        "gnome-terminal")
            gnome-terminal --title="$server_name" -- bash -c "cd ../c_application && ./$server_name; echo 'Press Enter to close...'; read"
            ;;
        "xterm")
            xterm -T "$server_name" -e bash -c "cd ../c_application && ./$server_name; echo 'Press Enter to close...'; read" &
            ;;
        "konsole")
            konsole --title "$server_name" -e bash -c "cd ../c_application && ./$server_name; echo 'Press Enter to close...'; read" &
            ;;
        "xfce4-terminal")
            xfce4-terminal --title="$server_name" -e "bash -c 'cd ../c_application && ./$server_name; echo \"Press Enter to close...\"; read'" &
            ;;
        "mate-terminal")
            mate-terminal --title="$server_name" -e "bash -c 'cd ../c_application && ./$server_name; echo \"Press Enter to close...\"; read'" &
            ;;
        "tilix")
            tilix --title="$server_name" -e "bash -c 'cd ../c_application && ./$server_name; echo \"Press Enter to close...\"; read'" &
            ;;
        *)
            print_error "No suitable terminal emulator found. Please install gnome-terminal, xterm, or another supported terminal."
            return 1
            ;;
    esac
    
    return 0
}

# Main execution
main() {
    print_status "Starting MANET C servers in separate terminals..."
    
    # Detect terminal emulator
    TERMINAL=$(detect_terminal)
    
    if [ "$TERMINAL" = "none" ]; then
        print_error "No supported terminal emulator found!"
        print_error "Please install one of: gnome-terminal, xterm, konsole, xfce4-terminal, mate-terminal, tilix"
        exit 1
    fi
    
    print_status "Using terminal emulator: $TERMINAL"
    
    # Build C servers first
    print_status "Building C servers..."
    cd ../c_application
    if make clean && make all; then
        print_success "C servers built successfully"
    else
        print_error "Failed to build C servers"
        exit 1
    fi
    
    # Go back to backend directory
    cd ../backend
    
    # Start each server in a separate terminal
    start_server_terminal "msg_server" "$TERMINAL"
    sleep 1
    start_server_terminal "call_server" "$TERMINAL"
    sleep 1
    start_server_terminal "file_server" "$TERMINAL"
    sleep 1
    start_server_terminal "video_server" "$TERMINAL"
    sleep 1
    
    print_success "All C servers started in separate terminals"
    print_status "Starting Node.js backend server..."
}

# Run if called directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
