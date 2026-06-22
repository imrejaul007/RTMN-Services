# Salar OS - AI Marketplace

> **Port:** 8200
> **Status:** ✅ Production Ready
> **Last Updated:** 2026-06-21

## What is Salar OS?

**Salar OS** is the **AI Marketplace** of the RTMN ecosystem. It's where AI providers publish agents, skills, twins, and workflows, and where consumers/buyers discover and purchase them.

This is the **REAL** AI marketplace that was previously (incorrectly) referenced in the RTMN root CLAUDE.md. The earlier `companies/CorpPerks/salar-os/` is a **workforce intelligence** service — a different product. They are not the same.

## Features

### Provider Side
- Sign up as a provider (with universal CorpID identity)
- Create listings: agents, skills, twins, workflows, knowledge packs, services, products
- Set pricing: free, one-time, subscription, or usage-based
- Provider dashboard: views, purchases, earnings, ratings
- Track reviews from buyers

### Buyer Side
- Browse all listings (filtered by category)
- Search by keyword across title, description, tags
- Filter by category (agent, skill, twin, workflow, knowledge, service, product)
- Featured listings
- Category breakdowns
- Purchase with platform fee deducted (15% / 10% / 20% depending on model)
- Review + rate after purchase

### Platform
- 4 pricing models supported
- Reviews and ratings (5-star)
- Trust and verification (future: integrate with SADA)
- Revenue tracking
- Provider reputation system

## Categories

1. **AI Agents** (150+) - ChatGPT-style autonomous agents
2. **Digital Twins** (23+) - Pre-built personal/business twins
3. **Industry OS** (24) - Full industry operating systems
4. **Knowledge Packs** (100+) - Domain knowledge bases
5. **Workflows** (200+) - Multi-step automated workflows
6. **Skills** (600+) - Reusable atomic capabilities
7. **Services** (600+) - Micro-services
8. **Products** (190+) - Bundled products

## Architecture

```
Provider signs up → gets CorpID
    ↓
Creates listing (title, description, category, pricing)
    ↓
Buyer discovers via search/category
    ↓
Buyer purchases (15% fee taken)
    ↓
Provider gets 85% (subscription: 90%, usage: 80%)
    ↓
Buyer leaves review → rating updates
    ↓
Provider dashboard shows stats
```

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create provider account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current provider

### Listings
- `POST /api/listings` - Create listing
- `GET /api/listings` - List with filters (category, q, featured, sort, limit)
- `GET /api/listings/featured` - Featured only
- `GET /api/listings/categories` - Category breakdown with counts
- `GET /api/listings/:listingId` - Listing details + reviews
- `GET /api/providers/:providerId/listings` - Provider's listings

### Reviews
- `POST /api/listings/:listingId/reviews` - Submit review

### Purchases
- `POST /api/listings/:listingId/purchase` - Buy a listing

### Dashboard
- `GET /api/dashboard` - Provider dashboard (stats + recent purchases)
- `GET /api/marketplace/stats` - Global marketplace stats

## Integration Points

- **CorpID** (port 7001) - Universal identity for providers
- **Genie** (port 7100, via genie-os) - AI recommendations
- **SADA** (port 4190) - Trust + verification
- **Sutar** (port 7200, via genie-os) - Business agent recommendations

## Database Collections

- `salarproviders` - Provider accounts
- `salarprovidersessions` - JWT sessions
- `sallistings` - Product/agent listings
- `salarreviews` - Reviews
- `salarpurchases` - Purchase transactions

## Quick Start

```bash
# From HOJAI-AI/salar
npm install
npm start  # Port 8200

# Or via genie-os (recommended)
cd /Users/rejaulkarim/Documents/genie-os
npm run start:all
```

## Why This Exists

The AI marketplace is a critical piece of the HOJAI agent economy:
- **Developers** monetize their AI work
- **Businesses** discover and buy AI capabilities
- **Platform** takes a cut for providing trust + payments
- **Network effects** — more providers = more buyers = more providers

This is the **"App Store for AI"** of the RTMN ecosystem.
