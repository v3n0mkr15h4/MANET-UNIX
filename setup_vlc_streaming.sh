#!/bin/bash

# MANET Video Streaming Setup Script
# This script sets up the video streaming pipeline with VLC

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

main() {
    print_status "MANET Video Streaming Setup"
    print_status "=============================="
    
    # Check if VLC is installed
    if ! command -v vlc >/dev/null 2>&1; then
        print_error "VLC is not installed!"
        print_status "To install VLC:"
        print_status "  Ubuntu/Debian: sudo apt install vlc"
        print_status "  Fedora: sudo dnf install vlc"
        print_status "  Arch: sudo pacman -S vlc"
        exit 1
    fi
    
    print_success "VLC found: $(vlc --version | head -1)"
    
    print_warning "IMPORTANT SETUP INSTRUCTIONS:"
    print_status "1. First, start all MANET servers:"
    print_status "   cd backend && npm start"
    print_status ""
    print_status "2. Then open http://localhost:3000 in your browser"
    print_status ""
    print_status "3. Go to the Video tab and click 'Start Streaming'"
    print_status ""
    print_status "4. VLC will automatically open when video streaming begins"
    print_status ""
    print_status "The video_server will automatically:"
    print_status "- Receive video frames from the browser"
    print_status "- Save them to /tmp/video_stream.webm"
    print_status "- Launch VLC to play the stream"
    print_status ""
    print_success "Setup complete! You can now start video streaming from the web interface."
}

# Handle Ctrl+C
trap 'print_status "Setup information displayed"; exit 0' INT

# Run main function
main "$@"
