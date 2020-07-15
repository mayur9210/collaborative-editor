// Initialize Socket.IO connection
const socket = io();

// Get DOM elements
const editor = document.getElementById('editor');
const userCountSpan = document.getElementById('userCount');
const userIdSpan = document.getElementById('userId');
const statusText = document.getElementById('statusText');
const connectionStatus = document.getElementById('connectionStatus');
const saveIndicator = document.getElementById('saveIndicator');
const charCount = document.getElementById('charCount');
const wordCount = document.getElementById('wordCount');
const lineCount = document.getElementById('lineCount');
const toastContainer = document.getElementById('toast-container');

// State management
let isUpdatingFromServer = false;
let lastSaveTime = Date.now();
let debounceTimer = null;

// Utility functions
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

function updateStats() {
    const text = editor.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    
    charCount.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
    wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    lineCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
}

function updateSaveIndicator(saved = true) {
    if (saved) {
        saveIndicator.innerHTML = '<span class="icon">💾</span>Auto-saved';
        saveIndicator.style.color = 'var(--secondary-color)';
    } else {
        saveIndicator.innerHTML = '<span class="icon">⏳</span>Saving...';
        saveIndicator.style.color = 'var(--warning-color)';
    }
}

function updateConnectionStatus(status) {
    const statusClasses = {
        'connected': 'online',
        'connecting': 'connecting',
        'disconnected': 'offline'
    };
    
    const statusMessages = {
        'connected': 'Connected',
        'connecting': 'Connecting...',
        'disconnected': 'Disconnected'
    };
    
    connectionStatus.className = `status ${statusClasses[status]}`;
    statusText.textContent = statusMessages[status];
}

function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(debounceTimer);
            func(...args);
        };
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(later, wait);
    };
}

// Socket.IO event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    userIdSpan.textContent = socket.id.slice(0, 8);
    updateConnectionStatus('connected');
    showToast('Connected to server', 'success');
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    updateConnectionStatus('disconnected');
    showToast('Disconnected from server', 'error');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus('connecting');
    showToast('Connection failed. Retrying...', 'error');
});

socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected after', attemptNumber, 'attempts');
    updateConnectionStatus('connected');
    showToast('Reconnected to server', 'success');
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Reconnection attempt', attemptNumber);
    updateConnectionStatus('connecting');
});

// Handle initial document content
socket.on('init', (data) => {
    console.log('Received initial document');
    isUpdatingFromServer = true;
    
    if (typeof data === 'object' && data.content !== undefined) {
        editor.value = data.content;
        userIdSpan.textContent = data.userId ? data.userId.slice(0, 8) : 'Unknown';
    } else if (typeof data === 'string') {
        editor.value = data;
    }
    
    updateStats();
    updateSaveIndicator(true);
    isUpdatingFromServer = false;
});

// Handle text changes from other users
socket.on('textChange', (data) => {
    if (!isUpdatingFromServer) {
        const cursorPosition = editor.selectionStart;
        const cursorEnd = editor.selectionEnd;
        
        isUpdatingFromServer = true;
        editor.value = data.content;
        
        // Try to maintain cursor position
        editor.setSelectionRange(cursorPosition, cursorEnd);
        
        updateStats();
        updateSaveIndicator(true);
        isUpdatingFromServer = false;
        
        // Show subtle indication of remote change
        editor.style.backgroundColor = '#f0f8ff';
        setTimeout(() => {
            editor.style.backgroundColor = '';
        }, 200);
    }
});

// Handle user count updates
socket.on('userCount', (count) => {
    userCountSpan.textContent = count;
    
    if (count > 1) {
        showToast(`${count} users are now collaborating`, 'info', 2000);
    }
});

// Handle cursor changes from other users
socket.on('cursorChange', (data) => {
    // Visual indication could be added here
    console.log(`User ${data.userId.slice(0, 8)} cursor at position ${data.position}`);
});

// Handle server errors
socket.on('error', (error) => {
    console.error('Server error:', error);
    showToast(error.message || 'Server error occurred', 'error');
});

// Handle user disconnections
socket.on('userDisconnected', (userId) => {
    console.log('User disconnected:', userId);
});

// Debounced text change handler
const debouncedTextChange = debounce((content) => {
    if (!isUpdatingFromServer) {
        socket.emit('textChange', { content });
        updateSaveIndicator(true);
    }
}, 300);

// Editor event listeners
editor.addEventListener('input', (e) => {
    if (!isUpdatingFromServer) {
        updateStats();
        updateSaveIndicator(false);
        debouncedTextChange(editor.value);
    }
});

editor.addEventListener('selectionchange', () => {
    if (!isUpdatingFromServer) {
        socket.emit('cursorChange', {
            position: editor.selectionStart
        });
    }
});

// Handle paste events
editor.addEventListener('paste', (e) => {
    setTimeout(() => {
        if (!isUpdatingFromServer) {
            updateStats();
            updateSaveIndicator(false);
            socket.emit('textChange', { content: editor.value });
            updateSaveIndicator(true);
        }
    }, 10);
});

// Keyboard shortcuts
editor.addEventListener('keydown', (e) => {
    // Ctrl+S or Cmd+S to force save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        socket.emit('textChange', { content: editor.value });
        updateSaveIndicator(true);
        showToast('Document saved', 'success', 1500);
    }
    
    // Ctrl+A or Cmd+A to select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        setTimeout(updateStats, 10);
    }
});

// Handle window/tab visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Tab became visible, ensure we have latest content
        socket.emit('requestSync');
    }
});

// Handle window beforeunload
window.addEventListener('beforeunload', (e) => {
    // Send final update before leaving
    if (editor.value) {
        socket.emit('textChange', { content: editor.value });
    }
});

// Initialize stats on page load
updateStats();
updateConnectionStatus('connecting');

// Periodic connection health check
setInterval(() => {
    if (socket.connected) {
        socket.emit('ping');
    }
}, 30000);

socket.on('pong', () => {
    console.log('Connection is healthy');
});

// Add CSS animation for slide out
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);