# Quick Start Guide

Get the Aegis Collaboration Bridge running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Chrome browser
- Open WebUI running locally (optional for testing)

## Step 1: Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Build the project
npm run build
```

## Step 2: Start the Bridge

```bash
# Start the bridge daemon
npm start
```

You should see:
```
Bridge daemon running on http://127.0.0.1:5577
WebSocket server running on ws://127.0.0.1:5577/ws
```

## Step 3: Test the Bridge

In another terminal:

```bash
# Test health endpoint
curl http://127.0.0.1:5577/health

# Should return:
# {"status":"healthy","uptime":1234,"activeConnections":0,"activeTabs":0,"timestamp":"..."}
```

## Step 4: Install Extension

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `extension/` folder
6. Look for the green checkmark badge ✓

## Step 5: Test with Open WebUI (Optional)

If you have Open WebUI running:

```bash
# Start the OWUI sidecar
npm run dev:sidecar
```

## Step 6: Test the Full Flow

1. Go to https://chat.openai.com/
2. Select some text
3. Press `Alt+M` to send to Open WebUI
4. Watch the response appear in the input field

## Troubleshooting

### Extension not connecting?
- Check bridge is running: `curl http://127.0.0.1:5577/health`
- Check browser console for errors
- Verify extension badge shows ✓

### No response from Open WebUI?
- Ensure OWUI sidecar is running
- Check `.env` has correct OWUI settings
- Verify Open WebUI is accessible

### Content not capturing?
- Make sure you're on a supported site
- Check browser console for content script errors
- Try refreshing the page

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize the `.env` file for your setup
- Add your own providers or features

## Support

- Check the [Troubleshooting](README.md#troubleshooting) section
- Enable debug logging: `LOG_LEVEL=debug` in `.env`
- Check browser console and terminal logs