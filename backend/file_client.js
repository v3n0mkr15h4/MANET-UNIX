const net = require('net');
const fs = require('fs');
const path = require('path');

const FILE_SOCKET_PATH = '/tmp/file_socket';
const CHUNK_SIZE = 1024; // 1KB chunks

class FileClient {
    constructor() {
        this.client = null;
    }

    // Send a file to the C server via Unix Domain Socket
    sendFile(filePath, originalName) {
        return new Promise((resolve, reject) => {
            const client = net.createConnection(FILE_SOCKET_PATH, () => {
                console.log('Connected to file server');
                this.streamFile(client, filePath, originalName, resolve, reject);
            });

            client.on('error', (err) => {
                console.error('File client error:', err.message);
                reject(err);
            });

            client.on('close', () => {
                console.log('Connection to file server closed');
            });

            // Set a timeout for the connection
            client.setTimeout(30000, () => {
                console.error('File transfer timeout');
                client.destroy();
                reject(new Error('File transfer timeout'));
            });
        });
    }

    // Stream file data in chunks
    streamFile(client, filePath, originalName, resolve, reject) {
        const fileStream = fs.createReadStream(filePath);
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        
        console.log(`Starting file transfer: ${originalName} (${fileSize} bytes)`);

        // Send file metadata first (filename:filesize)
        const metadata = `${originalName}:${fileSize}\n`;
        client.write(metadata);

        let bytesSent = 0;
        let responseReceived = false;
        let transferComplete = false;

        // Handle server response
        client.on('data', (data) => {
            if (!responseReceived) {
                responseReceived = true;
                const response = data.toString().trim();
                console.log('File server response:', response);
                
                client.end(); // Properly close the connection
                
                if (response.includes('SUCCESS')) {
                    resolve({
                        success: true,
                        message: `File ${originalName} transferred successfully`,
                        size: fileSize
                    });
                } else {
                    reject(new Error(`File transfer failed: ${response}`));
                }
            }
        });

        fileStream.on('data', (chunk) => {
            if (!client.destroyed) {
                client.write(chunk);
                bytesSent += chunk.length;
                
                // Log progress every 10%
                const progress = ((bytesSent / fileSize) * 100).toFixed(1);
                if (bytesSent % Math.max(1, Math.floor(fileSize / 10)) < chunk.length) {
                    console.log(`File transfer progress: ${progress}% (${bytesSent}/${fileSize} bytes)`);
                }
            }
        });

        fileStream.on('end', () => {
            console.log(`File transfer data completed: ${originalName}`);
            transferComplete = true;
            
            // Send end-of-file marker
            if (!client.destroyed) {
                client.write('EOF\n');
                console.log('EOF marker sent');
            }
        });

        fileStream.on('error', (err) => {
            console.error('File read error:', err.message);
            if (!client.destroyed) {
                client.destroy();
            }
            if (!responseReceived) {
                reject(err);
            }
        });

        // Handle client errors during streaming
        client.on('error', (err) => {
            if (!responseReceived) {
                console.error('Client error during streaming:', err.message);
                reject(err);
            }
        });

        // Handle connection close
        client.on('close', () => {
            console.log('Connection closed');
            if (!responseReceived && transferComplete) {
                // Connection closed without response - this shouldn't happen
                reject(new Error('Connection closed without server response'));
            }
        });
    }

    // Send buffer data directly (for in-memory files)
    sendBuffer(buffer, originalName) {
        return new Promise((resolve, reject) => {
            const client = net.createConnection(FILE_SOCKET_PATH, () => {
                console.log('Connected to file server');
                this.streamBuffer(client, buffer, originalName, resolve, reject);
            });

            client.on('error', (err) => {
                console.error('File client error:', err.message);
                reject(err);
            });
        });
    }

    // Stream buffer data in chunks
    streamBuffer(client, buffer, originalName, resolve, reject) {
        const fileSize = buffer.length;
        
        console.log(`Starting buffer transfer: ${originalName} (${fileSize} bytes)`);

        // Send file metadata first (filename:filesize)
        const metadata = `${originalName}:${fileSize}\n`;
        client.write(metadata);

        let bytesSent = 0;

        // Send buffer in chunks
        for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
            const chunk = buffer.slice(i, i + CHUNK_SIZE);
            client.write(chunk);
            bytesSent += chunk.length;
            
            // Log progress
            const progress = ((bytesSent / fileSize) * 100).toFixed(1);
            console.log(`Buffer transfer progress: ${progress}% (${bytesSent}/${fileSize} bytes)`);
        }

        console.log(`Buffer transfer completed: ${originalName}`);
        
        // Send end-of-file marker
        client.write('EOF\n');
        
        // Wait for acknowledgment from C server
        client.on('data', (data) => {
            const response = data.toString().trim();
            console.log('File server response:', response);
            client.end();
            
            if (response.includes('SUCCESS')) {
                resolve({
                    success: true,
                    message: `File ${originalName} transferred successfully`,
                    size: fileSize
                });
            } else {
                reject(new Error(`File transfer failed: ${response}`));
            }
        });
    }
}

// Example usage when run directly
if (require.main === module) {
    const client = new FileClient();
    
    // Test with a sample file
    const testFile = path.join(__dirname, 'package.json');
    client.sendFile(testFile, 'test-package.json')
        .then(response => console.log('File transfer response:', response))
        .catch(err => console.error('Error:', err));
}

module.exports = FileClient;
