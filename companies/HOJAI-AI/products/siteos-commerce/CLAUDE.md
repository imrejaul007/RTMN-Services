# HOJAI SiteOS Commerce Module

**Version:** 2.0.0
**Status:** Production Ready
**Services:** 19 (Ports 5476-5494)

## Overview

Complete commerce module for HOJAI SiteOS - from product catalog to subscriptions.

## Services (19 Total)

### Commerce (5476-5485)
| Port | Service | Purpose |
|------|---------|---------|
| 5476 | product-catalog | Products, categories, search, inventory |
| 5477 | cart-service | Cart, coupons, discounts |
| 5478 | checkout-service | Orders, addresses, shipping |
| 5479 | payment-gateway | Razorpay, UPI, QR payments |
| 5480 | review-collection | Active reviews, sentiment analysis |
| 5481 | loyalty-connector | Points, tiers, rewards, referrals |
| 5482 | support-widget | Tickets, live chat, canned responses |
| 5483 | whatsapp-broadcast | Campaigns, audiences, drip sequences |
| 5484 | native-crm | Contacts, deals, tasks, pipeline |
| 5485 | sales-pipeline | Kanban, quotes, commission tracking |

### Communication (5486-5491)
| Port | Service | Purpose |
|------|---------|---------|
| 5486 | email-service | SMTP, templates, delivery tracking |
| 5487 | sms-service | Multi-provider SMS, DLT compliance |
| 5488 | push-service | Web push notifications |
| 5489 | analytics-api | Real-time metrics, funnels, cohorts |
| 5490 | multi-currency | 10+ currencies, formatting, RTL |
| 5491 | i18n-service | 15+ locales, translations |

### Business (5492-5494)
| Port | Service | Purpose |
|------|---------|---------|
| 5492 | social-connector | Multi-platform social posting |
| 5493 | affiliate-system | Partners, commissions, payouts |
| 5494 | subscription-billing | Plans, usage tracking, invoices |

## Startup

```bash
bash ../../scripts/start-siteos.sh start
```

## Quick Test

```bash
# Check all services
curl http://localhost:5486/health  # Email
curl http://localhost:5487/health  # SMS
curl http://localhost:5488/health  # Push
curl http://localhost:5489/health  # Analytics
curl http://localhost:5490/health  # Currency
curl http://localhost:5491/health  # i18n
curl http://localhost:5492/health  # Social
curl http://localhost:5493/health  # Affiliate
curl http://localhost:5494/health  # Billing
```

## Architecture

```
SiteOS Admin Dashboard
        │
        ├── Analytics API (5489) ───► Commerce Services
        │
        ├── Communication Services
        │   ├── Email (5486)
        │   ├── SMS (5487)
        │   ├── Push (5488)
        │   └── i18n (5491)
        │
        ├── Commerce Services
        │   ├── Product → Cart → Checkout → Payment
        │   ├── Reviews + Loyalty
        │   ├── Support + CRM
        │   └── Sales Pipeline
        │
        └── Business Services
            ├── Multi-Currency (5490)
            ├── Social Connector (5492)
            ├── Affiliate (5493)
            └── Subscription (5494)
```

## Features

### E-commerce
- Product catalog with search and categories
- Shopping cart with coupons
- Multi-step checkout
- Payment gateway (Razorpay, UPI, QR)
- Review collection with sentiment
- Loyalty points and tiers

### Marketing
- WhatsApp broadcast campaigns
- Email marketing with templates
- SMS campaigns (DLT compliant)
- Push notifications
- Social media posting

### CRM & Sales
- Contact management
- Deal pipeline (Kanban)
- Task management
- Sales quotes
- Commission tracking

### Business Operations
- Multi-currency (10+ currencies)
- i18n (15+ locales, RTL)
- Analytics dashboard
- Affiliate partner management
- Subscription billing

## Tech Stack

- Node.js 18+
- Express.js
- File-based persistence (/tmp)
- JWT API key auth
- Vitest for tests

## Docs

Each service has its own CLAUDE.md with detailed API docs.