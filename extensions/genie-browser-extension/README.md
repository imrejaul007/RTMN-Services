# Genie Browser Extension

**Version:** 1.0.0  
**Platforms:** Chrome, Firefox, Edge

## What is Genie Browser Extension?

The Genie Browser Extension brings your AI assistant directly into your web browsing experience. With Genie, you can:

- **Ask questions** about any webpage
- **Summarize pages** instantly
- **Save content** to your personal memory
- **View calendar** and upcoming events
- **Use voice input** for hands-free interaction
- **Keyboard shortcuts** for quick access

## Features

### 🗣️ Voice Input
- Click the microphone or press `Ctrl+Shift+K`
- Speak your question naturally
- Genie transcribes and responds

### 📝 Page Summarization
- Instantly summarize any webpage
- Get key points and takeaways
- Save summaries to memory

### 💾 Memory Integration
- Save pages to Genie Memory
- Build your personal knowledge base
- Access saved content across devices

### 📅 Calendar Integration
- View today's events
- See upcoming appointments
- Add new events

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+G` | Toggle Genie panel |
| `Ctrl+Shift+K` | Quick ask Genie |
| `Ctrl+Shift+P` | Summarize current page |

## Installation

### Chrome/Edge

1. Clone this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `extensions/genie-browser-extension` folder

### Firefox

1. Clone this repository
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `extensions/genie-browser-extension/manifest.json`

## Configuration

Before using, configure the Genie service URLs in `src/background/service-worker.js`:

```javascript
const GENIE_API = 'http://localhost:4701';      // Genie Gateway
const MEMORY_OS = 'http://localhost:4703';        // Memory OS
const VOICE_TWIN = 'http://localhost:4876';     // Voice Twin
const CALENDAR_SERVICE = 'http://localhost:4709'; // Calendar Service
```

Update these to your production URLs when deploying.

## Development

### Prerequisites

- Node.js 18+
- npm

### Building

```bash
cd extensions/genie-browser-extension
npm install
```

### Testing

1. Load the extension in your browser
2. Open DevTools (F12)
3. Check the console for logs

## Architecture

```
genie-browser-extension/
├── manifest.json           # Extension manifest (v3)
├── src/
│   ├── background/
│   │   └── service-worker.js  # Background service worker
│   ├── content/
│   │   ├── content-script.js # Injected into all pages
│   │   └── styles.css        # Panel styles
│   ├── popup/
│   │   ├── popup.html        # Extension popup
│   │   └── popup.js          # Popup logic
│   └── shared/
│       └── icons/            # Extension icons
```

## API Integration

The extension communicates with these Genie services:

| Service | Port | Purpose |
|---------|------|---------|
| Genie Gateway | 4701 | AI queries and responses |
| MemoryOS | 4703 | Save/retrieve memories |
| Voice Twin | 4876 | Speech-to-text |
| Calendar Service | 4709 | Event management |

## Privacy

- All data stays on your device unless explicitly saved to Genie services
- Page content is only sent to Genie services when you interact
- Voice data is processed locally when possible
- No tracking or analytics

## License

MIT License
