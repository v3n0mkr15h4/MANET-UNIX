const express = require('express');
const MessageClient = require('./msg_client');

const app = express();
const PORT = 3001;

// Create message client instance
const msgClient = new MessageClient();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'running', 
        service: 'Message Server',
        timestamp: new Date().toISOString()
    });
});

// Send message endpoint
app.post('/api/send', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Message is required' 
            });
        }

        console.log('Sending message:', message);
        const result = await msgClient.sendMessage(message);
        
        res.json({ 
            success: true, 
            message: 'Message sent successfully',
            response: result 
        });
    } catch (error) {
        console.error('Error sending message:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send message: ' + error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('==========================================');
    console.log('MANET Message Server');
    console.log('==========================================');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log(`  - Health: GET http://localhost:${PORT}/health`);
    console.log(`  - Send Message: POST http://localhost:${PORT}/api/send`);
    console.log('');
    console.log('Make sure the C message server is running:');
    console.log('  - cd ../c_application && ./msg_server');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down Message Server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down Message Server...');
    process.exit(0);
});
