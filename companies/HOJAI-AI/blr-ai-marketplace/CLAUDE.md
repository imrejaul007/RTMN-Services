# BLR AI Marketplace - Service Documentation

> **Location:** `/Users/rejaulkarim/Documents/RTMN/blr-ai-marketplace/`

## Overview

BLR AI Marketplace is a Next.js web application that serves as the central storefront for the entire RTMN ecosystem.

## Purpose

- **One-Stop Shop**: Buy or subscribe to AI agents, digital twins, services, and knowledge
- **Centralized Catalog**: All 600+ offerings in one place
- **Easy Browsing**: Organized categories and search
- **Cart & Checkout**: Stripe-powered purchasing

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Animations | Framer Motion |
| State | Zustand |
| Payments | Stripe |

## Directory Structure

```
blr-ai-marketplace/
├── README.md           # Overview
├── CLAUDE.md          # This file
├── CATALOG.md         # Complete product catalog
├── package.json       # Dependencies
├── app/               # Next.js app directory
│   ├── page.tsx      # Home page
│   ├── layout.tsx     # Root layout
│   └── globals.css    # Global styles
├── components/        # React components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── CategoryCard.tsx
│   ├── ProductCard.tsx
│   └── PricingTable.tsx
├── lib/               # Utilities
│   └── products.ts   # Product data
└── public/            # Static assets
```

## Key Features

1. **Product Catalog**
   - 150+ AI Agents
   - 23+ Digital Twins
   - 100+ Knowledge Packs
   - 24 Industry OS
   - 600+ Services

2. **Categories**
   - AI Agents
   - Digital Twins
   - Knowledge Packs
   - Industry OS
   - Services
   - Analytics
   - Workflows

3. **Pricing Models**
   - Monthly/Annual subscriptions
   - One-time purchases
   - Bundles and packages
   - Add-ons

4. **Cart & Checkout**
   - Add to cart
   - Multiple items
   - Stripe integration
   - Instant activation

## API Endpoints

The marketplace connects to RTMN backend services:

| Endpoint | Service | Purpose |
|----------|---------|---------|
| POST /api/checkout | Billing | Create Stripe session |
| GET /api/products | Catalog | Fetch product list |
| GET /api/pricing | Pricing | Get current prices |
| POST /api/subscribe | Subscriptions | Create subscription |

## Deployment

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.rtmn.com
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

## Future Enhancements

- [ ] Full Next.js app implementation
- [ ] User authentication
- [ ] Order history
- [ ] Subscription management
- [ ] Agent deployment integration
- [ ] Real-time usage tracking
