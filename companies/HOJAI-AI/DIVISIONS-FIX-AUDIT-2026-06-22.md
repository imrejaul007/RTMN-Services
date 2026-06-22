# HOJAI-AI Divisions Fix Audit (2026-06-22)

## Problem

When reorganizing RTMN root `services/` to canonical homes on 2026-06-22,
I moved ~30 services into `companies/HOJAI-AI/divisions/0X-name/...` based
on the Division numbers in their package names. But the **`divisions/` folder
is a strategic/architectural doc-only mirror** — actual services live at
`platform/`, `products/`, `sutar-os/`, etc. The Division CLAUDE.md files
use relative paths like `./services/corpid-service/` which mean
`platform/services/corpid-service/` — NOT `divisions/01-foundation/corpid-service/`.

## Result: 30 services need to be re-homed

From the audit, the divisions/ folders got services that should be at:

| Service | Wrong home (now) | Correct home |
|---|---|---|
| **Division 01 — Foundation** | | |
| `ai-economy` (4175) | `divisions/01-foundation/` | `platform/economy/ai-economy/` |
| `planning-engine` (4154) | `divisions/01-foundation/` | `platform/flow/planning-engine/` |
| `risk-detection-service` | `divisions/01-foundation/` | `platform/trust/risk-detection-service/` |
| **Division 02 — Infrastructure** | | |
| `api-docs-generator` (4171) | `divisions/02-infrastructure-cloud/` | `platform/infra/api-docs-generator/` |
| `billing-apis` (4111) | `divisions/02-infrastructure-cloud/` | `platform/infra/billing-apis/` |
| `centralized-observability` (4153) | `divisions/02-infrastructure-cloud/` | `platform/observability/centralized-observability/` |
| `federation-gateway` (4174) | `divisions/02-infrastructure-cloud/` | `platform/infra/federation-gateway/` |
| `hojai-cli` (4170) | `divisions/02-infrastructure-cloud/` | `platform/infra/hojai-cli/` |
| `mtls-jwt-bridge` (4779) | `divisions/02-infrastructure-cloud/` | `platform/infra/mtls-jwt-bridge/` |
| `observability-apis` (4172) | `divisions/02-infrastructure-cloud/` | `platform/observability/observability-apis/` |
| `plugin-framework` (4780) | `divisions/02-infrastructure-cloud/` | `platform/skills/plugin-framework/` |
| **Division 03 — Intelligence** | | |
| `behavior-intelligence` (4158) | `divisions/03-intelligence-cloud/` | `platform/intelligence/behavior-intelligence/` |
| `company-intelligence-airzy` (4162) | `divisions/03-intelligence-cloud/` | `platform/intelligence/company-intelligence-airzy/` |
| `company-intelligence-karma` (4163) | `divisions/03-intelligence-cloud/` | `platform/intelligence/company-intelligence-karma/` |
| `company-intelligence-nexha` (4159) | `divisions/03-intelligence-cloud/` | `platform/intelligence/company-intelligence-nexha/` |
| `company-intelligence-rendez` (4161) | `divisions/03-intelligence-cloud/` | `platform/intelligence/company-intelligence-rendez/` |
| **Division 04 — Agent Cloud** | | |
| `agent-builder` (4188) | `divisions/04-agent-cloud/` | `platform/intelligence/agent-builder/` |
| `agent-sdk` (4187) | `divisions/04-agent-cloud/` | `platform/intelligence/agent-sdk/` |
| `agent-security` (4186) | `divisions/04-agent-cloud/` | `platform/intelligence/agent-security/` |
| `agent-studio` (4189) | `divisions/04-agent-cloud/` | `platform/intelligence/agent-studio/` |
| `multi-agent-runtime` (4190) | `divisions/04-agent-cloud/` | `platform/intelligence/multi-agent-runtime/` |
| **Division 06 — Data/Knowledge** | | |
| `data-catalog` (4165) | `divisions/06-data-knowledge-cloud/` | `platform/memory/data-catalog/` |
| `feature-store` (4164) | `divisions/06-data-knowledge-cloud/` | `platform/memory/feature-store/` |
| `experiment-tracking` (4781) | `divisions/06-data-knowledge-cloud/` | `platform/memory/experiment-tracking/` |
| `knowledge-distillation` (4167) | `divisions/06-data-knowledge-cloud/` | `platform/memory/knowledge-distillation/` |
| `knowledge-network` (4173) | `divisions/06-data-knowledge-cloud/` | `platform/memory/knowledge-network/` |
| `federated-learning` (4871) | `divisions/07-training-model-platform/` | `platform/training/federated-learning/` |
| **SDKs** | | |
| `sdk-python` (4169) | `companies/HOJAI-AI/sdk-python/` | `companies/HOJAI-AI/sdk-python/` ✅ (already at root) |
| `sdk-typescript` (4168) | `companies/HOJAI-AI/sdk-typescript/` | `companies/HOJAI-AI/sdk-typescript/` ✅ (already at root) |
| **Memory** | | |
| `memory-intelligence-service` | `platform/memory/memory-intelligence-service/` | ✅ (already at canonical home) |

## What to do

Re-homing strategy:
1. **MOVE** each service from `divisions/0X-name/<svc>` to the correct `platform/...` home.
2. **KEEP** the divisions/ folder as a doc-only strategic map (it has CLAUDE.md for each division).
3. **UPDATE** each division's CLAUDE.md to mention the new services in their correct homes.

## Stats

- 30 services need to be moved from `divisions/` to `platform/`
- 0 services need to be moved from `divisions/` to `products/` (Division 08 has no real services yet)
- 0 services need to be moved from `divisions/` to `sutar-os/` (Division 12 already has its own homes)

## Note

After this fix, `divisions/` will contain ONLY `CLAUDE.md` files (one per division) — a strategic doc map. All actual service code will live at `platform/`, `products/`, `sutar-os/`, etc. where it always belonged.

The HOJAI-AI root CLAUDE.md already says: "services are organized by **product** (what users recognize) and **platform** (shared infrastructure), not by technical layer." So the divisions folder was always meant to be a doc-only mirror.
