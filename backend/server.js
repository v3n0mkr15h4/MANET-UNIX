const express = require('express');
const multer = require('multer');
const net = require('net');
const path = require('path');
const fs = require('fs');
const MessageClient = require('./msg_client');
const CallClient = require('./call_client');
const FileClient = require('./file_client');
const VideoClient = require('./video_client');

const app = express();
const PORT = 3000;

// Create client instances
const msgClient = new MessageClient();
const callClient = new CallClient();
const fileClient = new FileClient();
const videoClient = new VideoClient();

// Configure multer for file uploads
const upload = multer({
    dest: '/tmp/uploads/', // temporary storage
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

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
        console.log('Starting video streaming...');
        
        // Connect to video server
        await videoClient.connect();
        
        res.json({ 
            success: true, 
            message: 'Video streaming started successfully'
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
        
        videoClient.disconnect();
        
        res.json({ 
            success: true, 
            message: 'Video streaming stopped successfully'
        });
    } catch (error) {
        console.error('Error stopping video streaming:', error.message);
        res.status(500).json({ error: 'Failed to stop video streaming: ' + error.message });
    }
});

// API endpoint to send video frame
app.post('/api/video/frame', express.raw({type: 'application/octet-stream', limit: '10mb'}), async (req, res) => {
    try {
        if (!videoClient.isConnected()) {
            return res.status(400).json({ error: 'Video streaming not started' });
        }

        const frameData = req.body;
        if (!frameData || frameData.length === 0) {
            return res.status(400).json({ error: 'No frame data received' });
        }

        await videoClient.sendFrame(frameData);
        
        res.json({ 
            success: true, 
            message: 'Frame sent successfully',
            frameSize: frameData.length
        });
    } catch (error) {
        console.error('Error sending video frame:', error.message);
        res.status(500).json({ error: 'Failed to send video frame: ' + error.message });
    }
});

// API endpoint to get video streaming status
app.get('/api/video/status', (req, res) => {
    try {
        const status = {
            isStreaming: videoClient.isConnected(),
            timestamp: new Date().toISOString()
        };
        
        res.json({ 
            success: true, 
            status: status
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
    console.log('  - Video Server: ./video_server (listens on /tmp/video_socket)');
});