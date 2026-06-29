# App Detection Service

**Port: 4899**

Detects active app and provides context-aware voice commands - like Wispr Flow's app awareness.

## Features

- **App Detection**: Detects which app is active (Slack, Notion, VS Code, etc.)
- **Context-Aware Commands**: App-specific voice commands
- **Inline Text Commands**: "make shorter", "make formal", "fix grammar", "add emoji"
- **Cross-App Voice**: Works across all supported apps

## Supported Apps

| App | Category | Commands |
|-----|----------|----------|
| Slack | Communication | Send, Create Channel, Set Status, Search |
| Discord | Communication | Send, Join Voice |
| WhatsApp | Communication | Send, New Chat |
| Notion | Productivity | Create Page, Add to Page, Search |
| Google Docs | Productivity | Edit, Comment, Share |
| VS Code | Development | Write Code, Comment, Git Commit |
| Terminal | Development | Run Command, Navigate |
| Email | Communication | Compose, Reply, Forward |
| Twitter/X | Social | Tweet, Reply |
| DO App | Commerce | Order Food, Book Hotel, Book Appointment |

## API Endpoints

```
POST /api/app/detect          - Detect app from window title
POST /api/app/context          - Get full context for an app
POST /api/app/voice            - Process voice input with app context
GET  /api/app/inline-commands - Get all inline commands
GET  /api/app/apps            - Get all supported apps
POST /api/app/execute-inline   - Execute inline command
```

## Example

```bash
# Detect app from window title
curl -X POST http://localhost:4899/api/app/detect \
  -H "Content-Type: application/json" \
  -d '{"windowTitle": "Slack - #engineering"}'

# Response
{
  "success": true,
  "appId": "slack",
  "context": {
    "appName": "Slack",
    "appCategory": "communication",
    "availableActions": [
      { "name": "Send Message", "command": "send" },
      { "name": "Create Channel", "command": "create-channel" }
    ]
  }
}

# Process voice input
curl -X POST http://localhost:4899/api/app/voice \
  -H "Content-Type: application/json" \
  -d '{"input": "make this shorter", "appId": "notion", "selectedText": "Long paragraph..."}'

# Response
{
  "success": true,
  "type": "inline_command",
  "inlineCommand": {
    "id": "shorter",
    "name": "Make Shorter",
    "execution": { "type": "transform", "transform": "shorter" }
  }
}
```

## Inline Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| Make Shorter | shorter, concise, brief | Shorten the text |
| Make Longer | longer, expand, elaborate | Expand the text |
| Make Formal | formal, professional, business | More formal tone |
| Make Casual | casual, relaxed, friendly | More casual tone |
| Fix Grammar | grammar, fix, correct | Fix grammar issues |
| Add Emoji | emoji, emojis | Add relevant emojis |
| Translate | translate, in spanish | Translate the text |
| Summarize | summarize, summary, tl;dr | Create summary |

## Wispr Flow Comparison

| Feature | Wispr Flow | HOJAI App Detection |
|---------|-----------|---------------------|
| App Detection | ✅ | ✅ |
| Context-Aware Commands | ✅ | ✅ |
| Inline Text Commands | ✅ | ✅ |
| Cross-App Voice | ❌ | ✅ |
| Relationship Context | ❌ | ✅ (via RelationshipOS) |
| Emotional Intelligence | ❌ | ✅ (via HumanPresence) |

## VoiceOS Integration

This service connects to Layer 9 (Multi-Agent Voice) for complete Wispr Flow-like experience with added emotional intelligence.
