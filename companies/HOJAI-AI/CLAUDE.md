# HOJAI AI - Brand & Marketing Layer

> **The AI Infrastructure Company** - Powering the RTMN Ecosystem

---

## ⚠️ Important - Where Things Actually Live

This folder is the **HOJAI AI company root** (brand, divisions, marketplace, external-client docs, AND runtime services). As of 2026-06-19, all HOJAI AI runtime services live in [./services/](./services/) under this same directory — the prior arrangement in `/services/` and `industry-os/shared/` has been consolidated.

**The real, working HOJAI AI services now live in `./services/`:**

| Original HOJAI name | Now lives at | Port |
|---------------------|--------------|------|
| HOJAI Memory | [./services/memory-os/](./services/memory-os/) | 4703 |
| HOJAI TwinOS | [./services/twinos-hub/](./services/twinos-hub/) | 4705 |
| HOJAI Intelligence | [./services/ai-intelligence/](./services/ai-intelligence/) | 4881 |
| HOJAI Customer Intelligence | [./services/customer-intelligence/](./services/customer-intelligence/) | 4885 |
| HOJAI Identity / CorpID | [./services/corpid-service/](./services/corpid-service/) | 4702 |

The `api-gateway` routes pointing to `localhost:4881` etc. are aliases for the services above - the HOJAI name in the route is just a label, the actual code is now co-located with the brand.

A pre-rebrand snapshot of the original HOJAI AI tree (with real TypeScript source) is preserved at `companies/HOJAI-AI-restored/` for reference. See [HOJAI-AI-restored/RECOVERY-NOTES.md](../HOJAI-AI-restored/RECOVERY-NOTES.md).

---

## External Clients Policy

### Leverge - External Client (NOT Part of HOJAI AI or RTMN)

**Leverge is a CLIENT of HOJAI AI, NOT part of the HOJAI AI or RTMN ecosystem.**

| Aspect | Rule |
|--------|------|
| **Ownership** | Leverge code belongs to Leverge, not HOJAI AI |
| **Location** | [leverge/](./leverge/) folder (client-folder stub only) |
| **Audits** | NEVER audit Leverge unless specifically requested by client |
| **Modifications** | NEVER modify Leverge code unless client explicitly requests |
| **Documentation** | Only maintain the `leverge/` folder for client docs |
| **Support** | Only assist when Leverge comes to us as a client |

**General Rule for ALL External Clients:**
- ✅ Only touch client code when they REQUEST something
- ❌ Never audit, modify, or improve client code unprompted
- ❌ Never include client code in HOJAI AI / RTMN architecture discussions
- ❌ Never add client services to the service registry unless integrated

**Reserved port ranges for external clients (do not use internally):**
- Ports 4761-4765: Leverge (analytics, memory, twin, agents, copilot)
- See [CANONICAL-PORT-REGISTRY.md](../../CANONICAL-PORT-REGISTRY.md) for the full reserved list

---

## What This Folder Contains

| Item | Purpose | State |
|------|---------|-------|
| [README.md](./README.md) | Public marketing copy for the HOJAI AI brand | ✅ |
| [services/](./services/) | **~112 runtime services** (TwinOS, MemoryOS, Genie, ACN, SUTAR, Copilots, etc.) | ✅ |
| [divisions/](./divisions/) | 12-division strategic architecture docs | ✅ |
| [shared/](./shared/) | Shared library (auth, lib, templates) used by all services | ✅ |
| [blr-ai-marketplace/](./blr-ai-marketplace/) | Flagship marketplace (Next.js + Stripe) | ⚠️ **No source** - only `package.json` + 3 docs. Future work. |
| [leverge/](./leverge/) | Client-folder stub for Leverge docs | ✅ per policy |

## What This Folder Does NOT Contain

- ❌ No services in `/services/` (all moved to [./services/](./services/) 2026-06-19)
- ❌ No services in `industry-os/shared/` (all moved 2026-06-19)

---

## Connections

HOJAI AI (as a company) connects to:
- RABTUL Technologies (Payment, Auth)
- REZ-Merchant (POS, Orders)
- REZ-Consumer (DO App)
- AdBazaar (CRM, Ads)
- NeXha (Procurement)
- CorpPerks (HR)
- CorpID (Identity) → [./services/corpid-service/](./services/corpid-service/)
- MemoryOS (Memory) → [./services/memory-os/](./services/memory-os/)
- TwinOS Hub (Digital Twins) → [./services/twinos-hub/](./services/twinos-hub/)
- Event Bus (Events) → [./services/event-bus/](./services/event-bus/)
- All RTMN Department OS + Industry OS (consume HOJAI AI services via HTTP)

---

*Last Updated: 2026-06-19 (HOJAI AI consolidation)*
