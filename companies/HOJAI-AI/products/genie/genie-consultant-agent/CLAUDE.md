# Genie Consultant Agent

**Version:** 1.0.0
**Port:** 4720
**Status:** ✅ PHASE 2 COMPLETE - Domain Expertise Router

---
---

## 🔐 Auth (Phase 7)

This service now requires a **Bearer JWT** (CorpID-issued) on every request except `/health`, `/`, and `/ready`. Auth is enforced via `app.use(requireAuth)` from `@rtmn/shared/auth`.

**Get a token:**

```bash
# Dev shortcut (base64 JSON token — matches what requireAuth verifies):
TOKEN=$(curl -s -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"dev"}' | jq -r .token)
```

**Call this service:**

```bash
curl http://localhost:PORT/health                      # public, no token
curl http://localhost:PORT/your-endpoint \
  -H "Authorization: Bearer $TOKEN"                   # protected
```

**Disable in dev/test:** Set `SERVICE_REQUIRE_AUTH=false` env var.

See [shared/MIGRATION-GUIDE.md](../../shared/MIGRATION-GUIDE.md) for the full `@rtmn/shared/auth` pattern and the canonical thin-shim approach.

## Overview

Genie Consultant Agent powers Genie's Consultant OS pillar. It routes user queries to domain-specific expertise across 20 industry verticals.

---

## Supported Domains (20)

1. **Restaurant** - Menu, operations, marketing, finance
2. **Hotel** - Guest experience, revenue, operations
3. **Startup** - Funding, MVP, growth, scaling
4. **Healthcare** - Practice management, patient experience
5. **Legal** - Contracts, compliance, IP
6. **HR** - Hiring, training, performance
7. **Marketing** - Digital, content, paid ads
8. **Finance** - Budgeting, cash flow, investment
9. **Real Estate** - Buying, selling, investing
10. **Career** - Resume, interview, skills
11. **Retail** - Store, inventory, customer service
12. **Beauty** - Salon, spa, wellness
13. **Fitness** - Gym, personal training
14. **Travel** - Tourism, itineraries
15. **Education** - Courses, training
16. **Manufacturing** - Production, supply chain
17. **Construction** - Building, contracting
18. **Agriculture** - Farming, agribusiness
19. **Sports** - Teams, leagues, coaching
20. **Entertainment** - Events, media, content

---

## API Endpoints

### Main Consulting
- `POST /consult` - Main consulting endpoint (auto-routes to domain)
- `GET /consult/domains` - List all domains
- `GET /consult/domain/:domain` - Get domain info
- `GET /consult/history/:userId` - Get consultation history

### Domain-Specific
- `POST /domain/restaurant/advice` - Restaurant advice
- `POST /domain/startup/advice` - Startup advice
- `POST /domain/marketing/advice` - Marketing advice

---

## Example Usage

### Ask a Question
```bash
curl -X POST http://localhost:4720/consult \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "query": "I'm opening a restaurant, what should I know about menu pricing?"
  }'
```

### Get Restaurant Marketing Advice
```bash
curl -X POST http://localhost:4720/domain/restaurant/advice \
  -d '{"type": "marketing"}'
```

---

*Last Updated: June 22, 2026*
