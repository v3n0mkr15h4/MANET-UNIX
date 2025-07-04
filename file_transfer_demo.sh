#!/bin/bash

# MANET File Transfer Demo Script
# This script demonstrates the file transfer functionality

echo "==========================================="
echo "MANET File Transfer System Demo"
echo "==========================================="
echo ""

# Create a test file
echo "Creating test file..."
echo "Hello World! This is a test file for MANET file transfer." > test_file.txt
echo "Lorem ipsum dolor sit amet, consectetur adipiscing elit." >> test_file.txt
echo "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." >> test_file.txt
echo "Test file created: test_file.txt"
echo ""

# Check if servers are running
echo "Checking if servers are running..."
if ! pgrep -f "msg_server" > /dev/null; then
    echo "⚠️  Message Server not running. Starting it..."
    cd c_application
    ./msg_server &
    MSG_PID=$!
    echo "Message Server started with PID: $MSG_PID"
    cd ..
fi

if ! pgrep -f "call_server" > /dev/null; then
    echo "⚠️  Call Server not running. Starting it..."
    cd c_application
    ./call_server &
    CALL_PID=$!
    echo "Call Server started with PID: $CALL_PID"
    cd ..
fi

if ! pgrep -f "file_server" > /dev/null; then
    echo "⚠️  File Server not running. Starting it..."
    cd c_application
    ./file_server &
    FILE_PID=$!
    echo "File Server started with PID: $FILE_PID"
    cd ..
fi

echo ""
echo "Starting Node.js backend server..."
cd backend
node server.js &
NODE_PID=$!
echo "Node.js server started with PID: $NODE_PID"

echo ""
echo "==========================================="
echo "File Transfer System Ready!"
echo "==========================================="
echo ""
echo "1. Open your browser and go to: http://localhost:3000"
echo "2. Click on the 'File Transfer' tab"
echo "3. Upload the test file: test_file.txt"
echo "4. Check the uploads directory for received files"
echo ""
echo "Running processes:"
echo "- Message Server: PID $MSG_PID"
echo "- Call Server: PID $CALL_PID"
echo "- File Server: PID $FILE_PID"
echo "- Node.js Backend: PID $NODE_PID"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for interrupt
trap 'echo ""; echo "Stopping servers..."; kill $MSG_PID $CALL_PID $FILE_PID $NODE_PID 2>/dev/null; exit 0' INT

wait
