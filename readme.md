# Real-Time Collaborative Text Editor

A real-time collaborative text editor built with Node.js, Socket.IO, and vanilla JavaScript. Multiple users can edit the same document simultaneously with instant synchronization.

![Demo](https://img.shields.io/badge/demo-live-brightgreen)
![Node.js](https://img.shields.io/badge/node.js-v12+-blue)
![Socket.IO](https://img.shields.io/badge/socket.io-v4-orange)

## Features

- 🔄 Real-time text synchronization
- 👥 Multiple user support
- 📊 Live user count
- 🎯 Cursor position tracking
- 📱 Responsive design
- ⚡ Low latency updates
- 🛡️ Rate limiting protection

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/mayur9210/collaborative-editor.git
cd collaborative-editor
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser to `http://localhost:3000`

5. Open multiple tabs to test real-time collaboration!

## Installation

### Prerequisites
- Node.js (v12 or higher)
- npm or yarn

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## Usage

1. Open the application in your browser
2. Start typing in the text area
3. Open another browser tab/window to the same URL
4. Type in either window and see changes sync in real-time
5. Watch the user count update as people join/leave

## API Endpoints

- `GET /` - Main application
- `GET /health` - Health check endpoint

## WebSocket Events

### Client to Server
- `textChange` - Send text updates
- `cursorChange` - Send cursor position
- `operation` - Send operational transformation data

### Server to Client
- `init` - Initial document state
- `textChange` - Broadcast text updates
- `userCount` - Current user count
- `cursorChange` - Other users' cursor positions

## Project Structure

```
collaborative-editor/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── public/           # Static files
│   ├── index.html    # Main HTML page
│   ├── style.css     # Styling
│   └── script.js     # Client-side JavaScript
└── docs/            # Documentation
    └── TUTORIAL.md   # Complete tutorial
```

## Configuration

Create a `.env` file for environment variables:

```env
PORT=3000
NODE_ENV=development
```

## Deployment

### Heroku
```bash
# Login to Heroku
heroku login

# Create new app
heroku create your-app-name

# Deploy
git push heroku main
```

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Socket.IO](https://socket.io/)
- Styled with modern CSS
- Inspired by Google Docs and collaborative editing tools

## Support

If you have any questions or run into issues, please open an issue on GitHub.

---

⭐ Star this repo if you found it helpful!
