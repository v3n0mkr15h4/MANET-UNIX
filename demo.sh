#!/bin/bash

# MANET Communication System Demo Script
# This script demonstrates the complete flow of the system

echo "======================================"
echo "MANET Communication System Demo"
echo "======================================"
echo

echo "This demo will show you how to:"
echo "1. Start the message server (handles text messages and call commands)"
echo "2. Start the call server (handles audio streaming)"
echo "3. Start the Node.js backend"
echo "4. Use the web interface to send messages and make calls"
echo

echo "Prerequisites:"
echo "- Make sure you have Node.js installed"
echo "- The C applications should be compiled (run 'make' in c_application/)"
echo

echo "======================================="
echo "Step 1: Start the servers"
echo "======================================="
echo

echo "In separate terminal windows, run:"
echo "1. Message Server: cd c_application && ./msg_server"
echo "2. Call Server: cd c_application && ./call_server"
echo "3. Node.js Backend: cd backend && npm start"
echo

echo "======================================="
echo "Step 2: Test the system"
echo "======================================="
echo

echo "4. Open your web browser and go to: http://localhost:3000"
echo "5. Try sending a text message"
echo "6. Use the numeric keypad to enter a destination SDR ID (e.g., 2)"
echo "7. Click 'Call' to start a call"
echo "8. Click 'Stop Call' to end the call"
echo

echo "======================================="
echo "What happens behind the scenes:"
echo "======================================="
echo

echo "Text Messages:"
echo "- Frontend sends message to Node.js backend"
echo "- Backend forwards message to message server via /tmp/msg_socket"
echo "- Message server receives and acknowledges the message"
echo

echo "Call Feature:"
echo "- Frontend sends destination SDR ID to Node.js backend"
echo "- Backend sends JSON command to message server: {\"command\": \"start_call\", \"destination_id\": X}"
echo "- Message server prints: 'Starting call to SDR with ID: X'"
echo "- Backend also connects to call server via /tmp/call_socket"
echo "- Backend streams dummy audio frames every 100ms with format: [2-byte length][payload]"
echo "- Call server prints: 'Received audio frame of length Y for SDR ID X'"
echo

echo "======================================="
echo "Quick Test Commands:"
echo "======================================="
echo

echo "You can also test the system from command line:"
echo

echo "Test message server:"
echo "  echo 'Hello World' | nc -U /tmp/msg_socket"
echo

echo "Test call command:"
echo "  echo '{\"command\": \"start_call\", \"destination_id\": 2}' | nc -U /tmp/msg_socket"
echo

echo "Test Node.js clients directly:"
echo "  node backend/msg_client.js"
echo "  node backend/call_client.js"
echo

echo "======================================"
echo "Ready to start? Follow the steps above!"
echo "======================================"
