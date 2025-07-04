const net = require('net');

const MSG_SOCKET_PATH = '/tmp/msg_socket';

class MessageClient {
    constructor() {
        this.client = null;
    }

    // Send a regular text message
    sendMessage(message) {
        return new Promise((resolve, reject) => {
            const client = net.createConnection(MSG_SOCKET_PATH, () => {
                console.log('Connected to message server');
                client.write(message);
            });

            client.on('data', (data) => {
                console.log('Received from message server:', data.toString());
                client.end();
                resolve(data.toString());
            });

            client.on('end', () => {
                console.log('Disconnected from message server');
            });

            client.on('error', (err) => {
                console.error('Message client error:', err.message);
                reject(err);
            });
        });
    }

    // Send a call command
    sendCallCommand(destinationId) {
        const command = {
            command: "start_call",
            destination_id: destinationId
        };
        
        const jsonCommand = JSON.stringify(command);
        console.log('Sending call command:', jsonCommand);
        
        return this.sendMessage(jsonCommand);
    }
}

// Example usage when run directly
if (require.main === module) {
    const client = new MessageClient();
    
    // Test with a message
    client.sendMessage("Hello from Node.js client!")
        .then(response => console.log('Message response:', response))
        .catch(err => console.error('Error:', err));
    
    // Test with a call command
    setTimeout(() => {
        client.sendCallCommand(2)
            .then(response => console.log('Call response:', response))
            .catch(err => console.error('Call error:', err));
    }, 2000);
}

module.exports = MessageClient;
