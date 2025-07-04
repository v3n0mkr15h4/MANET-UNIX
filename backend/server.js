const express = require('express');
const net = require('net');
const path = require('path');
const MessageClient = require('./msg_client');
const CallClient = require('./call_client');

const app = express();
const PORT = 3000;

// Create client instances
const msgClient = new MessageClient();
const callClient = new CallClient();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

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
    
    if (!destinationId || isNaN(destinationId)) {
        return res.status(400).json({ error: 'Valid destination ID is required' });
    }
    
    try {
        console.log('Starting call to SDR ID:', destinationId);
        
        // Check if already streaming
        const status = callClient.getStatus();
        if (status.isStreaming) {
            return res.status(409).json({ 
                error: 'Call already in progress',
                currentCall: status.currentSdrId
            });
        }
        
        // Send call command to message server
        const callResponse = await msgClient.sendCallCommand(parseInt(destinationId));
        console.log('Call command response:', callResponse);
        
        // Start audio streaming
        await callClient.startCall(parseInt(destinationId));
        
        res.json({ 
            success: true, 
            message: `Call started to SDR ID ${destinationId}`,
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
        callClient.stopCall();
        
        // Give a moment for cleanup
        setTimeout(() => {
            const status = callClient.getStatus();
            res.json({ 
                success: true, 
                message: 'Call stopped',
                status: status
            });
        }, 100);
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

// Serve the new MANET dashboard as the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/manet-dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log('Make sure the Message Server and Call Server are running:');
    console.log('  - Message Server: ./msg_server (listens on /tmp/msg_socket)');
    console.log('  - Call Server: ./call_server (listens on /tmp/call_socket)');
});
