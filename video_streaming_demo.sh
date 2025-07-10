#!/bin/bash

# MANET Video Streaming Demo Script
echo "==========================================="
echo "MANET Video Streaming System Demo"
echo "==========================================="
echo ""

# Check if VLC is installed
if ! command -v vlc &> /dev/null; then
    echo "⚠️  VLC is not installed. Installing VLC..."
    sudo apt update && sudo apt install -y vlc
fi

# Create FIFO pipe if it doesn't exist
if [ ! -p /tmp/video_pipe ]; then
    echo "Creating video FIFO pipe..."
    mkfifo /tmp/video_pipe
    echo "✅ Video FIFO pipe created: /tmp/video_pipe"
else
    echo "✅ Video FIFO pipe already exists: /tmp/video_pipe"
fi

# Create temp directories
mkdir -p /tmp/video_frames
mkdir -p /tmp/uploads

echo ""
echo "Starting MANET servers..."

# Check and start message server
if ! pgrep -f "msg_server" > /dev/null; then
    echo "Starting Message Server..."
    cd c_application
    ./msg_server &
    MSG_PID=$!
    echo "✅ Message Server started (PID: $MSG_PID)"
    cd ..
else
    echo "✅ Message Server already running"
fi

# Check and start call server
if ! pgrep -f "call_server" > /dev/null; then
    echo "Starting Call Server..."
    cd c_application
    ./call_server &
    CALL_PID=$!
    echo "✅ Call Server started (PID: $CALL_PID)"
    cd ..
else
    echo "✅ Call Server already running"
fi

# Check and start file server
if ! pgrep -f "file_server" > /dev/null; then
    echo "Starting File Server..."
    cd c_application
    ./file_server &
    FILE_PID=$!
    echo "✅ File Server started (PID: $FILE_PID)"
    cd ..
else
    echo "✅ File Server already running"
fi

# Check and start video receiver
if ! pgrep -f "video_receiver" > /dev/null; then
    echo "Starting Video Receiver..."
    cd c_application
    ./video_receiver &
    VIDEO_PID=$!
    echo "✅ Video Receiver started (PID: $VIDEO_PID)"
    cd ..
else
    echo "✅ Video Receiver already running"
fi

# Start Node.js backend
echo "Starting Node.js Backend Server..."
cd backend
node server.js &
NODE_PID=$!
echo "✅ Node.js Backend started (PID: $NODE_PID)"
cd ..

echo ""
echo "==========================================="
echo "MANET System Ready with Video Streaming!"
echo "==========================================="
echo ""
echo "🌐 Web Interface: http://localhost:3000"
echo "📹 Video Tab: Click 'Video Communication' tab"
echo ""
echo "Video Streaming Instructions:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Click on the 'Video Communication' tab"
echo "3. Click 'Start Streaming' to begin video capture"
echo "4. VLC will automatically open to display the stream"
echo "5. Click 'Stop Streaming' to end the session"
echo ""
echo "System Components:"
echo "✅ Message Server (Unix Domain Socket: /tmp/msg_socket)"
echo "✅ Call Server (Unix Domain Socket: /tmp/call_socket)"  
echo "✅ File Server (Unix Domain Socket: /tmp/file_socket)"
echo "✅ Video Receiver (Unix Domain Socket: /tmp/video_socket)"
echo "✅ Video FIFO Pipe (/tmp/video_pipe)"
echo "✅ Node.js Backend (HTTP: localhost:3000)"
echo ""
echo "VLC Command (auto-started): vlc /tmp/video_pipe --intf dummy"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap 'echo ""; echo "Stopping all servers..."; kill $MSG_PID $CALL_PID $FILE_PID $NODE_PID 2>/dev/null; echo "✅ All servers stopped"; exit 0' INT

wait
