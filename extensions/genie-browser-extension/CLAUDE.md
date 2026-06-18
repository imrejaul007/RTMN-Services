# Genie Browser Extension

**Version:** 1.0.0  
**Platforms:** Chrome, Firefox, Edge  
**Status:** ✅ Production Ready

---

## Overview

Brings Genie AI directly into your web browsing experience.

## Features

- 🗣️ Voice Input (Web Speech API)
- 📝 Page Summarization
- 💾 Save to Memory
- 📅 Calendar Integration
- ⌨️ Keyboard Shortcuts
- 🔍 Context Menu

## Installation

### Chrome/Edge
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extensions/genie-browser-extension/`

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+G` | Toggle Genie panel |
| `Ctrl+Shift+K` | Quick ask |
| `Ctrl+Shift+P` | Summarize page |

## Service URLs

Configure in `src/background/service-worker.js`:

```javascript
const GENIE_API = 'http://localhost:4701';
const MEMORY_OS = 'http://localhost:4703';
const VOICE_TWIN = 'http://localhost:4876';
const CALENDAR_SERVICE = 'http://localhost:4709';
```

## Architecture

```
genie-browser-extension/
├── manifest.json           # Extension manifest (v3)
├── src/
│   ├── background/
│   │   └── service-worker.js  # API calls, message routing
│   ├── content/
│   │   ├── content-script.js # Injected panel
│   │   └── styles.css        # Styling
│   └── popup/
│       ├── popup.html         # Extension popup
│       └── popup.js          # Popup logic
```

## Privacy

- All data stays on device unless saved to Genie services
- Page content sent only when you interact
- Voice processed locally when possible
- No tracking or analytics
