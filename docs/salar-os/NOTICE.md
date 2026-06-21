# ⚠️ DEPRECATED — This documentation is OUT OF DATE

> **Retired:** 2026-06-21
> **Reason:** This folder described "Salar OS = The AI Marketplace (600+ services, 150+ AI agents)". That description was **incorrect** — it confused three different things in the codebase.

## What went wrong

There were **three competing definitions** of "Salar OS" in the RTMN codebase:

| Location | What it actually was | What THIS docs/ folder claimed |
|---|---|---|
| `companies/CorpPerks/salar-os/` (port 4710) | Workforce Intelligence — capability registry + human/agent/hybrid digital twins | (Did not match) |
| `docs/salar-os/` (this folder) | Aspirational documentation | "AI Marketplace with 600+ services" |
| `companies/HOJAI-AI/sutar-os/marketplace/` (port 4250) | The actual marketplace | (Did not match) |

These three could not all be right. The marketplace IS in `HOJAI-AI/sutar-os/marketplace/`. The "Workforce Intelligence" service has now been moved to `HOJAI-AI/platform/twins/salar-os/`.

## Where the real Salar OS documentation lives now

| Concern | Authoritative docs |
|---|---|
| **Workforce Intelligence** (capability registry, hybrid twins) | [`companies/HOJAI-AI/platform/twins/salar-os/CLAUDE.md`](../../companies/HOJAI-AI/platform/twins/salar-os/CLAUDE.md) |
| **AI Marketplace** (services, agents, listings) | [`docs/sutar-os/README.md`](../sutar-os/README.md) and [`companies/HOJAI-AI/sutar-os/marketplace/`](../companies/HOJAI-AI/sutar-os/marketplace/) |
| **Trust, Governance, Risk, Verification** (SADA OS) | [`companies/HOJAI-AI/platform/trust/sada-os/CLAUDE.md`](../../companies/HOJAI-AI/platform/trust/sada-os/CLAUDE.md) |

## What to do with this folder

This README.md file replaces the original content. The original ARCHITECTURE.md, API.md, INTEGRATION.md files are kept here for historical reference but should not be used for any new work — they describe aspirational capabilities that were never implemented and now refer to a non-existent service.

If you find these docs being referenced, please:
1. Update the reference to point to the correct docs above
2. Remove the old reference
3. Do not copy patterns from these files into new code

## Historical context (preserved for reference)

The original 3,043 lines of content in this folder described a marketplace vision that was:
- Documented in `docs/salar-os/README.md`, `ARCHITECTURE.md`, `API.md`, `INTEGRATION.md`
- Linked from RTMN root `CLAUDE.md` (lines 962-965) — those references were wrong
- Listed claims like "600+ Services, 150+ AI Agents, 50,000+ Monthly Transactions, $10M+ Total Revenue"
- None of which match what was actually built at the time

The actual marketplace IS being built under `companies/HOJAI-AI/sutar-os/marketplace/`. When that work is complete, those docs will reflect reality. Until then, this folder is kept as a historical artifact with this deprecation notice.

---

*This notice was added on 2026-06-21 when Salar OS and SADA OS were moved from CorpPerks to their canonical HOJAI AI homes.*