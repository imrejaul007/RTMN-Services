# @hojai/genie

> The official TypeScript SDK for **HOJAI Genie** — the personal AI assistant platform. Wraps the Genie gateway + 22 supporting services into a single ergonomic client.

[![npm version](https://img.shields.io/npm/v/@hojai/genie.svg)](https://www.npmjs.com/package/@hojai/genie)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Genie is the personal AI that knows you — captures memories, manages your calendar, briefs you every morning, takes voice commands from any device, helps you shop, think, learn, and reflects the right memory back at the right moment. This SDK is the TypeScript client for building on top of the Genie platform.

## Install

```bash
npm install @hojai/genie
```

## Quick start

```ts
import { Genie } from '@hojai/genie';

const genie = new Genie({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Top-level AI query — routes to the right service
const { response } = await genie.gateway.query({
  userId: 'u-1',
  query: "What's on my calendar today?"
});

// 2. Daily briefing
const morning = await genie.briefing.today('u-1', 'morning');

// 3. Capture a memory
await genie.memory.capture({
  userId: 'u-1',
  type: 'note',
  content: 'Met Sarah at HOJAI meetup',
  tags: ['conference', 'sarah']
});

// 4. Universal search across all Genie data
const hits = await genie.search.universal({
  q: 'meetup last week',
  userId: 'u-1',
  sources: ['memories', 'calendar']
});

// 5. Register a voice device
await genie.voice.registerDevice({
  userId: 'u-1', type: 'phone', name: 'My iPhone',
  hardwareId: 'UDID-12345'
});

// 6. Switch to smart listening mode
await genie.voice.setMode('u-1', {
  mode: 'smart', enabled: true, context: 'always', sensitivity: 0.7
});

// 7. Personal companion chat
const reply = await genie.companion.chat({
  userId: 'u-1', message: "I'm feeling stressed today"
});

// 8. Shopping assistant
const products = await genie.assistant.shopping({
  userId: 'u-1', query: 'organic cotton t-shirts under $20'
});

// 9. Consultant for a domain question
const advice = await genie.assistant.ask({
  userId: 'u-1', domain: 'tax', question: 'Can I deduct home office?'
});

// 10. Random memory resurfacing
const memory = await genie.serendipity.daily('u-1');
```

## What's inside

10 sub-clients, wrapping 23 underlying services, organized by user capability:

| Sub-client | Wraps service(s) | Port(s) | Methods |
|---|---|---|---|
| `gateway` | genie-gateway | 4701 | 7 (query, getContext, getPreferences, updatePreferences, getTwins, broadcast, listServices) |
| `memory` | genie-memory-inbox, genie-memory-graph | 4736, 4717 | 6 (capture, list, get, search, remove, smartForget) |
| `briefing` | genie-briefing-service | 4712 | 5 (today, morning, evening, weekly, history) |
| `calendar` | genie-calendar-service | 4709 | 7 (listEvents, getEvent, getDay, today, upcoming, conflicts, availability, createEvent) |
| `search` | genie-universal-search | 4713 | 9 (universal, memories, semantic, recent, save, listSaved, unsave, suggestions, trending) |
| `voice` | genie-wake-word, genie-listening-modes, genie-device-integration | 4767, 4768, 4769 | 9 (listDetections, getDetection, logDetection, getMode, listModes, setMode, registerDevice, listDevices, removeDevice) |
| `companion` | genie-companion, genie-relationship-os, genie-life-gps | 4716, 4718, 4721 | 7 (chat, getSession, getDashboard, listRelationships, upsertRelationship, listGoals, upsertGoal) |
| `assistant` | genie-shopping-agent, genie-consultant-agent, genie-thinking-engine | 4728, 4739, 4719 | 6 (shopping, trackOrder, orderHistory, ask, listConsultations, analyze) |
| `lifestyle` | genie-learning-os, genie-wellness-os, genie-money-os, genie-execution-engine, genie-creation-os, genie-life-university | 4298, 4722-4727 | 10 (listLearningPaths, startLearningPath, logWellness, listWellness, recordTransaction, listTransactions, listHabits, completeHabit, create, university) |
| `serendipity` | genie-serendipity, genie-smart-forgetting | 4714, 4715 | 4 (daily, history, timeBased, smartForget) |

## Subpath imports

For tree-shaking and smaller bundles:

```ts
import { GatewayClient } from '@hojai/genie/gateway';
import { MemoryClient } from '@hojai/genie/memory';
```

## Configuration

```ts
const genie = new Genie({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 10_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional, for testing/proxies
  logger: (level, msg, meta) => {}  // optional
});
```

## Error handling

```ts
try {
  await genie.memory.get('missing');
} catch (err) {
  // err.message = "HTTP 404: ..."
  // SDK retries 5xx automatically (up to maxRetries)
  // SDK throws on 4xx immediately
}
```

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-genie
npm install
npm run build
npm test
```

## See also

- [@hojai/foundation](../hojai-foundation/) — CorpID, Memory, Twin, Trust, Flow, Policy
- [@hojai/sutar](../hojai-sutar/) — SUTAR agent runtime
- [@hojai/nexha](../hojai-nexha/) — Nexha federation network
- [@hojai/marketplace](../hojai-marketplace/) — BAM marketplace
- [Genie Product Docs](../../products/genie/) — the 23 underlying services
