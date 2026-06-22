# REZ-Workspace Dedup List

> **Date:** 2026-06-22
> **Purpose:** Identify items in `companies/REZ-Workspace/` that are duplicates of canonical HOJAI AI. **NOT YET DELETED** — list for review.
> **Constraint:** Per user: "don't lose anything" — do not delete without explicit user approval.

## What This List Is

A scan of REZ-Workspace against canonical HOJAI AI found **34 direct duplicates** (matched by directory name). The items here are the ones that should be considered for **deletion from REZ-Workspace** after user approval. Each item has a clear canonical home.

**DO NOT delete anything until user says so explicitly.**

---

## A. Duplicates Already Imported into Canonical HOJAI AI (today, 2026-06-22)

These 5 products were **just copied** into canonical HOJAI AI from REZ-Workspace. The REZ-Workspace originals can be deleted:

| REZ-Workspace Path | Canonical Home | Notes |
|--------------------|----------------|-------|
| `products/hojai-whatsapp-ai/` | `companies/HOJAI-AI/products/hojai-whatsapp-ai/` | 320K, real code |
| `products/brandpulse/` | `companies/HOJAI-AI/products/brandpulse/` | 484K, real code |
| `products/brandpulse-dashboard/` | `companies/HOJAI-AI/products/brandpulse-dashboard/` | 232K, real code |
| `products/energy-os/` | `companies/HOJAI-AI/products/energy-os/` | 92K, real code |
| `companies/hojai-ai/HOJAI-VOICE-PLATFORM/` | `companies/HOJAI-AI/products/voice-os/core/HOJAI-VOICE-PLATFORM/` | 968K, real code |
| `companies/hojai-ai/hojai-voice-os/` | `companies/HOJAI-AI/products/voice-os/frontend/hojai-voice-os/` | 60K, Next.js |
| `companies/hojai-ai/hojai-voice-commerce/` | `companies/HOJAI-AI/products/voice-os/backend/voice-commerce/` | 60K, Express |
| `companies/hojai-ai/voice-training/` | `companies/HOJAI-AI/products/voice-os/training/voice-training/` | 272K, Python |
| `companies/hojai-ai/services/voice-ai-service/` | `companies/HOJAI-AI/products/voice-os/ai/voice-ai-service/` | 340K, real code |
| `companies/hojai-ai/services/hojai-voice-os/` | (stubs, 16K each, no value) | scaffold |
| `companies/hojai-ai/services/hojai-voice-commerce/` | (stubs, 16K each, no value) | scaffold |
| `companies/hojai-ai/services/hojai-voice-sdk/` | (stub, 16K) | scaffold |

---

## B. Duplicates with Clear Canonical Homes (NOT yet imported)

### B.1 Top-level `services/`

| REZ-Workspace | Canonical | Notes |
|---------------|-----------|-------|
| `services/agent-twin/` | `companies/HOJAI-AI/platform/twins/agent-twin/` | newer canonical |
| `services/area-twin/` | `companies/HOJAI-AI/platform/twins/area-twin/` | newer canonical |
| `services/buyer-twin/` | `companies/HOJAI-AI/platform/twins/buyer-twin/` | newer canonical |
| `services/corpid-service/` | `companies/HOJAI-AI/platform/identity/corpid-service/` | scaffold duplicate |
| `services/deal-twin/` | `companies/HOJAI-AI/platform/twins/deal-twin/` | newer canonical |
| `services/decision-engine/` | `companies/HOJAI-AI/platform/flow/decision-engine/` | newer canonical |
| `services/energy-os/` | (NEW — just imported to `products/energy-os/`) | keep canonical |
| `services/goal-os/` | `companies/HOJAI-AI/platform/salar-os/goal-os/` | newer canonical |
| `services/memory-os/` | `companies/HOJAI-AI/platform/memory/memory-os/` | newer canonical |
| `services/property-twin/` | `companies/HOJAI-AI/platform/twins/property-twin/` | newer canonical |
| `services/referral-twin/` | `companies/HOJAI-AI/platform/twins/referral-twin/` | newer canonical |
| `services/twinos-hub/` | `companies/HOJAI-AI/platform/twins/twinos-hub/` | newer canonical |

### B.2 Industry-OS duplicates (REZ-Workspace `services/`)

These 14 industry-OS duplicates have canonical homes in `industry-os/services/`:

| REZ-Workspace | Canonical |
|---------------|-----------|
| `services/automotive-os/` | `industry-os/services/automotive-os/` |
| `services/beauty-os/` | `industry-os/services/beauty-os/` |
| `services/education-os/` | `industry-os/services/education-os/` |
| `services/fitness-os/` | `industry-os/services/fitness-os/` |
| `services/healthcare-os/` | `industry-os/services/healthcare-os/` |
| `services/hospitality-os/` | (canonical: `industry-os/services/restaurant-os/`) |
| `services/hotel-os/` | `industry-os/services/hotel-os/` |
| `services/legal-os/` | `industry-os/services/legal-os/` |
| `services/manufacturing-os/` | `industry-os/services/manufacturing-os/` |
| `services/media-os/` | `industry-os/services/media-os/` |
| `services/realestate-os/` | `industry-os/services/realestate-os/` |
| `services/restaurant-os/` | `industry-os/services/restaurant-os/` |
| `services/retail-os/` | `industry-os/services/retail-os/` |

### B.3 Top-level `platform/`

| REZ-Workspace | Canonical | Notes |
|---------------|-----------|-------|
| `platform/rtmn-hub/` | `services/unified-os-hub/` | newer canonical |
| `platform/agentos-hub/` | (eval — possibly unique) | KEEP, evaluate |

### B.4 `companies/hojai-ai/services/`

| REZ-Workspace | Canonical | Notes |
|---------------|-----------|-------|
| `companies/hojai-ai/services/genie-briefing-service/` | `companies/HOJAI-AI/products/genie/genie-briefing-service/` | scaffold duplicate |
| `companies/hojai-ai/services/genie-calendar-service/` | `companies/HOJAI-AI/products/genie/genie-calendar-service/` | scaffold duplicate |
| `companies/hojai-ai/services/genie-wake-word-service/` | `companies/HOJAI-AI/products/genie/genie-wake-word-service/` | scaffold duplicate |
| `companies/hojai-ai/services/incident-management-service/` | `companies/HOJAI-AI/divisions/04-agent-cloud/incident-management-service/` | newer canonical |
| `companies/hojai-ai/services/voice-ai-service/` | (NEW — just imported to `products/voice-os/ai/`) | keep canonical |

### B.5 `companies/hojai-ai/` (top-level by-name matches)

These are by-name matches but the contents are scaffold/meta packages — evaluate carefully:

| REZ-Workspace | Canonical | Notes |
|---------------|-----------|-------|
| `companies/hojai-ai/RAZO-Keyboard/` | `companies/HOJAI-AI/products/razo/razo-keyboard/` | newer canonical |
| `companies/hojai-ai/docs/` | (multiple canonical locations) | scaffold meta |
| `companies/hojai-ai/genie/` | `companies/HOJAI-AI/products/genie/` | newer canonical (16 sub-services) |
| `companies/hojai-ai/genie-briefing-service/` | `companies/HOJAI-AI/products/genie/genie-briefing-service/` | newer canonical |
| `companies/hojai-ai/hojai-voice-os/` | (NEW — just imported) | keep canonical |
| `companies/hojai-ai/models/` | (eval — possibly unique) | KEEP, evaluate |
| `companies/hojai-ai/products/` | (eval) | KEEP, evaluate |
| `companies/hojai-ai/scripts/` | (eval) | KEEP, evaluate |
| `companies/hojai-ai/services/` | (eval) | KEEP, evaluate |
| `companies/hojai-ai/tests/` | (eval) | KEEP, evaluate |
| `companies/hojai-ai/voice-training/` | (NEW — just imported) | keep canonical |

---

## C. Items That Are SCAFFOLD-Only (16K stubs, no real code)

These were found by name but the contents are just `Dockerfile`, `package.json`, `docker-compose.yml` — no real code. Even if not duplicates, they have no production value.

| Path | Why no value |
|------|--------------|
| `companies/hojai-ai/services/hojai-voice-os/` | 16K stub |
| `companies/hojai-ai/services/hojai-voice-commerce/` | 16K stub |
| `companies/hojai-ai/services/hojai-voice-sdk/` | 16K stub |
| `companies/hojai-ai/voice-ecosystem/` | 16K, just Docker config |

---

## D. Items That Are UNIQUELY VALUABLE (NOT duplicates)

These 282 items are in REZ-Workspace but not in canonical HOJAI AI. **Do not delete** — they may be candidates for evaluation/import:

- 200+ AI agent services in `companies/hojai-ai/` (mostly scaffold)
- 30+ unique Genie services
- 14 industry-OS stubs (mostly duplicates, see B.2)
- Various finance-* AI employees
- HOJAI-VOICE-PLATFORM subdirs (some duplicate, see A)
- 20+ employees (digital employee profiles)

See `/tmp/rez-dedup.json` for the full list of unique items.

---

## Recommended Cleanup Order (after user approval)

1. **Phase 1 (Safe)**: Delete scaffold-only stubs (Section C) — zero value, no real code
2. **Phase 2 (Easy)**: Delete the 9 just-imported items from REZ-Workspace (Section A)
3. **Phase 3 (Medium)**: Delete top-level `services/` duplicates of canonical (B.1, B.2)
4. **Phase 4 (Careful)**: Delete `companies/hojai-ai/services/` and `platform/` duplicates (B.3, B.4, B.5)
5. **Phase 5 (Optional)**: Evaluate unique items (Section D), import worthy ones to canonical, delete the rest

**Each phase requires explicit user approval before deletion.**

---

*Last Updated: 2026-06-22*
*See [REZ-WORKSPACE-AUDIT.md](REZ-WORKSPACE-AUDIT.md) for the parent audit.*
