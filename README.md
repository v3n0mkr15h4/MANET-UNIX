# MANET Application

A comprehensive MANET (Mobile Ad-hoc Network) application that provides messaging, calling, and file transfer capabilities through a web interface. The application consists of multiple C servers communicating with a Node.js backend via Unix Domain Sockets.

## Project Structure

```
MANET-UNIX/
├── frontend/
│   ├── manet-dashboard.html    # Modern web dashboard interface
│   └── index-old-backup.html   # Legacy interface (backup)
├── backend/
│   ├── package.json            # Node.js dependencies
│   ├── server.js               # Express server with API endpoints
│   ├── msg_client.js           # Message client for Unix socket communication
│   ├── call_client.js          # Call client for audio streaming
│   └── file_client.js          # File client for file transfers
├── c_application/
│   ├── msg_server.c            # Message server (C application)
│   ├── call_server.c           # Call server (C application)
│   ├── file_server.c           # File server (C application)
│   └── Makefile               # Build configuration for C applications
├── icons/                      # SVG icons for the web interface
├── uploads/                    # Directory for uploaded files
├── start_servers.sh            # Script to start all servers
├── stop_servers.sh             # Script to stop all servers
└── server_status.sh            # Script to check server status
```

## Quick Start

### Start All Servers (Recommended)
```bash
cd backend
npm start
```

This single command will:
- Build all C server applications
- Start the message server (`msg_server`) in a new terminal
- Start the call server (`call_server`) in a new terminal
- Start the file server (`file_server`) in a new terminal
- Start the Node.js backend server in the current terminal

### Alternative Options
```bash
# Start only the C servers in separate terminals
cd backend
npm run start-servers-only

# Start only the Node.js backend
cd backend
npm run start-backend-only

# Stop only the C servers
cd backend
npm run stop-servers

# Build C servers without starting them
cd backend
npm run build-c-servers
```

### Legacy Scripts
```bash
# Start all servers using the shell script
./start_servers.sh

# Stop all servers
./stop_servers.sh

# Check server status
./server_status.sh
```

### Access the Application
Open your browser and go to: `http://localhost:3000`

## Manual Setup (Alternative)

If you prefer to start servers manually:

### 1. Build C Applications
```bash
cd c_application
make clean && make all
```

### 2. Start C Servers (in separate terminals)
```bash
# Terminal 1 - Message Server
cd c_application
./msg_server

# Terminal 2 - Call Server
cd c_application
./call_server

# Terminal 3 - File Server
cd c_application
./file_server
```

### 3. Start Node.js Backend
```bash
cd backend
npm install
node server.js
```

## Features

- **Messaging**: Send and receive text messages through the MANET network
- **Voice Calls**: Initiate and manage voice calls between network nodes
- **File Transfer**: Upload and transfer files through the network
- **Web Dashboard**: Modern, responsive web interface for all operations
- **Multi-Server Architecture**: Separate C servers for different functionalities
- **Auto-Management**: Single command to start/stop all servers

## How It Works

1. **Web Interface**: Users interact with the modern dashboard at `http://localhost:3000`
2. **API Layer**: Node.js backend provides REST APIs for all operations
3. **Socket Communication**: Backend communicates with C servers via Unix Domain Sockets
4. **C Servers**: Handle low-level MANET operations
   - Message Server: `/tmp/msg_socket`
   - Call Server: `/tmp/call_socket`
   - File Server: `/tmp/file_socket`

## Communication Flow

Web Dashboard → Node.js Backend (HTTP) → C Servers (Unix Domain Sockets) → MANET Network

## API Endpoints

- `POST /api/send` - Send a message
- `POST /api/call` - Start a voice call
- `POST /api/call/stop` - Stop active call
- `GET /api/call/status` - Get call status
- `POST /api/upload` - Upload and transfer files
- `GET /api/files` - List uploaded files
- `DELETE /api/files/clear` - Clear all uploaded files

## Troubleshooting

### Server Management
- **Check Status**: `./server_status.sh`
- **Stop All**: `./stop_servers.sh`
- **Restart**: `./stop_servers.sh && ./start_servers.sh`

### Common Issues
- **Permission Denied**: Ensure scripts are executable: `chmod +x *.sh`
- **Socket Errors**: Stop all servers and restart: `./stop_servers.sh && ./start_servers.sh`
- **Port 3000 in Use**: Stop other applications using port 3000
- **Build Errors**: Check C compiler installation and dependencies

## Development

### Adding New Features
1. Update relevant C server in `c_application/`
2. Add client logic in `backend/` 
3. Update web interface in `frontend/`
4. Test with `./start_servers.sh`

### File Structure
- C servers handle protocol-level operations
- Node.js backend provides web API and socket management
- Frontend provides user interface and interaction

## License

This project is part of the MANET research and development initiative.
