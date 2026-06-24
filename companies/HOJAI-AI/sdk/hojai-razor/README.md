# @hojai/razor

> The official TypeScript SDK for the **HOJAI RAZO Keyboard Communication OS** (port 4299). The "keyboard that thinks" — transforms text input into actionable intents, routes them across 24 industry operating systems, and manages multi-channel messaging.

[![npm version](https://img.shields.io/npm/v/@hojai/razor.svg)](https://www.npmjs.com/package/@hojai/razor)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

RAZO Keyboard is the **Communication OS** for the HOJAI ecosystem. Every text input — typed in DO App, in a chat, on a form — is parsed by RAZO into an intent, validated, and routed to the right Department/Industry OS or SUTAR agent. RAZO also manages:

- **Multi-channel messaging** — WhatsApp, Telegram, SMS, email, push, web
- **Conversation sessions** — multi-turn state with accumulated context
- **Channel connectivity** — verify, activate/deactivate, per-channel send helpers

This SDK wraps all of it into 4 ergonomic sub-clients.

## Install

```bash
npm install @hojai/razor
```

## Quick start

```ts
import { Razor } from '@hojai/razor';

const razor = new Razor({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. One-call: user says something, the right agent executes it
const result = await razor.intents.handleText('Order a pizza from Dominoes', 'u-1');
console.log(result.intent.name);   // 'order_food'
console.log(result.executed?.status); // 'completed'

// 2. Send a WhatsApp message
await razor.messages.send({
  channelId: 'ch-wa-1',
  to: '+919876543210',
  body: 'Hi from HOJAI!'
});

// 3. Track a conversation session across turns
const session = await razor.sessions.create({ userId: 'u-1', channelId: 'ch-1' });
await razor.sessions.sendMessage(session.id, { body: 'I want to book a flight to Delhi' });
await razor.sessions.sendMessage(session.id, { body: 'For next Friday' });
// Session context now has: { destination: 'Delhi', date: 'next Friday' }
```

## What's inside

4 sub-clients, ~40 methods total:

| Sub-client | Wraps | Purpose | Methods |
|---|---|---|---|
| `intents` | Intent Router | Detect, parse, validate, execute intents from text | 5 |
| `messages` | Multi-channel messages | Send, schedule, broadcast, template, render | 9 |
| `channels` | Connectivity | List, create, activate, verify, per-channel send | 11 |
| `sessions` | Conversation state | Multi-turn sessions with accumulated context | 7 |

## Subpath imports

For tree-shaking and smaller bundles:

```ts
import { IntentRouterClient } from '@hojai/razor/intents';
import { MessagesClient } from '@hojai/razor/messages';
import { ChannelsClient } from '@hojai/razor/channels';
import { SessionsClient } from '@hojai/razor/sessions';
```

## Configuration

```ts
const razor = new Razor({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 10_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional
  logger: (level, msg, meta) => {}  // optional
});
```

When `baseUrl` includes `localhost`, sub-clients automatically target port **4299** (the RAZO Keyboard port). For production, point `baseUrl` at your HOJAI Cloud gateway.

## Error handling

```ts
try {
  await razor.intents.detect({ text: 'x' });
} catch (err) {
  // err.message = "HTTP 404: ..."
  // SDK retries 5xx automatically (up to maxRetries)
  // SDK throws on 4xx immediately
}
```

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-razor
npm install
npm run build
npm test
```

## See also

- [RAZO Keyboard service](https://github.com/hojai/razo-keyboard) — the underlying Express service
- [@hojai/foundation](../hojai-foundation/) — CorpID, Memory, Twin, Trust, Flow, Policy
- [@hojai/industry](../hojai-industry/) — 26 vertical Industry OSes (intents route here)
- [@hojai/department](../hojai-department/) — 9 horizontal Department OSes (intents route here)
- [@hojai/genie](../hojai-genie/) — Personal AI (intents route here too)

The SDK family is now **23 deep**.
