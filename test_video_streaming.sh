#!/bin/bash

# Quick test script to check video streaming process management

echo "=== MANET Video Streaming Process Check ==="
echo

echo "1. Checking for running VLC processes with video_stream.webm:"
ps aux | grep -E "vlc.*video_stream.webm" | grep -v grep || echo "   No VLC processes found"
echo

echo "2. Checking video_stream.webm file:"
if [[ -f "/tmp/video_stream.webm" ]]; then
    ls -la /tmp/video_stream.webm
    echo "   File size: $(stat -c%s /tmp/video_stream.webm) bytes"
else
    echo "   No video_stream.webm file found"
fi
echo

echo "3. Checking video_socket:"
if [[ -S "/tmp/video_socket" ]]; then
    ls -la /tmp/video_socket
    echo "   Socket exists and is active"
else
    echo "   No video_socket found"
fi
echo

echo "4. Checking video_server process:"
ps aux | grep -E "video_server" | grep -v grep || echo "   No video_server process found"
echo

echo "=== Instructions ==="
echo "- Start all servers: cd backend && npm start"
echo "- Go to http://localhost:3000, Video tab"
echo "- Click 'Start Streaming' to begin"
echo "- VLC should auto-open with live stream"
echo "- Click 'Stop Streaming' and 'Start Streaming' again"
echo "- VLC should restart with fresh stream (no old content)"
