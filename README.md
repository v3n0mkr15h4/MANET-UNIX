# Message App

A simple message application that sends messages from a web frontend through a Node.js backend to a C application (SDR) using Unix Domain Sockets.

## Project Structure

```
MANET-single node/
├── frontend/
│   └── index.html          # Web interface with text box and Send button
├── backend/
│   ├── package.json        # Node.js dependencies
│   └── server.js           # Express server handling socket communication
└── c_application/
    ├── sdr.c               # C application (SDR) receiving messages
    └── Makefile            # Build configuration for C application
```

## Setup and Running

### 1. Start the C Application (SDR)
```bash
cd c_application
make
./sdr
```

### 2. Start the Backend Server
```bash
cd backend
npm install
npm start
```

### 3. Open the Web App
Open your browser and go to: `http://localhost:3000`

## How It Works

1. Enter a message in the text box on the web page
2. Click "Send" button
3. Message is sent from frontend to backend via HTTP POST
4. Backend forwards the message to C application via Unix Domain Socket
5. C application receives the message and sends acknowledgment back
6. Web interface shows success/error status

## Communication Flow

Web App → Backend (HTTP) → C Application (Unix Domain Socket)

The Unix Domain Socket is created at `/tmp/message_socket`.
