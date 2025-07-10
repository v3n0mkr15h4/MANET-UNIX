# MANET Video Streaming Feature

This document describes the video streaming functionality added to the MANET dashboard system.

## Overview

The video streaming feature allows users to stream camera video through the web interface, which is then transmitted via Unix Domain Sockets and displayed in VLC for real-time viewing.

## Architecture

```
Browser Camera → Frontend (WebRTC) → Node.js Backend → Unix Domain Socket → Video Receiver → FIFO Pipe → VLC Player
```

## Components

### 1. Frontend (manet-dashboard.html)
- **Video Controls**: Start/Stop streaming buttons
- **Status Display**: Real-time streaming status and statistics
- **Video Preview**: Local camera preview
- **Settings**: Quality and frame rate configuration
- **Statistics**: Duration, frames sent, VLC status

### 2. Node.js Backend (server.js + video_client.js)
- **Video Client**: Manages UDS connection to video receiver
- **Frame Processing**: Receives video frames from frontend
- **Process Management**: Auto-starts VLC and video receiver
- **REST API Endpoints**:
  - `POST /api/video/start`: Start video streaming
  - `POST /api/video/stop`: Stop video streaming
  - `POST /api/video/frame`: Send video frame
  - `GET /api/video/status`: Get streaming status

### 3. Video Receiver (video_receiver.c)
- **Unix Domain Socket Server**: Listens on `/tmp/video_socket`
- **Frame Protocol**: Handles `[uint32 length][frame data]` protocol
- **FIFO Pipe Writer**: Writes video data to `/tmp/video_pipe`
- **Process Management**: Handles cleanup and error recovery
- **C Implementation**: High-performance native C code for efficient video processing

### 4. VLC Media Player
- **Video Display**: Reads from FIFO pipe and displays video
- **Auto-start**: Automatically launched by backend
- **Real-time Playback**: Low-latency video display

## Video Streaming Protocol

### Frame Format
```
[4 bytes: uint32 big endian frame length][frame data: JPEG]
```

### Quality Settings
- **480p**: 640x480 resolution
- **720p**: 1280x720 resolution (default)
- **1080p**: 1920x1080 resolution

### Frame Rates
- **15 FPS**: Low bandwidth
- **30 FPS**: Standard quality (default)
- **60 FPS**: High quality

## Setup and Usage

### Prerequisites

1. **Install VLC**:
   ```bash
   sudo apt update && sudo apt install vlc
   ```

2. **Create FIFO Pipe**:
   ```bash
   mkfifo /tmp/video_pipe
   ```

### Quick Start

1. **Use the demo script**:
   ```bash
   ./video_streaming_demo.sh
   ```

2. **Or start manually**:
   ```bash
   # Terminal 1: Message Server
   cd c_application && ./msg_server

   # Terminal 2: Call Server  
   cd c_application && ./call_server

   # Terminal 3: File Server
   cd c_application && ./file_server

   # Terminal 4: Node.js Backend (handles video receiver automatically)
   cd backend && node server.js
   ```

3. **Open the web interface**:
   ```
   http://localhost:3000
   ```

### Using the Video Tab

1. **Click "Video Communication" tab**
2. **Configure settings** (optional):
   - Select video quality (480p/720p/1080p)
   - Select frame rate (15/30/60 FPS)
3. **Click "Start Streaming"**:
   - Browser will request camera permission
   - Video preview will appear
   - VLC will automatically open
   - Real-time streaming begins
4. **Monitor status**:
   - Stream duration
   - Frames sent counter
   - VLC status
5. **Click "Stop Streaming"** to end session

## API Reference

### Start Video Streaming
```http
POST /api/video/start
Content-Type: application/json

{
  "quality": "720p",
  "frameRate": 30
}
```

**Response**:
```json
{
  "success": true,
  "message": "Video streaming started",
  "quality": "720p",
  "frameRate": 30
}
```

### Stop Video Streaming
```http
POST /api/video/stop
```

**Response**:
```json
{
  "success": true,
  "message": "Video streaming stopped"
}
```

### Send Video Frame
```http
POST /api/video/frame
Content-Type: multipart/form-data

frame: <JPEG binary data>
```

### Get Streaming Status
```http
GET /api/video/status
```

**Response**:
```json
{
  "success": true,
  "status": {
    "isStreaming": true,
    "hasConnection": true,
    "vlcRunning": true,
    "receiverRunning": true
  }
}
```

## File Structure

```
MANET-UNIX/
├── backend/
│   ├── server.js              # Main server with video endpoints
│   ├── video_client.js        # Video streaming client
│   └── package.json           # Dependencies
├── c_application/
│   └── video_receiver.js      # Video frame receiver
├── frontend/
│   └── manet-dashboard.html   # Updated with video tab
├── video_streaming_demo.sh    # Demo script
└── /tmp/
    ├── video_socket           # Unix Domain Socket
    ├── video_pipe            # FIFO pipe for VLC
    └── video_frames/         # Temp frame storage
```

## Configuration

### Video Quality Settings
```javascript
// In frontend settings
const videoConstraints = {
  '480p': { width: 640, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 }
};
```

### Frame Rate Limits
- **Maximum**: 60 FPS
- **Minimum**: 1 FPS
- **Default**: 30 FPS

### File Size Limits
- **Per Frame**: 10MB maximum
- **Total Bandwidth**: Managed by frame rate

## Troubleshooting

### Common Issues

1. **"Camera access denied"**
   - Grant camera permissions in browser
   - Check browser security settings
   - Use HTTPS for production

2. **"VLC not starting"**
   - Install VLC: `sudo apt install vlc`
   - Check VLC is in PATH
   - Verify FIFO pipe exists

3. **"Video receiver connection failed"**
   - Check if `/tmp/video_socket` exists
   - Verify Node.js server is running
   - Check process permissions

4. **"No video in VLC"**
   - Verify FIFO pipe: `ls -la /tmp/video_pipe`
   - Check VLC is reading from pipe
   - Restart video receiver

### Debug Commands

```bash
# Check processes
ps aux | grep -E "(vlc|video_receiver|node)"

# Check sockets
ls -la /tmp/*socket /tmp/video_pipe

# Monitor video frames
tail -f /var/log/syslog | grep video

# Test FIFO pipe
echo "test" > /tmp/video_pipe &
vlc /tmp/video_pipe
```

### Performance Tuning

1. **Reduce frame rate** for lower bandwidth
2. **Lower quality** for slower connections  
3. **Adjust JPEG quality** in frame capture
4. **Buffer size tuning** in video receiver

## Security Considerations

1. **Camera Permissions**: Browser requests user consent
2. **Local Access**: Streaming limited to localhost
3. **Process Isolation**: Video receiver runs as separate process
4. **Temporary Files**: Auto-cleanup of frame data
5. **Resource Limits**: Frame size and rate limiting

## Future Enhancements

1. **Audio Streaming**: Add microphone capture
2. **Recording**: Save streams to disk
3. **Multi-client**: Support multiple viewers
4. **Network Streaming**: RTMP/WebRTC support
5. **Compression**: H.264/H.265 encoding
6. **Mobile Support**: Responsive video controls

## Integration with Existing Features

The video streaming feature integrates seamlessly with:
- **Messaging**: Send video notifications
- **File Transfer**: Record and share video files
- **Call System**: Video calls with audio
- **M&C Interface**: Monitor video statistics

All existing functionality (messaging, calls, file transfer) remains unchanged and fully functional.
