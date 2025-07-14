# Video Streaming Setup Guide

## Overview
This implementation allows live video streaming from the web browser to VLC via Unix Domain Sockets.

## Quick Start

### 1. Start All Servers
```bash
cd backend
npm start
```
This will open 4 separate terminals:
- `msg_server` 
- `call_server`
- `file_server`
- `video_server` (new)

### 2. Check VLC Installation
```bash
./setup_vlc_streaming.sh
```
This will verify VLC is installed and show setup instructions.

### 3. Start Video Streaming
1. Open http://localhost:3000 in your browser
2. Click on the **Video** tab
3. Click **"Start Streaming"** button
4. Allow camera access when prompted
5. VLC will automatically open and display the video stream

### 4. Stop Streaming
- Click **"Stop Streaming"** button in the web interface
- VLC will continue playing the recorded stream until manually closed

## Architecture

```
Browser Camera → WebRTC MediaRecorder → HTTP POST → Node.js Backend
                                                          ↓
                                                    VideoClient.js
                                                          ↓
                                              Unix Domain Socket (/tmp/video_socket)
                                                          ↓
                                                    video_server.c
                                                          ↓
                                                WebM File (/tmp/video_stream.webm)
                                                          ↓
                                                     VLC Player
```

## How It Works

1. **Browser captures video** using WebRTC MediaRecorder API
2. **WebM chunks are sent** to Node.js backend via HTTP POST  
3. **Backend forwards frames** to C video_server via Unix Domain Socket
4. **video_server saves frames** to `/tmp/video_stream.webm` file
5. **VLC automatically launches** and plays the WebM file in real-time
6. **Continuous updates** to the WebM file provide live streaming effect

## Protocol Details

### Frame Format (Unix Domain Socket)
```
[4 bytes: uint32 big-endian frame length][frame data]
```

### WebRTC Settings
- Resolution: 640x480 (ideal)
- Frame Rate: 15 fps (ideal)
- Codec: VP8 (WebM)
- Chunk Size: 100ms (10 fps effective)

## Troubleshooting

### VLC Doesn't Open
1. Check that VLC is installed: `vlc --version`
2. Install if needed: `sudo apt install vlc`
3. Make sure video_server is running and shows "Video client connected"
4. VLC should auto-launch when streaming starts

### No Video in VLC  
1. Check video_server terminal for "Written to /tmp/video_stream.webm" messages
2. Verify WebM file exists: `ls -la /tmp/video_stream.webm`
3. Check browser console for frame sending errors
4. Try restarting the video stream

### Camera Access Denied
1. Ensure HTTPS is used (or localhost)
2. Check browser camera permissions
3. Try refreshing the page and allowing camera access

### VLC Shows Error
1. Close VLC and restart video streaming
2. Check `/tmp/video_stream.webm` file permissions
3. Try playing the file manually: `vlc /tmp/video_stream.webm`

### Connection Errors
1. Make sure all C servers are running
2. Check that sockets exist: `ls -la /tmp/*_socket`
3. Restart all servers if needed:
   ```bash
   cd backend
   npm run stop-servers
   npm start
   ```

## Manual Commands

### Check Video Stream File
```bash
ls -la /tmp/video_stream.webm
```

### Play Video Stream Manually  
```bash
vlc /tmp/video_stream.webm
```

### Monitor Video Server Output
```bash
# Watch the video_server terminal for real-time frame processing
tail -f /tmp/video_server.log  # if logging to file
```

### Check Running Processes
```bash
ps aux | grep -E "(msg_server|call_server|file_server|video_server)"
```

### Check Socket Files
```bash
ls -la /tmp/*_socket /tmp/video_pipe
```

## Files Modified/Added

### New Files
- `c_application/video_server.c` - C server for video processing
- `backend/video_client.js` - Node.js client for Unix socket communication
- `setup_vlc_streaming.sh` - VLC setup script

### Modified Files
- `frontend/manet-dashboard.html` - Added Video tab UI and JavaScript
- `backend/server.js` - Added video streaming API endpoints
- `c_application/Makefile` - Added video_server target
- `backend/start_c_servers.sh` - Added video_server startup
- `backend/stop_c_servers.sh` - Added video_server cleanup

## API Endpoints

- `POST /api/video/start` - Start video streaming session
- `POST /api/video/stop` - Stop video streaming session  
- `POST /api/video/frame` - Send video frame data
- `GET /api/video/status` - Get streaming status
