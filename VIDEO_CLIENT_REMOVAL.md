# Video Client Dependency Removal

## Summary
Successfully removed the dependency on `video_client.js` from the Node.js backend server. The server now communicates directly with the C video receiver via Unix Domain Sockets, eliminating the need for the intermediate JavaScript video client module.

## Changes Made

### 1. Removed VideoClient Dependency
- **Removed import**: `const VideoClient = require('./video_client');`
- **Removed instance**: `const videoClient = new VideoClient();`
- **Deleted file**: `video_client.js` (no longer needed)

### 2. Added Direct Socket Communication
- **Video constants**: Added `VIDEO_SOCKET_PATH` and streaming state variables
- **Connection function**: `connectToVideoReceiver()` - Direct Unix Domain Socket connection
- **Disconnection function**: `disconnectFromVideoReceiver()` - Clean socket closure
- **Frame sending function**: `sendFrameToVideoReceiver()` - Direct frame transmission with proper protocol

### 3. Updated Video API Endpoints

#### `/api/video/start`
- **Before**: `await videoClient.startStreaming()`
- **After**: `await connectToVideoReceiver()`
- **Result**: Direct connection to C video receiver

#### `/api/video/stop`
- **Before**: `await videoClient.stopStreaming()`
- **After**: `await disconnectFromVideoReceiver()`
- **Result**: Clean socket disconnection

#### `/api/video/frame`
- **Before**: `await videoClient.sendFrame(frameData)`
- **After**: `await sendFrameToVideoReceiver(frameData)`
- **Result**: Direct frame transmission to C receiver

#### `/api/video/status`
- **Before**: `const videoStatus = videoClient.getStatus()`
- **After**: Direct status from socket and process variables
- **Result**: Accurate streaming status without intermediate layer

### 4. Protocol Implementation
- **Frame Format**: Maintains `[uint32 length][frame data]` protocol
- **Endianness**: Uses big-endian for network byte order
- **Error Handling**: Proper socket error handling and cleanup
- **Connection Management**: Automatic reconnection and state management

## Technical Benefits

### Architecture Simplification
- **Removed Layer**: Eliminated unnecessary JavaScript wrapper
- **Direct Communication**: Node.js ↔ Unix Domain Socket ↔ C Receiver
- **Fewer Dependencies**: No intermediate video client module
- **Cleaner Code**: Reduced complexity and potential failure points

### Performance Improvements
- **Lower Latency**: Direct socket communication without wrapper
- **Reduced Memory**: No intermediate video client object
- **Better Resource Management**: Direct control over socket lifecycle
- **Simpler Error Handling**: Direct error propagation from socket

### Maintenance Benefits
- **Single Protocol**: One implementation of frame protocol
- **Consistent Behavior**: Direct socket communication matches C receiver
- **Easier Debugging**: Direct connection simplifies troubleshooting
- **Reduced Complexity**: No need to maintain separate video client

## Testing Results

### Connection Test
```bash
✅ Server starts without video_client.js dependency
✅ Unix Domain Socket connection established
✅ Video receiver accepts connections
✅ VLC process launches successfully
```

### API Test
```bash
✅ POST /api/video/start - Works with direct socket connection
✅ POST /api/video/stop - Cleanly disconnects socket
✅ POST /api/video/frame - Sends frames directly to C receiver
✅ GET /api/video/status - Returns accurate streaming status
```

### Integration Test
```bash
✅ C video receiver receives connections
✅ Frame protocol handled correctly
✅ FIFO pipe integration working
✅ VLC streaming functional
```

## File Changes
- **Modified**: `backend/server.js` - Removed video_client dependency, added direct socket communication
- **Deleted**: `backend/video_client.js` - No longer needed
- **Unchanged**: All other files remain the same

## Usage
The video streaming system now works entirely without the video_client.js dependency:

```bash
# Start the system
cd backend && npm start

# The server will automatically:
# 1. Start the C video receiver when needed
# 2. Connect directly via Unix Domain Socket
# 3. Send frames using the proper protocol
# 4. Launch VLC for video display
```

The system is now fully dependent on the C video receiver (`video_receiver.c`) and completely independent of any JavaScript video client module.
