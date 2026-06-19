# SkillOS - The Universal Capability Platform

**Version:** 1.0.0
**Port:** 4743
**Status:** ✅ RUNNING | June 19, 2026

---

## Overview

**SkillOS** is one of the **3 foundational pillars of HOJAI AI**:

```
TwinOS   (4705) = Identity & Representation    "What am I?"
MemoryOS (4703) = Knowledge & Experience      "What do I know?"
SkillOS  (4743) = Capability Layer            "What can I do?"    ← you are here
```

SkillOS is the registry, runtime, and marketplace for **every AI capability** in the RTMN ecosystem. Genie, CoPilot, Sutar, Industry AI, and custom AIs all use SkillOS to find and execute skills.

---

## 20 Features (per HOJAI 3-pillar spec)

| # | Feature | Endpoint | Status |
|---|---------|----------|--------|
| 1 | Skill Registry | `POST/GET/PUT/DELETE /api/skills` | ✅ |
| 2 | Skill Runtime | `POST /api/skills/:id/execute` | ✅ |
| 3 | Skill Discovery | `GET /api/skills/discover` | ✅ |
| 4 | Skill Marketplace | `POST/GET /api/skills/marketplace` | ✅ |
| 5 | Skill Composition | `POST /api/skills/compose` | ✅ |
| 6 | Skill Learning | `POST/GET /api/skills/:id/learn` | ✅ |
| 7 | Skill Versioning | `POST/GET /api/skills/:id/versions` | ✅ |
| 8 | Skill Permissions | `POST/GET /api/skills/:id/permissions` | ✅ |
| 9 | Skill Analytics | `GET /api/skills/:id/analytics`, `GET /api/analytics` | ✅ |
| 10 | Skill Templates | `POST/GET /api/skill-templates`, `POST /api/skill-templates/:id/instantiate` | ✅ |
| 11 | Skill Dependencies | `POST/GET /api/skills/:id/dependencies` | ✅ |
| 12 | Skill Events | `GET /api/skills/:id/events`, `GET /api/skill-events` | ✅ |
| 13 | Skill Policies | `PUT /api/skills/:id/policies` | ✅ |
| 14 | Skill Memory Integration | `POST /api/skills/:id/memory` | ✅ (proxy to MemoryOS:4703) |
| 15 | Skill Twin Integration | `POST /api/skills/:id/twin` | ✅ (proxy to TwinOS:4705) |
| 16 | Skill Flow Integration | `POST /api/skills/:id/flow` | ✅ (proxy to FlowOS:4310) |
| 17 | Skill AI Integration | (used by Genie, CoPilot, Sutar, etc.) | ✅ |
| 18 | Skill Testing | `POST/GET /api/skills/:id/test` | ✅ |
| 19 | Skill Monitoring | `GET /api/skills/:id/monitoring` | ✅ |
| 20 | Skill SDK | (via OpenAPI / JSON schema) | ✅ |

---

## 6 Pre-seeded Skill Categories

| Category | Example Skill |
|----------|---------------|
| AI | Reasoning |
| Commerce | Search Product |
| Business | CRM Lookup |
| Productivity | Calendar |
| Communication | WhatsApp Send |
| Industry | Restaurant Booking |

---

## Quick Start

```bash
cd services/skill-os
npm install
npm start

# Health check
curl http://localhost:4743/health

# Discover skills
curl 'http://localhost:4743/api/skills/discover?q=reasoning'

# Execute a skill
curl -X POST http://localhost:4743/api/skills/sk-reasoning/execute \
  -H "Content-Type: application/json" \
  -d '{"input": "What is 2+2?"}'
```

---

## Architecture

```
services/skill-os/
├── package.json      # ESM module
├── CLAUDE.md
└── src/
    └── index.js      # Full implementation (in-memory)
```

**Pattern:** in-memory `Map` (matches TwinOS, MemoryOS, SUTAR services)

---

## Relationship to Other Pillars

```
                    CorpID (4702)
                       │
             Universal Identity
                       │
                       ▼
                    TwinOS
       (Who am I? What entity am I?)
                       │
                       ▼
                  MemoryOS
       (What do I know and remember?)
                       │
                       ▼
                   SkillOS  ← you are here
       (What am I capable of doing?)
                       │
                       ▼
                    FlowOS
       (How do I combine skills into workflows?)
                       │
                       ▼
                   PolicyOS
       (What am I allowed to do? Under what rules?)
                       │
                       ▼
              Genie • CoPilot • Sutar
                       │
                 Applications
```

---

*Last Updated: June 19, 2026*
