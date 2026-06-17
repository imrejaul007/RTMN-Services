# RTMN Chat Widget SDK

An embeddable, customer-facing chat widget for real-time customer support with AI bot integration, human agent transfer, and WebSocket-powered messaging.

## Features

- **Real-time Messaging** - WebSocket-powered instant messaging
- **AI Bot Responses** - Intelligent automated responses with customizable behavior
- **Human Agent Transfer** - Seamless escalation to live agents
- **Typing Indicators** - See when others are typing
- **File Attachments** - Support for images, PDFs, and documents
- **Custom Theming** - Match your brand with custom colors and styles
- **Event System** - Full event hooks for custom integrations
- **Responsive Design** - Works on desktop and mobile
- **Easy Embed** - Single script tag integration

## Quick Start

### 1. Include the SDK

```html
<script src="https://cdn.your-domain.com/chat-widget.js"></script>
```

### 2. Initialize the Widget

```html
<script>
  window.RTMNChatWidget.init({
    apiUrl: 'https://api.your-domain.com',
    businessId: 'your-business-id',
    position: 'bottom-right' // or 'bottom-left'
  });
</script>
```

## Configuration

### Basic Options

```javascript
window.RTMNChatWidget.init({
  // Required
  apiUrl: 'https://api.your-domain.com',      // Backend API URL
  businessId: 'your-business-id',            // Your business identifier

  // Optional
  position: 'bottom-right',                   // Widget position
  greeting: 'Hello! How can we help?',       // Initial greeting message
  apiKey: 'your-api-key',                     // API authentication key
  widgetId: 'optional-widget-id',             // Multiple widgets support
  metadata: {                                  // Custom metadata
    source: 'website',
    campaign: 'summer-sale'
  }
});
```

### Theme Customization

```javascript
window.RTMNChatWidget.init({
  apiUrl: 'https://api.your-domain.com',
  businessId: 'your-business-id',
  theme: {
    primaryColor: '#0066ff',       // Main brand color
    secondaryColor: '#f5f7fa',    // Background colors
    fontColor: '#2d3748',          // Text color
    backgroundColor: '#ffffff',   // Chat window background
    launcherColor: '#0066ff',      // Launcher button color
    borderRadius: 16               // Corner radius in pixels
  }
});
```

### AI Bot Configuration

```javascript
window.RTMNChatWidget.init({
  apiUrl: 'https://api.your-domain.com',
  businessId: 'your-business-id',
  AIResponses: {
    enabled: true,                         // Enable AI responses
    botName: 'AI Assistant',              // Bot display name
    botAvatar: 'https://.../avatar.png',   // Bot avatar URL
    placeholder: 'Type a message...',     // Input placeholder
    fallbackMessage: 'I didn\'t understand. Connect to a human agent?', // Fallback message
    similarityThreshold: 0.7              // Response matching threshold
  }
});
```

### Agent Transfer Configuration

```javascript
window.RTMNChatWidget.init({
  apiUrl: 'https://api.your-domain.com',
  businessId: 'your-business-id',
  AgentTransfer: {
    enabled: true,                        // Enable agent transfer
    departments: ['sales', 'support'],   // Available departments
    autoTransfer: false,                   // Auto-transfer on keywords
    transferMessage: 'Connecting you to an agent...'
  }
});
```

### File Upload Configuration

```javascript
window.RTMNChatWidget.init({
  apiUrl: 'https://api.your-domain.com',
  businessId: 'your-business-id',
  fileUpload: {
    enabled: true,                                    // Enable file uploads
    maxSize: 10 * 1024 * 1024,                        // 10MB max file size
    allowedTypes: [                                   // Allowed MIME types
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/doc',
      'application/docx'
    ]
  }
});
```

## API Methods

### Initialize

```javascript
const widget = window.RTMNChatWidget.init(config);
```

### Destroy

```javascript
// Destroy and remove the widget
window.RTMNChatWidget.destroy();
```

### Widget Instance Methods

```javascript
const widget = window.RTMNChatWidget.init(config);

// Check if widget is open
widget.isWidgetOpen(); // returns boolean

// Get current session
widget.getSession(); // returns ChatSession or null

// Send a quick reply
widget.sendQuickReply('Thanks for your help!');

// Destroy the widget instance
widget.destroy();
```

## Events

### Event Listeners

```javascript
const widget = window.RTMNChatWidget.init(config);

// Widget lifecycle
widget.on('ready', () => console.log('Widget ready'));
widget.on('open', () => console.log('Widget opened'));
widget.on('close', () => console.log('Widget closed'));

// Message events
widget.on('message:send', (message) => console.log('Sent:', message));
widget.on('message:receive', (message) => console.log('Received:', message));
widget.on('message:status', ({ messageId, status }) => console.log('Status update:', messageId, status));

// Typing indicator
widget.on('typing:start', ({ sender, senderName }) => console.log('Typing:', senderName));
widget.on('typing:stop', () => console.log('Stopped typing'));

// Agent events
widget.on('agent:joined', (agent) => console.log('Agent joined:', agent.name));
widget.on('agent:left', (agent) => console.log('Agent left:', agent.name));

// Transfer events
widget.on('transfer:request', (department) => console.log('Transfer requested:', department));
widget.on('transfer:success', (agent) => console.log('Transferred to:', agent.name));

// File events
widget.on('file:upload', (attachment) => console.log('File uploaded:', attachment));
widget.on('file:error', (error) => console.error('Upload failed:', error));

// Session events
widget.on('session:started', (session) => console.log('Session started:', session.id));
widget.on('session:ended', (session) => console.log('Session ended:', session.id));

// Error handling
widget.on('error', (error) => console.error('Error:', error));
```

### Remove Event Listeners

```javascript
const handler = (message) => console.log('Message:', message);
widget.on('message:receive', handler);

// Remove the handler
widget.off('message:receive', handler);
```

## Building the SDK

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Development mode
npm run dev

# Type checking
npm run typecheck
```

## Backend Requirements

The widget expects the following API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create a new chat session |
| GET | `/sessions/:id` | Get session details |
| DELETE | `/sessions/:id` | End a session |
| POST | `/sessions/:id/messages` | Send a message |
| GET | `/sessions/:id/messages` | Get session messages |
| POST | `/sessions/:id/messages/:id/read` | Mark message as read |
| POST | `/sessions/:id/transfer` | Request agent transfer |
| POST | `/sessions/:id/ai/respond` | Get AI bot response |
| POST | `/sessions/:id/attachments` | Upload file attachment |
| GET | `/attachments/:id/url` | Get attachment URL |
| GET | `/businesses/:id/agents` | Get available agents |

### WebSocket Events

Connect to `/ws/sessions/:sessionId` for real-time updates.

| Event | Payload | Description |
|-------|---------|--------------|
| `session_joined` | `{ sessionId }` | Join a session room |
| `message` | `ChatMessage` | New message received |
| `typing` | `{ isTyping, sender, senderName }` | Typing indicator |
| `agent_joined` | `Agent` | Agent joined the chat |
| `agent_left` | `Agent` | Agent left the chat |
| `session_update` | `ChatSession` | Session status update |

## TypeScript Support

The SDK includes full TypeScript definitions:

```typescript
import { ChatWidget, type ChatConfig } from '@rtmn/chat-widget';

const config: ChatConfig = {
  apiUrl: 'https://api.example.com',
  businessId: 'my-business'
};

const widget = new ChatWidget(config);
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Demo

Open `example.html` in a browser to see the widget in action. The demo page includes:

- Configuration form
- Feature showcase
- API usage examples
- Event demonstration

## License

MIT License - See LICENSE file for details.

---

Built with care for seamless customer support integration.
