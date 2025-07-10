const express = require('express');
const multer = require('multer');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const MessageClient = require('./msg_client');
const CallClient = require('./call_client');
const FileClient = require('./file_client');

const app = express();
const PORT = 3000;

// Create client instances
const msgClient = new MessageClient();
const callClient = new CallClient();
const fileClient = new FileClient();

// Video streaming constants
const VIDEO_SOCKET_PATH = '/tmp/video_socket';
let videoSocket = null;
let isVideoStreaming = false;

// Configure multer for file uploads
const upload = multer({
    dest: '/tmp/uploads/', // temporary storage
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Configure multer for video frames
const videoUpload = multer({
    dest: '/tmp/video_frames/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit per frame
    }
});

// Video streaming state
let vlcProcess = null;
let videoReceiverProcess = null;

// Video socket helper functions
function checkVLCInstallation() {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec('which vlc', (error) => {
            if (error) {
                console.error('VLC is not installed or not in PATH');
                resolve(false);
            } else {
                console.log('VLC found and ready');
                resolve(true);
            }
        });
    });
}

function connectToVideoReceiver() {
    return new Promise((resolve, reject) => {
        if (videoSocket && !videoSocket.destroyed) {
            return resolve();
        }

        videoSocket = net.createConnection(VIDEO_SOCKET_PATH, () => {
            console.log('Connected to video receiver');
            isVideoStreaming = true;
            resolve();
        });

        videoSocket.on('error', (err) => {
            console.error('Video socket error:', err.message);
            isVideoStreaming = false;
            videoSocket = null;
            reject(err);
        });

        videoSocket.on('close', () => {
            console.log('Video socket connection closed');
            isVideoStreaming = false;
            videoSocket = null;
        });
    });
}

function disconnectFromVideoReceiver() {
    return new Promise((resolve) => {
        if (videoSocket) {
            videoSocket.end();
            videoSocket = null;
        }
        isVideoStreaming = false;
        resolve();
    });
}

function sendFrameToVideoReceiver(frameBuffer) {
    return new Promise((resolve, reject) => {
        if (!isVideoStreaming || !videoSocket) {
            return reject(new Error('Not connected to video receiver'));
        }

        try {
            // Create frame with length prefix (uint32 big endian)
            const frameLength = frameBuffer.length;
            const lengthBuffer = Buffer.allocUnsafe(4);
            lengthBuffer.writeUInt32BE(frameLength, 0);

            // Send length prefix + frame data
            const fullFrame = Buffer.concat([lengthBuffer, frameBuffer]);
            
            videoSocket.write(fullFrame, (err) => {
                if (err) {
                    console.error('Error sending frame to video receiver:', err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/icons', express.static(path.join(__dirname, '../icons')));

// API endpoint to send message
app.post('/api/send', async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    try {
        console.log('Sending message to SDR:', message);
        const response = await msgClient.sendMessage(message);
        res.json({ success: true, message: 'Message sent to SDR', response: response });
    } catch (error) {
        console.error('Error sending to SDR:', error.message);
        res.status(500).json({ error: 'Failed to send message to SDR: ' + error.message });
    }
});

// API endpoint to start a call
app.post('/api/call', async (req, res) => {
    const { destinationId } = req.body;
    
    // Validate SDR ID range for 128-node network
    const sdrId = parseInt(destinationId);
    if (isNaN(sdrId) || sdrId < 0 || sdrId > 127) {
        return res.status(400).json({ 
            error: `Invalid SDR ID: ${destinationId}. Must be between 0 and 127 for this 128-node MANET.` 
        });
    }
    
    try {
        console.log('Starting call to SDR ID:', sdrId);
        
        // Check if already streaming
        const status = callClient.getStatus();
        if (status.isStreaming) {
            return res.status(409).json({ 
                error: 'Call already in progress',
                currentCall: status.currentSdrId
            });
        }
        
        // Send call command to message server
        const callResponse = await msgClient.sendCallCommand(sdrId);
        console.log('Call command response:', callResponse);
        
        // Start audio streaming
        await callClient.startCall(sdrId);
        
        res.json({ 
            success: true, 
            message: `Call started to SDR ID ${sdrId}`,
            response: callResponse 
        });
    } catch (error) {
        console.error('Error starting call:', error.message);
        res.status(500).json({ error: 'Failed to start call: ' + error.message });
    }
});

// API endpoint to stop a call
app.post('/api/call/stop', async (req, res) => {
    try {
        console.log('Stopping call...');
        
        // Check if there's actually a call to stop
        const status = callClient.getStatus();
        if (!status.isStreaming) {
            return res.json({ 
                success: true, 
                message: 'No active call to stop',
                status: status
            });
        }
        
        // Stop the call and wait for cleanup
        await callClient.stopCall();
        
        // Verify the call is stopped
        const finalStatus = callClient.getStatus();
        console.log('Call stopped, final status:', finalStatus);
        
        res.json({ 
            success: true, 
            message: 'Call stopped successfully',
            status: finalStatus
        });
    } catch (error) {
        console.error('Error stopping call:', error.message);
        res.status(500).json({ error: 'Failed to stop call: ' + error.message });
    }
});

// API endpoint to get call status
app.get('/api/call/status', (req, res) => {
    try {
        const status = callClient.getStatus();
        res.json({ 
            success: true, 
            status: status
        });
    } catch (error) {
        console.error('Error getting call status:', error.message);
        res.status(500).json({ error: 'Failed to get call status: ' + error.message });
    }
});

// API endpoint to upload and transfer files
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { originalname, path: tempPath, size } = req.file;
        console.log(`File upload received: ${originalname} (${size} bytes)`);

        // Transfer file to C server via Unix Domain Socket
        const response = await fileClient.sendFile(tempPath, originalname);
        
        // Clean up temporary file
        fs.unlink(tempPath, (err) => {
            if (err) console.error('Error deleting temp file:', err.message);
        });

        res.json({
            success: true,
            message: `File ${originalname} uploaded and transferred successfully`,
            size: size,
            response: response
        });
    } catch (error) {
        console.error('Error uploading file:', error.message);
        
        // Clean up temporary file on error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err.message);
            });
        }
        
        res.status(500).json({ error: 'Failed to upload file: ' + error.message });
    }
});

// API endpoint to get file transfer status
app.get('/api/files', (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../uploads');
        
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const files = fs.readdirSync(uploadsDir).map(filename => {
            const filepath = path.join(uploadsDir, filename);
            const stats = fs.statSync(filepath);
            return {
                name: filename,
                size: stats.size,
                modified: stats.mtime.toISOString()
            };
        });
        
        res.json({
            success: true,
            files: files
        });
    } catch (error) {
        console.error('Error listing files:', error.message);
        res.status(500).json({ error: 'Failed to list files: ' + error.message });
    }
});

// API endpoint to clear all uploaded files
app.delete('/api/files/clear', (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '../uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            return res.json({
                success: true,
                message: 'No files to clear',
                deletedCount: 0
            });
        }
        
        const files = fs.readdirSync(uploadsDir);
        let deletedCount = 0;
        
        files.forEach(filename => {
            const filepath = path.join(uploadsDir, filename);
            try {
                fs.unlinkSync(filepath);
                deletedCount++;
                console.log(`Deleted file: ${filename}`);
            } catch (err) {
                console.error(`Error deleting file ${filename}:`, err.message);
            }
        });
        
        res.json({
            success: true,
            message: `Successfully deleted ${deletedCount} files`,
            deletedCount: deletedCount
        });
    } catch (error) {
        console.error('Error clearing files:', error.message);
        res.status(500).json({ error: 'Failed to clear files: ' + error.message });
    }
});

// API endpoint to start video streaming
app.post('/api/video/start', async (req, res) => {
    try {
        const { quality, frameRate } = req.body;
        console.log(`Starting video streaming: ${quality} @ ${frameRate}fps`);

        // Check if VLC is available
        const vlcAvailable = await checkVLCInstallation();
        if (!vlcAvailable) {
            return res.status(500).json({ 
                error: 'VLC is not installed. Please install VLC media player: sudo apt install vlc' 
            });
        }

        // Start video receiver process if not running
        if (!videoReceiverProcess) {
            videoReceiverProcess = spawn(path.join(__dirname, '../c_application/video_receiver'), [], {
                stdio: 'pipe'
            });

            videoReceiverProcess.stdout.on('data', (data) => {
                console.log('Video Receiver:', data.toString().trim());
            });

            videoReceiverProcess.stderr.on('data', (data) => {
                console.error('Video Receiver Error:', data.toString().trim());
            });

            videoReceiverProcess.on('close', (code) => {
                console.log(`Video receiver process exited with code ${code}`);
                videoReceiverProcess = null;
            });

            // Wait a moment for the receiver to start
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Connect to video receiver via Unix Domain Socket
        await connectToVideoReceiver();

        // Start VLC if not running
        if (!vlcProcess) {
            console.log('Starting VLC for video display...');
            
            // VLC command with proper MJPEG demuxer
            const vlcArgs = [
                '/tmp/video_pipe',
                '--demux', 'mjpeg',
                '--no-audio',
                '--intf', 'qt',
                '--video-title-show',
                '--video-title-timeout', '3000',
                '--video-title-position', '8',
                '--meta-title', 'MANET Video Stream'
            ];
            
            vlcProcess = spawn('vlc', vlcArgs, {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            vlcProcess.stdout.on('data', (data) => {
                console.log('VLC:', data.toString().trim());
            });

            vlcProcess.stderr.on('data', (data) => {
                console.log('VLC stderr:', data.toString().trim());
            });

            vlcProcess.on('close', (code) => {
                console.log(`VLC process exited with code ${code}`);
                vlcProcess = null;
            });

            vlcProcess.on('error', (err) => {
                console.error('VLC process error:', err.message);
                vlcProcess = null;
            });
            
            console.log('VLC launched with PID:', vlcProcess.pid);
        }

        res.json({
            success: true,
            message: 'Video streaming started',
            quality: quality,
            frameRate: frameRate
        });
    } catch (error) {
        console.error('Error starting video streaming:', error.message);
        res.status(500).json({ error: 'Failed to start video streaming: ' + error.message });
    }
});

// API endpoint to stop video streaming
app.post('/api/video/stop', async (req, res) => {
    try {
        console.log('Stopping video streaming...');

        // Disconnect from video receiver
        await disconnectFromVideoReceiver();

        // Stop VLC process
        if (vlcProcess) {
            vlcProcess.kill('SIGTERM');
            vlcProcess = null;
        }

        // Stop video receiver process
        if (videoReceiverProcess) {
            videoReceiverProcess.kill('SIGTERM');
            videoReceiverProcess = null;
        }

        res.json({
            success: true,
            message: 'Video streaming stopped'
        });
    } catch (error) {
        console.error('Error stopping video streaming:', error.message);
        res.status(500).json({ error: 'Failed to stop video streaming: ' + error.message });
    }
});

// API endpoint to send video frame
app.post('/api/video/frame', videoUpload.single('frame'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No frame data received' });
        }

        // Read frame data
        const frameData = fs.readFileSync(req.file.path);
        
        // Send frame to video receiver via Unix Domain Socket
        await sendFrameToVideoReceiver(frameData);

        // Clean up temporary file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting temp frame:', err.message);
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error sending video frame:', error.message);
        
        // Clean up temporary file on error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp frame:', err.message);
            });
        }
        
        res.status(500).json({ error: 'Failed to send frame: ' + error.message });
    }
});

// API endpoint to get video streaming status
app.get('/api/video/status', (req, res) => {
    try {
        res.json({
            success: true,
            status: {
                isStreaming: isVideoStreaming,
                hasConnection: !!(videoSocket && !videoSocket.destroyed),
                vlcRunning: !!vlcProcess,
                receiverRunning: !!videoReceiverProcess
            }
        });
    } catch (error) {
        console.error('Error getting video status:', error.message);
        res.status(500).json({ error: 'Failed to get video status: ' + error.message });
    }
});

// Serve the new MANET dashboard as the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/manet-dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log('Make sure the servers are running:');
    console.log('  - Message Server: ./msg_server (listens on /tmp/msg_socket)');
    console.log('  - Call Server: ./call_server (listens on /tmp/call_socket)');
    console.log('  - File Server: ./file_server (listens on /tmp/file_socket)');
    console.log('  - Video Receiver: ./video_receiver (listens on /tmp/video_socket)');
    console.log('');
    console.log('Video streaming setup:');
    console.log('  1. Create FIFO pipe: mkfifo /tmp/video_pipe');
    console.log('  2. Video streaming will auto-start VLC: vlc /tmp/video_pipe');
});
