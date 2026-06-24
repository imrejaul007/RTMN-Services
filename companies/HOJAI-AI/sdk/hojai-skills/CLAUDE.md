# @hojai/skills — SkillOS SDK

> **Package:** `@hojai/skills` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** ✅ **PRODUCTION-READY** — Wraps SkillOS + 4 skill-adjacent services into one client.

---

## What this SDK is

**The official client for the HOJAI Skill Layer.** Skills are reusable capabilities that any HOJAI agent can discover, install, compose, and execute. The skill layer also includes the Skill Marketplace, Prompt Manager, Workflow Marketplace, and Translation OS.

Any developer building capability-rich AI agents on HOJAI should use this SDK.

It handles:
- HTTP transport (retries, timeouts, exponential backoff)
- Authentication
- Error handling
- TypeScript types for every entity (Skill, PromptTemplate, Workflow, TranslationResult, Glossary)
- Subpath exports for tree-shaking

---

## Quick Start

```ts
import { Skills } from '@hojai/skills';

const s = new Skills({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Discover a skill semantically
const results = await s.os.semanticSearch({ q: 'translate Hindi to English' });

// 2. Create + version a prompt template
const tpl = await s.prompts.create({
  slug: 'welcome',
  name: 'Welcome',
  content: 'Hi {{name}}!',
  variables: ['name']
});
await s.prompts.publishVersion('welcome', {
  content: 'Hi {{name}}, welcome!',
  notes: 'add comma'
});

// 3. Install a skill from the marketplace
await s.marketplace.install('skill-123');

// 4. Deploy a workflow
const dep = await s.workflows.deploy('wf-onboard-customer');

// 5. Translate with glossary
const translation = await s.translation.translate({
  text: 'Hello',
  sourceLang: 'en',
  targetLang: 'es',
  glossaryId: 'gl-1'
});

// 6. Execute a skill
const result = await s.os.execute('translate-hi-en', { text: 'नमस्ते' });
```

---

## Sub-Clients (5 total)

| Sub-client | Service | Port | Purpose |
|---|---|---|---|
| `s.os` | SkillOS | 4743 | Capability registry + skill execution + composition + semantic discovery |
| `s.marketplace` | Skill Marketplace | 4120 | Discovery + install + review for marketplace-published skills |
| `s.prompts` | Prompt Manager | 4771 | Versioned prompt templates with A/B test variants |
| `s.workflows` | Workflow Marketplace | 4938 | Pre-built multi-step workflows that compose multiple skills |
| `s.translation` | Translation OS | 4866 | Multi-provider translation (DeepL, Google, Azure) + glossaries |

---

## Subpath Imports

```ts
import { SkillOsClient } from '@hojai/skills/os';
import { SkillMarketplaceClient } from '@hojai/skills/marketplace';
import { PromptManagerClient } from '@hojai/skills/prompts';
import { WorkflowMarketplaceClient } from '@hojai/skills/workflows';
import { TranslationClient } from '@hojai/skills/translation';
import type { Skill, PromptTemplate, Workflow, TranslationResult } from '@hojai/skills/types';
```

---

## Architecture

```
@hojai/skills
├── Skills                          # Main client (facade)
│   ├── os                          # SkillOsClient          — capability registry + execution
│   ├── marketplace                 # SkillMarketplaceClient — discovery + install
│   ├── prompts                     # PromptManagerClient    — versioned prompts
│   ├── workflows                   # WorkflowMarketplaceClient — multi-step workflows
│   └── translation                 # TranslationClient      — multi-provider translation
├── HojaiConfig                      # Shared config interface
├── resolveConfig()                  # Apply defaults
└── request()                        # HTTP with retries + backoff
```

Built on `@hojai/foundation`'s `HojaiConfig` pattern (same as all other `@hojai/*` SDKs).

---

## Configuration

```ts
const s = new Skills({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 15_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional, for testing/proxies
  logger: (level, msg, meta) => {}  // optional
});
```

---

## Constants

| Constant | Value | Description |
|---|---|---|
| `SKILL_PORTS.os` | 4743 | SkillOS port |
| `SKILL_PORTS.marketplace` | 4120 | Skill Marketplace port |
| `SKILL_PORTS.prompts` | 4771 | Prompt Manager port |
| `SKILL_PORTS.workflows` | 4938 | Workflow Marketplace port |
| `SKILL_PORTS.translation` | 4866 | Translation OS port |

---

## Skill Categories

SkillOS organizes skills into categories:

| Category | Examples |
|---|---|
| `communication` | Send email, Slack message, SMS, WhatsApp |
| `translation` | Multi-provider translation, language detection |
| `data` | SQL queries, API calls, ETL, scraping |
| `reasoning` | Math, logic, analysis, summarization |
| `creative` | Image generation, copywriting, music |
| `commerce` | Payment, refund, invoice generation |
| `integration` | Connect to external APIs (CRM, ERP, etc.) |
| `workflow` | Multi-step orchestration |
| `domain` | Industry-specific (legal, medical, financial) |
| `utility` | File I/O, date/time, formatting |

---

## Use Cases

**Build an agent that auto-translates customer support tickets:**
```ts
const detected = await s.translation.detectLanguage('नमस्ते, I have a problem with my order');
const translation = await s.translation.translate({
  text: ticketBody,
  sourceLang: detected.lang,
  targetLang: 'en',
  glossaryId: 'gl-support-terms'
});
```

**Build a prompt-management workflow with versioning:**
```ts
const v1 = await s.prompts.create({ slug: 'customer-email', content: 'Hi {{name}}!' });
const v2 = await s.prompts.publishVersion('customer-email', { content: 'Hi {{name}}, hope you are well!' });
const rolled = await s.prompts.rollback('customer-email', { toVersion: v1.version });
```

**Build a workflow-based customer onboarding:**
```ts
const dep = await s.workflows.deploy('wf-onboard-customer');
const run = await s.workflows.execute(dep.id, { customerId: 'c-1' });
```

---

## Build

```bash
npm install
npm run build
npm test
```

---

## Files

```
hojai-skills/
├── CLAUDE.md                    # This file
├── README.md                    # Quick start
├── package.json                 # npm config with subpath exports
├── tsconfig.json
├── src/
│   ├── foundation-config.ts     # HojaiConfig + resolveConfig
│   ├── utils.ts                 # request, buildQueryString
│   ├── types.ts                 # SKILL_PORTS, Skill, SkillCategory, …
│   ├── os.ts                    # SkillOsClient (port 4743)
│   ├── marketplace.ts           # SkillMarketplaceClient (port 4120)
│   ├── prompts.ts               # PromptManagerClient (port 4771)
│   ├── workflows.ts             # WorkflowMarketplaceClient (port 4938)
│   ├── translation.ts           # TranslationClient (port 4866)
│   ├── index.ts                 # Main Skills facade
│   └── __tests__/
│       └── index.test.ts        # Tests
└── dist/                        # Compiled output
    ├── index.{js,mjs,d.ts}
    ├── os.{js,mjs,d.ts}
    ├── marketplace.{js,mjs,d.ts}
    ├── prompts.{js,mjs,d.ts}
    ├── workflows.{js,mjs,d.ts}
    ├── translation.{js,mjs,d.ts}
    ├── types.{js,mjs,d.ts}
    └── __tests__/index.test.js
```

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Base SDK
- [@hojai/skillos](../hojai-skillos/CLAUDE.md) — Companion SDK for the SkillOS capability graph (placeholder, planned)
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agents (consume skills for capability execution)
- [SkillOS Documentation](../../../companies/HOJAI-AI/platform/skills/skill-os/CLAUDE.md) — Full SkillOS architecture