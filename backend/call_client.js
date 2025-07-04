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
        return new Promise((resolve, reject) => {
            if (this.isStreaming) {
                console.log('Call already in progress, cannot start new call');
                return reject(new Error('Call already in progress'));
            }

            // Ensure clean state before starting
            this.stopCall();

            this.currentSdrId = destinationSdrId;
            console.log(`Attempting to connect to call server for SDR ID ${destinationSdrId}`);
            
            // Add a small delay to ensure the C server is ready for new connections
            setTimeout(() => {
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
                this.client.setTimeout(5000, () => {
                    console.error('Connection timeout');
                    this.stopCall();
                    reject(new Error('Connection timeout'));
                });
            }, 100); // Small delay to ensure C server is ready
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
        // First byte is the SDR ID, followed by dummy audio data
        const frameSize = 64; // Small frame for demo
        const audioFrame = Buffer.alloc(frameSize);
        
        // Set SDR ID in first byte
        audioFrame[0] = this.currentSdrId;
        
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
            this.client.end();
            
            // Force close after a short delay
            setTimeout(() => {
                if (this.client) {
                    this.client.destroy();
                    console.log('Client socket destroyed');
                }
            }, 50);
            
            this.client = null;
        }
        
        // Reset state
        const oldSdrId = this.currentSdrId;
        this.currentSdrId = 0;
        
        console.log(`Call stopped successfully (was connected to SDR ID ${oldSdrId})`);
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
