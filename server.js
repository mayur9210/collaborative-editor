const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Document state management
let documentContent = '';
let documentVersion = 0;
let userCount = 0;
let connectedUsers = new Map();

// Rate limiting storage
const rateLimits = new Map();

// Rate limiting function
function checkRateLimit(userId, limit = 10, window = 1000) {
    const now = Date.now();
    
    if (!rateLimits.has(userId)) {
        rateLimits.set(userId, []);
    }
    
    const userRequests = rateLimits.get(userId);
    userRequests.push(now);
    
    // Keep only requests within the time window
    const recentRequests = userRequests.filter(time => now - time < window);
    rateLimits.set(userId, recentRequests);
    
    return recentRequests.length <= limit;
}

// Clean up old rate limit data periodically
setInterval(() => {
    const now = Date.now();
    for (const [userId, requests] of rateLimits.entries()) {
        const recentRequests = requests.filter(time => now - time < 60000); // Keep 1 minute
        if (recentRequests.length === 0) {
            rateLimits.delete(userId);
        } else {
            rateLimits.set(userId, recentRequests);
        }
    }
}, 60000); // Clean up every minute

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    userCount++;
    
    // Store user info
    connectedUsers.set(socket.id, {
        id: socket.id,
        connectedAt: new Date(),
        lastActivity: new Date()
    });

    // Send initial state to new user
    socket.emit('init', {
        content: documentContent,
        version: documentVersion,
        userId: socket.id
    });
    
    // Broadcast updated user count
    io.emit('userCount', userCount);

    // Handle text changes
    socket.on('textChange', (data) => {
        // Check rate limit
        if (!checkRateLimit(socket.id, 15, 1000)) {
            socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
            return;
        }

        try {
            // Update document content
            if (data && typeof data.content === 'string') {
                documentContent = data.content;
                documentVersion++;
                
                // Update user activity
                if (connectedUsers.has(socket.id)) {
                    connectedUsers.get(socket.id).lastActivity = new Date();
                }
                
                // Broadcast to all other clients
                socket.broadcast.emit('textChange', {
                    content: data.content,
                    version: documentVersion,
                    userId: socket.id
                });
            }
        } catch (error) {
            console.error('Text change error:', error);
            socket.emit('error', { message: 'Failed to process text change' });
        }
    });

    // Handle cursor position changes
    socket.on('cursorChange', (data) => {
        // Check rate limit (more lenient for cursor updates)
        if (!checkRateLimit(socket.id + '_cursor', 30, 1000)) {
            return; // Silently ignore excessive cursor updates
        }

        try {
            if (data && typeof data.position === 'number') {
                socket.broadcast.emit('cursorChange', {
                    position: data.position,
                    userId: socket.id,
                    userName: socket.id.slice(0, 8) // Short user identifier
                });
            }
        } catch (error) {
            console.error('Cursor change error:', error);
        }
    });

    // Handle operations (for future operational transformation)
    socket.on('operation', (operation) => {
        // Check rate limit
        if (!checkRateLimit(socket.id + '_op', 20, 1000)) {
            socket.emit('error', { message: 'Operation rate limit exceeded' });
            return;
        }

        try {
            // Validate operation
            if (!operation || !operation.type || typeof operation.position !== 'number') {
                socket.emit('error', { message: 'Invalid operation format' });
                return;
            }

            // Apply operation to document
            if (operation.type === 'insert' && operation.content) {
                documentContent = 
                    documentContent.slice(0, operation.position) +
                    operation.content +
                    documentContent.slice(operation.position);
            } else if (operation.type === 'delete' && operation.length) {
                documentContent = 
                    documentContent.slice(0, operation.position) +
                    documentContent.slice(operation.position + operation.length);
            }
            
            documentVersion++;
            
            // Broadcast operation to all other clients
            socket.broadcast.emit('operation', {
                ...operation,
                version: documentVersion,
                userId: socket.id
            });
            
        } catch (error) {
            console.error('Operation error:', error);
            socket.emit('error', { message: 'Operation failed' });
        }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id} (${reason})`);
        userCount--;
        connectedUsers.delete(socket.id);
        rateLimits.delete(socket.id);
        rateLimits.delete(socket.id + '_cursor');
        rateLimits.delete(socket.id + '_op');
        
        // Broadcast updated user count
        io.emit('userCount', userCount);
        io.emit('userDisconnected', socket.id);
    });

    // Handle client errors
    socket.on('error', (error) => {
        console.error(`Socket error from ${socket.id}:`, error);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        users: userCount,
        documentLength: documentContent.length,
        version: documentVersion,
        uptime: process.uptime()
    });
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Collaborative editor server running on port ${PORT}`);
    console.log(`📝 Visit http://localhost:${PORT} to start collaborating!`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});