const net = require('net');

class VideoClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 1000;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            if (this.connected) {
                resolve();
                return;
            }

            this.socket = new net.Socket();

            this.socket.connect('/tmp/video_socket', () => {
                console.log('[VideoClient] Connected to video server');
                this.connected = true;
                this.reconnectAttempts = 0;
                resolve();
            });

            this.socket.on('error', (error) => {
                console.error('[VideoClient] Socket error:', error.message);
                this.connected = false;
                
                if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
                    reject(new Error('Video server not available. Make sure video_server is running.'));
                } else {
                    reject(error);
                }
            });

            this.socket.on('close', () => {
                console.log('[VideoClient] Connection closed');
                this.connected = false;
                this.socket = null;
            });

            // Set timeout for connection
            setTimeout(() => {
                if (!this.connected) {
                    this.socket.destroy();
                    reject(new Error('Connection timeout to video server'));
                }
            }, 5000);
        });
    }

    async sendFrame(frameData) {
        if (!this.connected || !this.socket) {
            throw new Error('Not connected to video server');
        }

        return new Promise((resolve, reject) => {
            try {
                // Create frame length header (4 bytes, big endian)
                const lengthBuffer = Buffer.allocUnsafe(4);
                lengthBuffer.writeUInt32BE(frameData.length, 0);

                // Send length first, then frame data
                this.socket.write(lengthBuffer, (error) => {
                    if (error) {
                        reject(new Error('Failed to send frame length: ' + error.message));
                        return;
                    }

                    this.socket.write(frameData, (error) => {
                        if (error) {
                            reject(new Error('Failed to send frame data: ' + error.message));
                            return;
                        }

                        console.log(`[VideoClient] Sent video frame: ${frameData.length} bytes`);
                        resolve();
                    });
                });
            } catch (error) {
                reject(new Error('Failed to send frame: ' + error.message));
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.connected = false;
            console.log('[VideoClient] Disconnecting from video server');
            this.socket.destroy();
            this.socket = null;
            console.log('[VideoClient] Disconnected from video server');
        }
    }

    isConnected() {
        return this.connected;
    }
}

module.exports = VideoClient;
