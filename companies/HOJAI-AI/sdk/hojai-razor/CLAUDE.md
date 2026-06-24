# CLAUDE.md - HOJAI Razor SDK (@hojai/razor)

> **Package:** `@hojai/razor` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (12/12 tests passing, 0 failures)

## What this SDK is

**The official TypeScript client for the HOJAI RAZO Keyboard Communication OS (port 4725).** RAZO Keyboard is the "keyboard that thinks" — transforms text input into actionable intents, routes them across 24 industry operating systems, and manages multi-channel messaging.

| Sub-client | Purpose | Wraps | Methods |
|---|---|---|---|
| `intents` | Intent Router: detect, parse, validate, execute from text | `/api/intents/*` | 5 |
| `messages` | Multi-channel messaging: send, schedule, broadcast, template | `/api/messages/*` | 9 |
| `channels` | Channel connectivity: list, create, verify, per-channel send | `/api/channels/*` | 11 |
| `sessions` | Multi-turn conversation sessions with context | `/api/sessions/*` | 7 |

## Architecture

```
@hojai/razor
├── Razor                       # Main client (facade)
│   ├── intents                 # IntentRouterClient    — 5 methods
│   ├── messages                # MessagesClient        — 9 methods
│   ├── channels                # ChannelsClient        — 11 methods
│   └── sessions                # SessionsClient        — 7 methods
├── HojaiConfig                 # Shared config (apiKey, baseUrl, timeout, maxRetries, fetchImpl, logger)
└── resolveConfig()             # Apply defaults
```

Self-contained — does NOT import from other `@hojai/*` packages. Each SDK carries its own copy of `HojaiConfig` and the `request()` + `buildQueryString` helpers (~80 LOC), so it can be installed and used independently.

## Quick Start

```ts
import { Razor } from '@hojai/razor';

const razor = new Razor({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. One-call: text in, intent out (and executed)
const result = await razor.intents.handleText('Order a pizza from Dominoes', 'u-1');

// 2. Send a WhatsApp message
await razor.messages.send({ channelId: 'ch-wa-1', to: '+91...', body: 'Hi!' });

// 3. Multi-turn conversation
const session = await razor.sessions.create({ userId: 'u-1', channelId: 'ch-1' });
await razor.sessions.sendMessage(session.id, { body: 'I want to book a flight' });
await razor.sessions.sendMessage(session.id, { body: 'For next Friday' });
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-razor
npm install
npm run build
npm test
```

## Files

```
hojai-razor/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── foundation-config.ts
│   ├── utils.ts
│   ├── types.ts
│   ├── intents.ts
│   ├── messages.ts
│   ├── channels.ts
│   ├── sessions.ts
│   ├── index.ts
│   └── __tests__/index.test.ts
└── dist/
```

## Tests (12/12 passing)

- Razor client instantiates with all 4 sub-clients
- IntentRouterClient.detect
- MessagesClient.send
- MessagesClient.broadcast with recipients array
- ChannelsClient.list
- ChannelsClient.sendWhatsApp (per-channel helper)
- SessionsClient.create
- SessionsClient.sendMessage
- Intents.handleText: low confidence is skipped
- Intents.handleText: high confidence runs full pipeline (detect→parse→validate→execute)
- Retries on 5xx
- Throws on 4xx

## Related

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Core platform
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — Agents (intents route to these)
- [@hojai/industry](../hojai-industry/CLAUDE.md) — 26 verticals (intents route here)
- [@hojai/department](../hojai-department/CLAUDE.md) — 9 horizontals (intents route here)
- [@hojai/genie](../hojai-genie/CLAUDE.md) — Personal AI (intents route here too)
- [RAZO Keyboard service](https://github.com/hojai/razo-keyboard) — the underlying Express service

## Why this matters

RAZO is the **Communication OS** of the HOJAI platform — every text input from any HOJAI app (DO App, genie, agents) gets routed through it. Without an SDK, every integration had to re-implement the intent router client. Now there's one canonical client that all HOJAI apps can use.

The SDK family is now **23 deep** with this addition.
