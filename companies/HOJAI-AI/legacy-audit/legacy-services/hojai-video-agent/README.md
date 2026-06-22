# Hojai Video Agent

**Website AI with Face/Avatar**

Add an AI agent with face to any website.

## Features

- **Animated Avatar** - Professional face on your website
- **Voice Interface** - Speak or type
- **Real-time Responses** - AI-powered answers
- **Multi-language** - Hindi, English support
- **Human Handoff** - Transfer to live agent
- **Analytics** - Track conversations

## Quick Start

```bash
cd hojai-video-agent
npm install
npm run dev
```

## Embed on Website

```html
<script src="https://cdn.hojai.ai/video-agent.js"></script>
<div id="hojai-video-agent" data-api="https://api.hojai.ai"></div>
```

## API

### Start Conversation

```javascript
window.HojaiVideo.start({
  apiUrl: 'https://api.hojai.ai',
  avatar: 'priya',
  language: 'en'
});
```

### Events

```javascript
window.HojaiVideo.on('message', (msg) => {
  console.log('User said:', msg.content);
});

window.HojaiVideo.on('handoff', (data) => {
  console.log('Transfer to agent:', data.agentId);
});
```

## Avatar Options

| Avatar | Voice | Style |
|--------|-------|--------|
| Priya | Alluka | Friendly |
| Arjun | Professional | Professional |
| Sara | Formal | Scientific |

## Integration

Connect to:
- REZ Intelligence (Intent)
- REZ Memory (Context)
- REZ Agents (Actions)
- Hojai VoiceOS (Telecom)
