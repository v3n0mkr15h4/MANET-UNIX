const net = require('net');

const CALL_SOCKET_PATH = '/tmp/call_socket';

class CallClient {
    constructor() {
        this.client = null;
        this.isStreaming = false;
        this.currentSdrId = 0;
        this.streamingTimer = null;
    }

    // Start streaming audio frames
    startCall(destinationSdrId) {
        return new Promise(async (resolve, reject) => {
            if (this.isStreaming) {
                console.log('Call already in progress, cannot start new call');
                return reject(new Error('Call already in progress'));
            }

            // Ensure clean state before starting - wait for any existing cleanup
            console.log('Ensuring clean state before starting new call...');
            await this.stopCall();
            
            // Additional wait to ensure socket is fully closed
            await new Promise(resolve => setTimeout(resolve, 200));

            this.currentSdrId = destinationSdrId;
            console.log(`Attempting to connect to call server for SDR ID ${destinationSdrId}`);
            
            this.client = net.createConnection(CALL_SOCKET_PATH, () => {
                console.log('Connected to call server');
                this.isStreaming = true;
                
                // Start streaming dummy audio frames
                this.streamAudioFrames();
                resolve();
            });

            this.client.on('end', () => {
                console.log('Call server disconnected');
                this.stopCall();
            });

            this.client.on('error', (err) => {
                console.error('Call client error:', err.message);
                this.stopCall();
                reject(err);
            });

            // Add timeout for connection
            this.client.setTimeout(10000, () => {
                console.error('Connection timeout');
                this.stopCall();
                reject(new Error('Connection timeout'));
            });
        });
    }

    // Stream dummy audio frames every 100ms
    streamAudioFrames() {
        if (!this.isStreaming || !this.client) {
            console.log('Streaming stopped or no client connection');
            return;
        }

        // Create dummy audio frame
        const audioData = this.createDummyAudioFrame();
        
        // Send frame with 2-byte big endian length prefix
        const frameLength = audioData.length;
        const lengthBuffer = Buffer.alloc(2);
        lengthBuffer.writeUInt16BE(frameLength, 0);
        
        // Combine length and data
        const frame = Buffer.concat([lengthBuffer, audioData]);
        
        try {
            this.client.write(frame);
            console.log(`Sent audio frame of length ${frameLength} for SDR ID ${this.currentSdrId}`);
        } catch (err) {
            console.error('Error sending audio frame:', err.message);
            this.stopCall();
            return;
        }

        // Schedule next frame
        this.streamingTimer = setTimeout(() => this.streamAudioFrames(), 100);
    }

    // Create dummy audio frame (simulated audio data)
    createDummyAudioFrame() {
        // Optimized for 128-node network (SDR IDs 0-127)
        const frameSize = 64; // Small frame for demo
        const audioFrame = Buffer.alloc(frameSize);
        
        // Set SDR ID in first byte (7 bits used, 1 bit available for future use)
        // Mask to ensure SDR ID is within 0-127 range
        audioFrame[0] = this.currentSdrId & 0x7F; // Use only 7 bits (0-127)
        
        // Fill with dummy audio data (sine wave pattern)
        for (let i = 1; i < frameSize; i++) {
            audioFrame[i] = Math.floor(127 * Math.sin(2 * Math.PI * i / 32)) + 128;
        }
        
        return audioFrame;
    }

    // Stop the call
    stopCall() {
        console.log('Stopping call...');
        
        // Clear the streaming timer to prevent more frames
        if (this.streamingTimer) {
            clearTimeout(this.streamingTimer);
            this.streamingTimer = null;
            console.log('Streaming timer cleared');
        }
        
        // Set streaming to false first
        this.isStreaming = false;
        
        // Close the client connection
        if (this.client) {
            console.log('Closing client connection...');
            this.client.removeAllListeners(); // Remove event listeners to prevent callbacks
            
            // Try graceful close first
            try {
                this.client.end();
            } catch (err) {
                console.log('Error during graceful close:', err.message);
            }
            
            // Force close after a short delay
            setTimeout(() => {
                if (this.client) {
                    try {
                        this.client.destroy();
                        console.log('Client socket destroyed');
                    } catch (err) {
                        console.log('Error during socket destroy:', err.message);
                    }
                }
            }, 50);
            
            this.client = null;
        }
        
        // Reset state
        const oldSdrId = this.currentSdrId;
        this.currentSdrId = 0;
        
        console.log(`Call stopped successfully (was connected to SDR ID ${oldSdrId})`);
        
        // Return a promise that resolves after cleanup is complete
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Call cleanup completed');
                resolve();
            }, 100);
        });
    }

    // Get current call status
    getStatus() {
        return {
            isStreaming: this.isStreaming,
            currentSdrId: this.currentSdrId,
            hasClient: !!this.client
        };
    }
}

// Example usage when run directly
if (require.main === module) {
    const callClient = new CallClient();
    
    console.log('Starting call to SDR ID 2...');
    callClient.startCall(2)
        .then(() => {
            console.log('Call started successfully');
            
            // Stop after 5 seconds for demo
            setTimeout(() => {
                callClient.stopCall();
                process.exit(0);
            }, 5000);
        })
        .catch(err => {
            console.error('Failed to start call:', err.message);
            process.exit(1);
        });
}

module.exports = CallClient;
