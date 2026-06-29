# Slack Connector

Send messages, manage channels, interactive UIs.

## Setup

```bash
npm install
```

## Usage

```javascript
const Slack = require('./src/index');

const slack = new Slack({
  botToken: 'xoxb-xxx'
});
```

## Send Message

```javascript
await slack.sendMessage('#sales', 'New lead!');
```

## Methods

| Method | Description |
|--------|-------------|
| `sendMessage(channel, text)` | Send to channel |
| `dm(userId, text)` | Direct message |
| `listChannels()` | All channels |
| `createChannel(name)` | Create new |
| `scheduleMessage()` | Schedule |
| `uploadFile()` | File upload |

## Interactive Blocks

```javascript
slack.buildRichMessage([
  { text: '*Lead Qualified*', fields: ['Score: 85/100'] }
]);
```
