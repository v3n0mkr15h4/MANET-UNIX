# MANET File Transfer Feature

This document describes the file transfer functionality added to the MANET system.

## Overview

The file transfer feature allows users to upload files through the web interface, which are then transmitted via Unix Domain Sockets to a C server that stores them in the `uploads` directory.

## Architecture

```
Frontend (HTML/JS) → Node.js Backend → Unix Domain Socket → C File Server → uploads/ directory
```

## Components

### 1. Frontend (manet-dashboard.html)
- **File Input**: Standard HTML file input for selecting files
- **Upload Button**: Triggers file upload process
- **Progress Bar**: Shows upload progress
- **File List**: Displays uploaded files with metadata

### 2. Node.js Backend (server.js + file_client.js)
- **Multer Middleware**: Handles multipart file uploads
- **File Client**: Streams file data to C server via Unix Domain Socket
- **REST API Endpoints**:
  - `POST /api/upload`: Upload and transfer files
  - `GET /api/files`: List uploaded files

### 3. C File Server (file_server.c)
- **Unix Domain Socket**: Listens on `/tmp/file_socket`
- **File Reception**: Receives file data in chunks
- **File Writing**: Saves files to `uploads/` directory
- **Progress Logging**: Logs transfer progress

## Usage

### Starting the System

1. **Build the C servers**:
   ```bash
   cd c_application
   make
   ```

2. **Install Node.js dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Start all servers**:
   ```bash
   # Terminal 1: Message Server
   cd c_application
   ./msg_server

   # Terminal 2: Call Server
   cd c_application
   ./call_server

   # Terminal 3: File Server
   cd c_application
   ./file_server

   # Terminal 4: Node.js Backend
   cd backend
   node server.js
   ```

4. **Or use the demo script**:
   ```bash
   ./file_transfer_demo.sh
   ```

### Using the Web Interface

1. Open browser to `http://localhost:3000`
2. Click on "File Transfer" tab
3. Select a file using "Choose File" button
4. Click "Upload File" to transfer
5. Monitor progress and results
6. View uploaded files in the file list

## File Transfer Protocol

### 1. File Metadata
```
filename:filesize\n
```
Example: `document.pdf:1048576\n`

### 2. File Data
- Sent in chunks (typically 1024 bytes)
- Binary data preserved exactly
- No encoding/decoding required

### 3. End Marker
```
EOF\n
```

### 4. Server Response
- `SUCCESS: File received successfully\n`
- `ERROR: <error message>\n`

## Features

- **Binary File Support**: Handles any file type (images, documents, executables, etc.)
- **Progress Tracking**: Real-time progress display
- **Error Handling**: Comprehensive error reporting
- **File Validation**: Size limits and format checking
- **Automatic Cleanup**: Removes temporary files
- **File Listing**: Shows all uploaded files with metadata

## Configuration

### File Size Limits
- Maximum file size: 100MB (configurable in server.js)
- Chunk size: 1024 bytes (configurable in file_client.js)

### Socket Paths
- Message Socket: `/tmp/msg_socket`
- Call Socket: `/tmp/call_socket`
- File Socket: `/tmp/file_socket`

### Directory Structure
```
MANET-UNIX/
├── backend/
│   ├── server.js          # Main server with file upload endpoint
│   ├── file_client.js     # File transfer client
│   ├── msg_client.js      # Message client
│   └── call_client.js     # Call client
├── c_application/
│   ├── file_server.c      # File server
│   ├── msg_server.c       # Message server
│   ├── call_server.c      # Call server
│   └── Makefile           # Build configuration
├── frontend/
│   └── manet-dashboard.html # Web interface
└── uploads/               # Uploaded files directory
```

## Security Considerations

1. **File Size Limits**: Prevent DoS attacks via large files
2. **Path Validation**: Prevent directory traversal attacks
3. **File Type Validation**: Optional file type restrictions
4. **Access Control**: Unix socket permissions
5. **Temporary File Cleanup**: Automatic cleanup of temp files

## Troubleshooting

### Common Issues

1. **"Connection refused" errors**
   - Check if file_server is running
   - Verify socket path permissions

2. **"No file selected" errors**
   - Ensure JavaScript is enabled
   - Check file input functionality

3. **Upload failures**
   - Check file size limits
   - Verify uploads directory permissions
   - Check server logs for errors

### Debugging

1. **Enable verbose logging**:
   ```bash
   # In file_server.c, add more printf statements
   # In file_client.js, check console.log output
   ```

2. **Check socket status**:
   ```bash
   ls -la /tmp/*_socket
   ```

3. **Monitor file transfers**:
   ```bash
   tail -f /var/log/syslog  # System logs
   ```

## API Reference

### Upload File
```http
POST /api/upload
Content-Type: multipart/form-data

file: <binary file data>
```

**Response**:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "size": 1024,
  "response": {
    "success": true,
    "message": "File transferred successfully",
    "size": 1024
  }
}
```

### List Files
```http
GET /api/files
```

**Response**:
```json
{
  "success": true,
  "files": [
    {
      "name": "document.pdf",
      "size": 1048576,
      "modified": "2025-07-04T12:00:00.000Z"
    }
  ]
}
```

## Testing

### Manual Testing
1. Upload various file types (text, images, documents)
2. Test large files (near size limit)
3. Test concurrent uploads
4. Test error conditions (server offline, invalid files)

### Automated Testing
```bash
# Test file upload via curl
curl -X POST -F "file=@test_file.txt" http://localhost:3000/api/upload

# Test file listing
curl http://localhost:3000/api/files
```

## Future Enhancements

1. **Resume Support**: Allow resuming interrupted transfers
2. **Compression**: Add file compression for large files
3. **Encryption**: Add file encryption for security
4. **Multiple Files**: Support multiple file uploads
5. **Download Feature**: Add file download capability
6. **File Management**: Add delete/rename operations
