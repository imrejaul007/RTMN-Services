# Voice Hotkey Service

**Port: 4890**

Global hotkey listener and voice overlay control - like Wispr Flow's ⌘⇧D.

## Features

- **Overlay State Management**: Toggle, show, hide voice overlay
- **Listening Mode**: Track when user is speaking
- **Transcript Tracking**: Real-time and final transcripts
- **Session Management**: Track voice sessions with history
- **Quick Commands**: One-tap voice commands (order food, send message, etc.)
- **Platform Hotkeys**: Get hotkey config for Mac/Windows/Linux

## Default Hotkeys

| Platform | Hotkey | Action |
|----------|--------|--------|
| Mac | ⌥ + Space | Toggle voice |
| Mac | ⌘⇧D | Show overlay |
| Windows | Alt + Space | Toggle voice |
| Windows | Ctrl⇧D | Show overlay |
| All | Escape | Hide overlay |
| All | Ctrl⇧L | Interrupt |

## API Endpoints

```
Overlay Control:
GET    /api/overlay              - Get overlay state
POST   /api/overlay/toggle      - Toggle overlay
POST   /api/overlay/show        - Show overlay
POST   /api/overlay/hide       - Hide overlay
POST   /api/overlay/listening   - Start listening
POST   /api/overlay/transcript  - Update transcript
POST   /api/overlay/processing  - Show processing
POST   /api/overlay/response   - Show response

Sessions:
POST   /api/session/start          - Start session
POST   /api/session/:id/transcript  - Add transcript
POST   /api/session/:id/response   - Add response
POST   /api/session/:id/end        - End session
GET    /api/session/:id            - Get session
GET    /api/sessions/:userId       - Get user sessions

Quick Commands:
GET    /api/quick-commands         - List commands
POST   /api/quick-commands         - Add command
DELETE /api/quick-commands/:id    - Remove command
POST   /api/quick-commands/detect  - Detect from phrase

Hotkeys:
GET    /api/hotkeys/:platform     - Get hotkeys for platform
```

## Example

```bash
# Toggle overlay
curl -X POST http://localhost:4890/api/overlay/toggle

# Start listening with app context
curl -X POST http://localhost:4890/api/overlay/listening \
  -d '{"appId": "slack", "appName": "Slack", "windowTitle": "#general"}'

# Update transcript
curl -X POST http://localhost:4890/api/overlay/transcript \
  -d '{"text": "Hello world", "isPartial": false}'

# Get hotkeys for Mac
curl http://localhost:4890/api/hotkeys/mac
# Response: [{ "key": "Space", "modifiers": ["alt"], "action": "toggle-voice" }]
```

## Default Quick Commands

| Name | Phrase | Action |
|------|--------|--------|
| 🍕 Order Food | order food | do-app:order |
| 💬 Send Message | send message | slack:send |
| 📅 Book Meeting | book meeting | calendar:create |
| 🔍 Search | search | browser:search |
| ⏰ Remind Me | remind me | reminder:create |
| ✂️ Make Shorter | make shorter | inline:shorter |
| 📝 Make Formal | make formal | inline:formal |
| ↩️ Reply | draft reply | inline:reply |

## Wispr Flow Comparison

| Feature | Wispr Flow | HOJAI Voice Hotkey |
|---------|-----------|-------------------|
| Global Hotkey | ✅ ⌘⇧D | ✅ Alt+Space |
| Voice Overlay | ✅ | ✅ |
| Quick Commands | ❌ | ✅ |
| Session Tracking | ❌ | ✅ |
| App Context | ❌ | ✅ |
| Multi-Platform | Mac only | ✅ Mac/Windows/Linux |

## VoiceOS Integration

This service is the **desktop integration layer** for VoiceOS, providing the hotkey and overlay control that Wispr Flow has on Mac.
