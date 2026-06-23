# REZ Intelligence Integration

> Wires HOJAI AI's existing intelligence services into SUTAR agents. Port 5370.

## Quick start

```bash
npm install
npm run dev
```

Service starts on http://localhost:5370

## What it does

This service is the **integration layer** between SUTAR agents and HOJAI AI's existing intelligence services. When a SUTAR agent needs to make a decision, it calls this service to get:

- **Merchant intelligence** (revenue, top products, churn risk)
- **Customer intelligence** (LTV, preferences, purchase history)
- **Predictions** (revenue forecast, churn probability, demand)
- **Recommendations** (products, next-best-action, pricing)
- **Intent classification** (what does the user want?)

## The killer endpoint

```bash
POST /api/v1/agent/enrich
```

Called by every SUTAR agent before responding. Returns enriched context with all the intelligence needed to make a smart decision.

See [CLAUDE.md](CLAUDE.md) for full documentation.

## Environment

```bash
PORT=5370
REZ_INTEL_BRIDGE_URL=http://localhost:5369
INTENT_ENGINE_URL=http://localhost:4800
```

## Architecture

```
SUTAR agents
    ↓ call
REZ Intelligence Integration (5370)
    ↓ routes to
REZ-Intelligence-Bridge + Intent Engine + RAG + Predictions
    ↓ returns
Real-time intelligence
    ↓
SUTAR agents make smarter decisions
```

## Status

- ✅ Built (v1.0.0)
- ⚠️ 0 tests (TODO)
- ⚠️ No auth (TODO)
- ⚠️ No caching (TODO)
- ⚠️ No metrics (TODO)

## Related

- [CLAUDE.md](CLAUDE.md) — full docs
- [rez-intelligence-local-economy.md](../../../.claude/plans/rez-intelligence-local-economy.md) — vision
