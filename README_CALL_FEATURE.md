# MANET Communication System - Call Feature Implementation

## Overview
This document describes the implementation of a call feature for the existing MANET communication system, which extends the basic messaging functionality to support voice calls between multiple SDRs.

## System Architecture

### Components
1. **Message Server** (`msg_server.c`) - Handles text messages and call commands
2. **Call Server** (`call_server.c`) - Handles audio streaming for voice calls
3. **Node.js Backend** (`server.js`) - Web server with REST API
4. **Message Client** (`msg_client.js`) - Communicates with message server
5. **Call Client** (`call_client.js`) - Streams audio to call server
6. **Web Frontend** (`index.html`) - User interface with messaging and call features

### Communication Flow

#### Text Messages
```
Frontend → Node.js Backend → Message Server (via /tmp/msg_socket)
```

#### Call Feature
```
Frontend → Node.js Backend → Message Server (JSON command via /tmp/msg_socket)
                         → Call Server (audio stream via /tmp/call_socket)
```

## Implementation Details

### 1. Message Server (`msg_server.c`)
- **Socket**: `/tmp/msg_socket` (Unix Domain Socket)
- **Functionality**: 
  - Receives text messages and call commands
  - Parses JSON commands: `{"command": "start_call", "destination_id": X}`
  - Prints call initiation messages
  - Sends acknowledgments back to clients

### 2. Call Server (`call_server.c`)
- **Socket**: `/tmp/call_socket` (Unix Domain Socket)
- **Functionality**:
  - Receives audio streams from clients
  - Parses framed audio data: `[2-byte big endian length][payload]`
  - Extracts SDR ID from first byte of payload
  - Logs received audio frames

### 3. Node.js Backend
- **Port**: 3000
- **API Endpoints**:
  - `POST /api/send` - Send text messages
  - `POST /api/call` - Start a call
  - `POST /api/call/stop` - Stop a call
- **Clients**:
  - `MessageClient` - Sends messages and call commands
  - `CallClient` - Streams audio frames every 100ms

### 4. Web Frontend
- **Features**:
  - Text messaging interface
  - Numeric keypad for entering destination SDR ID
  - Call and stop call buttons
  - Real-time status updates
- **UI Layout**:
  ```
  [1 2 3]
  [4 5 6]
  [7 8 9]
    [0]
  ```

## Usage Instructions

### Starting the System
1. **Compile C Applications**:
   ```bash
   cd c_application
   make clean && make
   ```

2. **Start Servers** (in separate terminals):
   ```bash
   # Terminal 1: Message Server
   cd c_application
   ./msg_server
   
   # Terminal 2: Call Server
   cd c_application
   ./call_server
   
   # Terminal 3: Node.js Backend
   cd backend
   npm start
   ```

3. **Access Web Interface**:
   Open browser to `http://localhost:3000`

### Testing the System

#### Command Line Tests
```bash
# Test message server
echo 'Hello World' | nc -U /tmp/msg_socket

# Test call command
echo '{"command": "start_call", "destination_id": 2}' | nc -U /tmp/msg_socket

# Test Node.js clients
node backend/msg_client.js
node backend/call_client.js
```

#### Web Interface Tests
1. **Send Message**: Enter text and click "Send"
2. **Make Call**: 
   - Use keypad to enter destination SDR ID
   - Click "Call" button
   - Click "Stop Call" to end

## File Structure
```
MANET-single-node/
├── c_application/
│   ├── msg_server.c       # Message server (handles text & call commands)
│   ├── call_server.c      # Call server (handles audio streaming)
│   ├── sdr.c              # Original SDR application (kept for reference)
│   └── Makefile           # Build configuration
├── backend/
│   ├── server.js          # Express.js web server
│   ├── msg_client.js      # Message client library
│   ├── call_client.js     # Call client library
│   └── package.json       # Node.js dependencies
├── frontend/
│   └── index.html         # Web user interface
└── demo.sh                # Demo script with instructions
```

## Technical Details

### Audio Frame Format
- **Frame Structure**: `[2-byte big endian length][payload]`
- **Payload**: First byte is SDR ID, remaining bytes are audio data
- **Frequency**: 100ms intervals (10 frames per second)
- **Size**: 64 bytes payload (demo size)

### JSON Command Format
```json
{
  "command": "start_call",
  "destination_id": 2
}
```

### Socket Paths
- Message Server: `/tmp/msg_socket`
- Call Server: `/tmp/call_socket`

## Features Maintained
- ✅ Original messaging functionality fully preserved
- ✅ Unix Domain Socket communication
- ✅ Signal handling for graceful shutdown
- ✅ Error handling and logging
- ✅ Web interface for user interaction

## Features Added
- ✅ JSON command parsing
- ✅ Call initiation commands
- ✅ Audio streaming with framing
- ✅ Multi-SDR support
- ✅ Numeric keypad UI
- ✅ Call status management
- ✅ Real-time audio frame logging

## Demo Output Examples

### Message Server Console
```
Message Server listening on /tmp/msg_socket
Waiting for messages...

Client connected
Message received: Hello World
Acknowledgment sent

Client connected
Message received: {"command": "start_call", "destination_id": 2}
Starting call to SDR with ID: 2
Acknowledgment sent
```

### Call Server Console
```
Call Server listening on /tmp/call_socket
Waiting for audio streams...

Call client connected
Received audio frame of length 64 for SDR ID 2
Received audio frame of length 64 for SDR ID 2
...
```

This implementation successfully extends the original messaging system with call functionality while maintaining all existing features and providing a clean, user-friendly interface.
