# CLAUDE.md - HOJAI Genie SDK (@hojai/genie)

> **Package:** `@hojai/genie` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (13/13 tests passing, 0 failures)

## What this SDK is

**The official TypeScript client for HOJAI Genie — the personal AI assistant platform.** Wraps the Genie gateway (port 4701) and 22 supporting services into a single ergonomic client organized by user capability. Use this SDK to build personal-AI experiences: capture memories, run morning briefings, manage calendars, search across all Genie data, register voice devices, chat with the personal companion, and resurface random memories via serendipity.

| Sub-client | Purpose | Wraps | Port |
|---|---|---|---|
| `gateway` | Top-level AI query routing + user context + preferences | genie-gateway | 4701 |
| `memory` | Capture / retrieve / search / smart-forget memories | memory-inbox, memory-graph | 4736, 4717 |
| `briefing` | Daily (morning/evening) + weekly briefings | genie-briefing-service | 4712 |
| `calendar` | Events, conflicts, today/upcoming, availability | genie-calendar-service | 4709 |
| `search` | Universal search across all Genie data | genie-universal-search | 4713 |
| `voice` | Wake word ("Hey Genie") + listening modes + devices | wake-word, listening-modes, device-integration | 4767-4769 |
| `companion` | Personal chat + relationships + life goals | companion, relationship-os, life-gps | 4716, 4718, 4721 |
| `assistant` | Shopping + consultant + reasoning | shopping-agent, consultant-agent, thinking-engine | 4728, 4739, 4719 |
| `lifestyle` | Learning + wellness + money + habits + creation + university | 6 services | 4298, 4722-4727 |
| `serendipity` | Random memory resurfacing + smart-forgetting | serendipity, smart-forgetting | 4714, 4715 |

## Architecture

```
@hojai/genie
├── Genie                       # Main client (facade)
│   ├── gateway                 # GatewayClient     — 7 methods
│   ├── memory                  # MemoryClient      — 6 methods
│   ├── briefing                # BriefingClient    — 5 methods
│   ├── calendar                # CalendarClient    — 7 methods
│   ├── search                  # SearchClient      — 9 methods
│   ├── voice                   # VoiceClient       — 9 methods
│   ├── companion               # CompanionClient   — 7 methods
│   ├── assistant               # AssistantClient   — 6 methods
│   ├── lifestyle               # LifestyleClient   — 10 methods
│   └── serendipity             # SerendipityClient — 4 methods
├── HojaiConfig                 # Shared config (apiKey, baseUrl, timeout, maxRetries, fetchImpl, logger)
└── resolveConfig()             # Apply defaults
```

Self-contained — does NOT import from `@hojai/foundation` or `@hojai/sutar`. Each SDK carries its own copy of `HojaiConfig` and the `request()` helper (~60 LOC), so it can be installed and used independently. This mirrors the pattern in `@hojai/sutar` and `@hojai/marketplace`.

## Quick Start

```ts
import { Genie } from '@hojai/genie';

const genie = new Genie({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// Top-level AI query — routes to the right service
const { response } = await genie.gateway.query({ userId: 'u-1', query: "What's on my calendar today?" });

// Daily briefing
const morning = await genie.briefing.today('u-1', 'morning');

// Capture a memory
await genie.memory.capture({ userId: 'u-1', type: 'note', content: 'Met Sarah at HOJAI meetup' });

// Universal search
const hits = await genie.search.universal({ q: 'meetup last week', userId: 'u-1', sources: ['memories'] });

// Register a voice device
await genie.voice.registerDevice({ userId: 'u-1', type: 'phone', name: 'My iPhone', hardwareId: 'UDID-12345' });

// Personal companion chat
const reply = await genie.companion.chat({ userId: 'u-1', message: "I'm feeling stressed today" });

// Random memory resurfacing
const memory = await genie.serendipity.daily('u-1');
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-genie
npm install
npm run build
npm test
```

## Files

```
hojai-genie/
├── CLAUDE.md                    # This file
├── README.md                    # Quick start
├── package.json                 # npm config with subpath exports for 10 sub-clients
├── tsconfig.json
├── src/
│   ├── foundation-config.ts     # HojaiConfig + resolveConfig (copied from hojai-sutar)
│   ├── utils.ts                 # request() with retries, timeout, backoff, buildQueryString (copied)
│   ├── gateway.ts               # GatewayClient (7 methods)
│   ├── memory.ts                # MemoryClient (6 methods)
│   ├── briefing.ts              # BriefingClient (5 methods)
│   ├── calendar.ts              # CalendarClient (7 methods)
│   ├── search.ts                # SearchClient (9 methods)
│   ├── voice.ts                 # VoiceClient (9 methods)
│   ├── companion.ts             # CompanionClient (7 methods)
│   ├── assistant.ts             # AssistantClient (6 methods)
│   ├── lifestyle.ts             # LifestyleClient (10 methods)
│   ├── serendipity.ts           # SerendipityClient (4 methods)
│   ├── index.ts                 # Main Genie class + re-exports
│   └── __tests__/index.test.ts  # 13 tests
└── dist/                        # Compiled output
```

## Tests (13/13 passing)

- Genie client instantiates with all 10 sub-clients
- GatewayClient.query
- MemoryClient.capture
- BriefingClient.today
- CalendarClient.today
- SearchClient.universal
- VoiceClient.registerDevice
- CompanionClient.chat
- AssistantClient.shopping
- LifestyleClient.logWellness
- SerendipityClient.daily
- Retries on 5xx (calls mock 3 times before success)
- Throws on 4xx

## Related

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Core platform client
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agent runtime SDK
- [@hojai/nexha](../hojai-nexha/CLAUDE.md) — Nexha federation network SDK
- [@hojai/marketplace](../hojai-marketplace/CLAUDE.md) — BAM marketplace SDK
- [Genie Product Docs](../../products/genie/) — the 23 underlying services wrapped here
