# CLAUDE.md - HOJAI WhatsApp SDK (@hojai/whatsapp)

> **Package:** `@hojai/whatsapp` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (11/11 tests passing, 0 failures)

## What this SDK is

**The official TypeScript client for the HOJAI WhatsApp Business OS (port 4860).** Wraps provider switching (360dialog / Twilio / Meta), template management, contact CRM, and messaging.

| Sub-client | Purpose | Methods |
|---|---|---|
| `providers` | List + switch active WhatsApp provider | 3 |
| `templates` | Template CRUD + render() (numeric + named placeholders) | 4 + 1 helper |
| `contacts` | Phone-based contact CRM with tags + fields | 5 |
| `messages` | Send + list + conversations + webhook simulation | 5 |

## Architecture

```
@hojai/whatsapp
├── WhatsApp                   # Main client (facade)
│   ├── providers              # ProvidersClient
│   ├── templates              # TemplatesClient
│   ├── contacts               # ContactsClient
│   └── messages               # MessagesClient
├── HojaiConfig                 # Shared config
└── resolveConfig()             # Apply defaults
```

Self-contained — does NOT import from other `@hojai/*` packages. Carries its own copy of `HojaiConfig` + `request()` + `buildQueryString` (~80 LOC).

## Quick Start

```ts
import { WhatsApp } from '@hojai/whatsapp';

const w = new WhatsApp({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. Switch provider
await w.providers.switch('360dialog');

// 2. Create + render + send
const tpl = await w.templates.create({
  name: 'order_shipped', language: 'en', category: 'utility',
  body: 'Hi {{1}}, your order {{2}} shipped!', variables: ['name', 'orderId']
});
const { rendered } = w.templates.render(tpl, { name: 'Maya', orderId: 'ORD-1' });
await w.messages.send({ to: '+919876543210', body: rendered, templateId: tpl.id });

// 3. Get conversation
const conv = await w.messages.getConversation('+919876543210');
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-whatsapp
npm install
npm run build
npm test
```

## Tests (11/11 passing)

- WhatsApp client instantiates with all 4 sub-clients
- ProvidersClient.list
- ProvidersClient.switch
- TemplatesClient.create
- TemplatesClient.render with `{{n}}` placeholders
- TemplatesClient.render with `{{name}}` placeholders
- ContactsClient.create
- MessagesClient.send
- MessagesClient.simulateWebhook
- Retries on 5xx
- Throws on 4xx

## Related

- [@hojai/razor](../hojai-razor/) — multi-channel messaging (broader)
- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Core platform
- [WhatsApp OS service](https://github.com/hojai/whatsapp-os) — the underlying Express service

The SDK family is now **25 deep** with this addition.
