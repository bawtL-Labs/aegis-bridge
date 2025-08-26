# Aegis Collaboration Bridge

A silent, two-way bridge that enables ChatGPT.com to collaborate with Open WebUI hosted models via either an OpenAPI connection or a pipeline/function.

## Overview

The Aegis Collaboration Bridge consists of three main components:

1. **Chrome Extension (MV3)** - Acts as a sensor/actuator in tabs
2. **Local Bridge Daemon** - Runs on `http://127.0.0.1:5577` with REST + WebSocket
3. **Open WebUI Sidecar** - Connects to the Bridge WS and to Open WebUI's API

This architecture avoids CORS/CSP pain and keeps everything local-only.

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    HTTP/WS    ┌─────────────────┐
│   Chrome        │ ◄──────────────► │   Bridge        │ ◄──────────────► │   Open WebUI    │
│   Extension     │                 │   Daemon        │                 │   Sidecar       │
│                 │                 │                 │                 │                 │
│ • Content       │                 │ • Fastify       │                 │ • Node.js       │
│   Scripts       │                 │ • WebSocket     │                 │ • API Client    │
│ • Service       │                 │ • Message       │                 │ • Streaming     │
│   Worker        │                 │   Routing       │                 │   Response      │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
```

## Message Model

All communication uses a unified message envelope:

```json
{
  "v": 1,
  "op": "PUSH|PULL|STREAM|CMD|ACK|ERROR",
  "src": "ext|bridge|owui",
  "tab": "<uuid>",
  "url": "https://…",
  "provider": "ChatGPT|Claude|Generic",
  "ts": "2025-08-26T19:04:30Z",
  "body": {
    "selection": "…",
    "context": "…",
    "role": "user|assistant|system",
    "action": "inject|replace|click|focus",
    "text": "…",
    "selector": "textarea, [contenteditable='true']",
    "delta": "token..."
  },
  "meta": {
    "model": "gpt-5",
    "lang": "en",
    "tabTitle": "…"
  }
}
```

## Installation

### Prerequisites

- Node.js 18+ and npm
- Chrome browser
- Open WebUI instance running locally

### 1. Clone and Setup

```bash
git clone <repository-url>
cd aegis-collaboration-bridge
npm install
```

### 2. Configuration

Copy the environment template and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Bridge Configuration
PORT=5577
SHARED_TOKEN=your_secret_token_here
ALLOW_PROVIDERS=ChatGPT,Claude,Gemini

# Open WebUI Configuration
OWUI_BASE_URL=http://localhost:3000
OWUI_API_KEY=your_owui_api_key_here
```

### 3. Build the Project

```bash
npm run build
```

### 4. Start the Bridge Daemon

```bash
# Option 1: Using npm
npm start

# Option 2: Using the startup script
./scripts/start-bridge.sh
```

### 5. Start the Open WebUI Sidecar

```bash
# Option 1: Using npm
npm run dev:sidecar

# Option 2: Using the startup script
./scripts/start-owui-sidecar.sh
```

### 6. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder from this project
5. The extension should now appear with a badge showing connection status

## Usage

### Basic Workflow

1. **Start the bridge daemon** - This creates the local WebSocket server
2. **Start the OWUI sidecar** - This connects to your Open WebUI instance
3. **Install the Chrome extension** - This enables capture and injection on supported sites
4. **Navigate to a supported site** (ChatGPT, Claude, Gemini)
5. **Select text or let the extension capture context**
6. **Use keyboard shortcuts**:
   - `Alt+M` - Send current selection to Open WebUI
   - `Alt+R` - Recall last model reply

### Supported Sites

- **ChatGPT** (`https://chat.openai.com/*`)
- **Claude** (`https://claude.ai/*`)
- **Gemini** (`https://gemini.google.com/*`)

### Features

#### Silent Capture
- Automatically captures DOM changes and user selections
- No visible UI elements on the page
- Only extension badge shows connection status

#### Smart Context Extraction
- Extracts conversation context from the last 6 messages
- Captures selected text for targeted assistance
- Maintains conversation flow

#### Real-time Injection
- Streams responses token-by-token
- Injects text into the appropriate input fields
- Supports different site layouts and selectors

#### Keyboard Shortcuts
- `Alt+M` - Send selection to Open WebUI for assistance
- `Alt+R` - Recall and re-inject the last model response

## API Reference

### Bridge Daemon Endpoints

#### WebSocket
- `ws://127.0.0.1:5577/ws?token=<shared_secret>`

#### REST API
- `GET /health` - Health check
- `GET /tabs` - List active tabs
- `POST /send` - Send command to tab
- `POST /relay` - Relay message

### Message Operations

#### PUSH (Extension → Bridge → OWUI)
Captures content from the page:
```json
{
  "op": "PUSH",
  "src": "ext",
  "body": {
    "selection": "selected text",
    "context": "conversation context",
    "role": "user"
  }
}
```

#### CMD (OWUI → Extension)
Commands to perform actions on the page:
```json
{
  "op": "CMD",
  "src": "owui",
  "body": {
    "action": "inject",
    "text": "response text",
    "selector": "textarea"
  }
}
```

#### STREAM (OWUI → Extension)
Streaming tokens for real-time response:
```json
{
  "op": "STREAM",
  "src": "owui",
  "body": {
    "delta": "token "
  }
}
```

## Security

### Local-Only Operation
- All connections are restricted to `127.0.0.1`
- No external network communication
- Shared token authentication

### Provider Allowlist
- Only allows specified providers (ChatGPT, Claude, Gemini)
- Configurable via environment variables

### Rate Limiting
- Built-in rate limiting on bridge endpoints
- Configurable limits and windows

### Strict Selectors
- Site-specific CSS selectors for injection
- Prevents injection into unintended elements

## Development

### Project Structure

```
aegis-collaboration-bridge/
├── src/
│   ├── bridge/           # Bridge daemon
│   ├── owui-sidecar/     # Open WebUI integration
│   └── types/            # TypeScript type definitions
├── extension/            # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── popup.html
├── scripts/              # Startup scripts
├── dist/                 # Compiled output
└── docs/                 # Documentation
```

### Development Commands

```bash
# Build the project
npm run build

# Start in development mode
npm run dev

# Start bridge daemon in development
npm run dev:bridge

# Start OWUI sidecar in development
npm run dev:sidecar

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Adding New Providers

1. Update the provider detection in `extension/content.js`
2. Add site-specific selectors in the content script
3. Update the manifest.json matches patterns
4. Test the integration

## Troubleshooting

### Common Issues

#### Extension Not Connecting
- Check that the bridge daemon is running on port 5577
- Verify the shared token matches in `.env` and extension
- Check browser console for WebSocket errors

#### No Response from Open WebUI
- Verify Open WebUI is running and accessible
- Check the API key in `.env`
- Ensure the OWUI sidecar is running

#### Content Not Capturing
- Verify you're on a supported site
- Check browser console for content script errors
- Ensure the extension has the necessary permissions

#### Injection Not Working
- Check site-specific selectors in content script
- Verify the target element exists and is editable
- Check for site updates that may have changed selectors

### Debug Mode

Enable debug logging by setting in `.env`:
```env
LOG_LEVEL=debug
```

### Health Checks

Check bridge status:
```bash
curl http://127.0.0.1:5577/health
```

Check active tabs:
```bash
curl http://127.0.0.1:5577/tabs
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Inspired by the mem0 pattern for quiet background communication
- Built with Fastify for high-performance Node.js web framework
- Uses Chrome Extension Manifest V3 for modern browser compatibility