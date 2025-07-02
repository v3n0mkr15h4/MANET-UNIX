const express = require('express');
const net = require('net');
const path = require('path');

const app = express();
const PORT = 3000;
const SOCKET_PATH = '/tmp/message_socket';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Function to send message to C application via Unix Domain Socket
function sendToSDR(message) {
    return new Promise((resolve, reject) => {
        const client = net.createConnection(SOCKET_PATH, () => {
            console.log('Connected to SDR application');
            client.write(message);
        });

        client.on('data', (data) => {
            console.log('Received from SDR:', data.toString());
            client.end();
            resolve(data.toString());
        });

        client.on('end', () => {
            console.log('Disconnected from SDR');
        });

        client.on('error', (err) => {
            console.error('Socket error:', err.message);
            reject(err);
        });
    });
}

// API endpoint to send message
app.post('/api/send', async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    try {
        console.log('Sending message to SDR:', message);
        const response = await sendToSDR(message);
        res.json({ success: true, message: 'Message sent to SDR', response: response });
    } catch (error) {
        console.error('Error sending to SDR:', error.message);
        res.status(500).json({ error: 'Failed to send message to SDR: ' + error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log('Make sure the C SDR application is running and listening on', SOCKET_PATH);
});
