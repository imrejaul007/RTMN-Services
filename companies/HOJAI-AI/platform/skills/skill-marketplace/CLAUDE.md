# Skill Marketplace (port 4120)

> **Status:** ✅ Production-ready v1.0.0 (Architecture v2 — June 20, 2026)
> **Role:** Buy/sell skills separately from agents. SkillOS (4743) is the runtime; this is the storefront.
> **Owner:** HOJAI AI Marketplace team

## Mission

Skills are reusable capability packages (see [../skill-os/CLAUDE.md](../skill-os/CLAUDE.md)). Today, agents ship with bundled skills. **Skill Marketplace lets publishers list skills independently** so consumers can browse, buy, subscribe to, or rate skills without buying a whole agent.

## Endpoints (15)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts |
| GET | `/api/categories` | List 6 seeded categories |
| POST | `/api/categories` | Create a category |
| POST | `/api/listings` | Create a listing (publisher + title + price + pricingModel) |
| GET | `/api/listings` | List with filters (category, publisher, pricingModel, q, minRating, maxPrice, sort) |
| GET | `/api/listings/featured` | Featured listings |
| GET | `/api/listings/trending` | Top by sales |
| GET | `/api/listings/:id` | Get one listing |
| PATCH | `/api/listings/:id` | Update listing |
| DELETE | `/api/listings/:id` | Delete listing |
| POST | `/api/listings/:id/reviews` | Submit 1-5 star review |
| GET | `/api/listings/:id/reviews` | List reviews |
| POST | `/api/purchases` | Purchase a listing |
| GET | `/api/purchases` | List purchases (filter by buyer or listingId) |
| GET | `/api/audit` | Audit log |

## 3 Pricing Models

| Model | Platform Fee | Provider Gets |
|-------|--------------|---------------|
| `one-time` | 15% | 85% |
| `subscription` | 15% | 85% |
| `usage` | 20% | 80% |

## 6 Seeded Categories

AI & Reasoning · Commerce · Business · Productivity · Communication · Industry

## 5 Seeded Listings

- ReAct Reasoner (HOJAI, featured) — $49 one-time
- CRM Lead Lookup (AdBazaar) — $19 subscription
- Calendar Conflict Check (Genie) — $9 subscription
- WhatsApp Send (Genie) — $29 usage
- Restaurant Booking (RestaurantOS) — $39 subscription

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `skillMarketplace: http://localhost:4120`
- **ai-intelligence (4881) `/api/agents`** — exposes `skillMarketplace` agent
- **unified-os-hub (4399)** — `/api/skills-market/...` routes to this service

## Next Steps

- Wire to SkillOS (4743) so purchased skills become available for execution
- Add billing via REZ Wallet (4004)
- Add Stripe checkout for one-time purchases
- Add subscription renewals
- Add bundle deals (buy 3 skills, get 10% off)
