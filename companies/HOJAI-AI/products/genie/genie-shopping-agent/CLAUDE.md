# Genie Shopping Agent

**Version:** 1.0.0
**Port:** 4728
**Status:** ✅ Production Ready
**Last Updated:** June 22, 2026

---

## Overview

The Genie Shopping Agent is the consumer's personal AI for autonomous shopping. It handles product discovery, price negotiation, order placement, and tracking across multiple merchants — all driven by natural language requests.

Built to talk to merchants via the **ACP (Agent Commerce Protocol)** so a single shopping request can fan out to many merchant AIs in parallel, compare offers, and pick the best deal.

---

## Features

- 🛒 Natural language shopping requests ("buy me wireless earbuds under ₹5,000")
- 🔍 Multi-merchant product comparison
- 💬 Autonomous negotiation via ACP (counter-offers, accept, reject)
- 🎯 Smart product matching (semantic + filter)
- 💰 Budget management & spend tracking
- 📜 Purchase history & preferences
- 📦 Order tracking
- 🔁 Returns & dispute initiation

---

## Quick Start

```bash
cd products/genie/genie-shopping-agent
npm install
npm start  # Port 4728
```

---

## 🔐 Auth (Phase 7)

This service requires a **Bearer JWT** (CorpID-issued) on every request except `/health`, `/`, and `/ready`. Auth is enforced via `app.use(requireAuth)` from `@rtmn/shared/auth`.

**Get a token:**

```bash
TOKEN=$(curl -s -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"dev"}' | jq -r .token)
```

**Call this service:**

```bash
curl http://localhost:4728/health                       # public, no token
curl -X POST http://localhost:4728/api/shop \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"wireless earbuds under 5000 INR","maxResults":5}'
```

**Disable in dev/test:** Set `SERVICE_REQUIRE_AUTH=false` env var.

See [shared/MIGRATION-GUIDE.md](../../shared/MIGRATION-GUIDE.md) for the full `@rtmn/shared/auth` pattern and the canonical thin-shim approach.

---

## Storage

- `PersistentMap` (file-backed JSON) for products, orders, negotiations, user prefs
- `auth/sessions` for in-flight ACP sessions
- `commerce/orders` for completed purchases

---

## Integration

- **ACP Protocol** (4800) — outbound to merchant AIs
- **ACN Network** (4801) — agent discovery
- **CorpID** (4702) — JWT verification
- **MemoryOS** (4703) — store user shopping preferences
- **REZ Wallet** (4004) — payment on accept

---

*Genie Shopping Agent — your personal AI shopper*
