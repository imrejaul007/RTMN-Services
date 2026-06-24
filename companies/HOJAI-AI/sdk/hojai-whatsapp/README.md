# @hojai/whatsapp

> The official TypeScript SDK for the **HOJAI WhatsApp OS** (port 4860). Multi-provider WhatsApp Business API orchestration (360dialog / Twilio / Meta Cloud API), template management, contact CRM, and messaging.

[![npm version](https://img.shields.io/npm/v/@hojai/whatsapp.svg)](https://www.npmjs.com/package/@hojai/whatsapp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What it does

The WhatsApp OS is HOJAI's unified WhatsApp Business API layer. It provides:

- **Provider abstraction** — switch between 360dialog, Twilio, and Meta Cloud API without code changes
- **Template management** — create / list / render templates (supports both `{{1}}` numeric and `{{name}}` named placeholders)
- **Contact CRM** — phone-based contact management with tags + custom fields
- **Messaging** — send templated or free-form messages, retrieve conversation history
- **Webhook simulation** — test inbound webhooks without a real WhatsApp account

## Install

```bash
npm install @hojai/whatsapp
```

## Quick start

```ts
import { WhatsApp } from '@hojai/whatsapp';

const w = new WhatsApp({ apiKey, baseUrl: 'https://api.hojai.ai' });

// 1. Switch provider
await w.providers.switch('360dialog');

// 2. Create a template
const tpl = await w.templates.create({
  name: 'order_shipped',
  language: 'en',
  category: 'utility',
  body: 'Hi {{1}}, your order {{2}} has shipped!',
  variables: ['name', 'orderId']
});

// 3. Render + send
const { rendered } = w.templates.render(tpl, { name: 'Maya', orderId: 'ORD-1' });
await w.messages.send({ to: '+919876543210', body: rendered, templateId: tpl.id });

// 4. Get conversation history
const conv = await w.messages.getConversation('+919876543210');
console.log(conv.messages);
```

## What's inside

4 sub-clients, ~22 methods:

| Sub-client | Purpose | Methods |
|---|---|---|
| `providers` | List + switch active WhatsApp provider | 3 |
| `templates` | Template CRUD + render() (handles `{{1}}` + `{{name}}` placeholders) | 4 + 1 helper |
| `contacts` | Phone-based contact CRM with tags + fields | 5 |
| `messages` | Send + list + getConversation + simulateWebhook | 5 |

## Subpath imports

```ts
import { WhatsApp } from '@hojai/whatsapp';
import { TemplatesClient } from '@hojai/whatsapp/whatsapp';
import type { Template, Message } from '@hojai/whatsapp/types';
```

## Configuration

```ts
const w = new WhatsApp({
  apiKey: 'hojai_live_...',
  baseUrl: 'https://api.hojai.ai',
  timeout: 10_000,        // optional, default 10s
  maxRetries: 3           // optional, default 3
});
```

When `baseUrl` includes `localhost`, sub-clients automatically target port **4860** (the WhatsApp OS port).

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-whatsapp
npm install
npm run build
npm test
```

## See also

- [@hojai/razor](../hojai-razor/) — multi-channel messaging (broader, includes WhatsApp + SMS + email)
- [@hojai/foundation](../hojai-foundation/) — Core platform
- [@hojai/commerce](../hojai-commerce/) — Order management
- [@hojai/genie](../hojai-genie/) — Personal AI (can auto-respond)

The SDK family is now **25 deep**.
