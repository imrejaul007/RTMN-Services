# REZ ECOSYSTEM - SOURCE OF TRUTH v3.0

**Version:** 3.0
**Date:** May 11, 2026
**Status:** COMPLETE
**Total Services:** 154+

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                     USER LAYER                                                        │
├──────────────────┬──────────────────┬──────────────────┬──────────────────┬──────────────────┬─────────────────────┤
│    ReZ App       │   Merchant App   │    DO App        │   Admin Panel    │    Web Apps      │   Dashboard         │
│   (Consumer)     │   (Business)     │   (Delivery)     │                  │                  │                     │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴────────┬─────────┴────────┬─────────┴──────────┬──────────┘
         │                  │                  │                  │                  │                    │
         └──────────────────┼──────────────────┼──────────────────┼──────────────────┼────────────────────┘
                            │                  │                  │                  │
                            v                  v                  v                  v
         ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
         │                                       API GATEWAY (Port 4000)                                                │
         │                            rez-api-gateway |负载均衡 | Rate Limiting | Auth Middleware                        │
         └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                            │
    ┌───────────────────────┼───────────────────────┬───────────────────────┬───────────────────────┐
    │                       │                       │                       │                       │
    v                       v                       v                       v                       v
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
│     CORE          │ │     VERTICAL       │ │      AI           │ │   INFRASTRUCTURE  │ │   GROWTH              │
│   SERVICES        │ │   SERVICES         │ │   SERVICES         │ │                   │ │                       │
├───────────────────┤ ├───────────────────┤ ├───────────────────┤ ├───────────────────┤ ├───────────────────────┤
│ Auth              │ Restaurant         │ Intent Graph       │ API Gateway        │ Marketing             │
│ Payment           │ Hospitality        │ Intelligence Hub    │ Event Bus          │ Analytics             │
│ Wallet            │ Healthcare         │ ML Engine          │ Rate Limit         │ Attribution           │
│ Order             │ Retail             │ Decision Service    │ Monitoring         │ A/B Testing           │
│ Profile           │ Events             │ Copilot            │ Observability      │ Personalization       │
│ Merchant          │ Advertising        │ Voice AI           │ Audit Logging      │ Gamification          │
│ Notification      │ Corporate          │ Targeting Engine   │ Idempotency        │ Loyalty               │
│ Catalog           │ Travel             │ Recommendation     │ DLQ Service        │ Offers                │
│ Booking           │ Delivery           │ Price Optimizer    │ Retry Service      │ Rewards               │
│ Search            │                    │ Error Intelligence │ Circuit Breaker    │ Gamification          │
└───────────────────┘ └───────────────────┘ └───────────────────┘ └───────────────────┘ └───────────────────────┘
```

---

## COMPLETE SERVICE INVENTORY

### Category 1: Core Platform Services (21 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| API Gateway | 4000 | rez-api-gateway | Entry point, routing, auth | Active |
| Auth Service | 4002 | rez-auth-service | JWT auth, OTP, session | Active |
| Payment Service | 4001 | rez-payment-service | Razorpay, Stripe, UPI | Active |
| Wallet Service | 4004 | rez-wallet-service | ReZ Coins, balances | Active |
| Order Service | 4003 | rez-order-service | Order lifecycle | Active |
| Profile Service | 3000 | rez-profile-service | User profiles | Active |
| Merchant Service | 4005 | rez-merchant-service | Business management | Active |
| Notification Service | 4011 | rez-notifications-service | Push, SMS, Email | Active |
| Catalog Service | 3005 | rez-catalog-service | Product catalog | Active |
| Search Service | 3009 | rez-search-service | Full-text search | Active |
| Booking Service | 3012 | rez-booking-service | Reservations | Active |
| Socket Service | 4010 | rez-socket-service | Real-time WebSocket | Active |
| Webhook Service | 4013 | rez-webhook-service | Outgoing webhooks | Active |
| Validation Service | 3014 | rez-validation-service | Input validation | Active |
| Scheduler Service | 3017 | rez-scheduler-service | Cron jobs | Active |
| Contracts Service | 3018 | rez-contracts | Contract management | Active |
| White Label Service | 3019 | rez-white-label-service | White-label config | Active |
| Channel Manager | 3020 | rez-channel-manager-service | Multi-OTA sync | Active |
| Staff Service | 3021 | rez-staff-service | Staff management | Active |
| POS Service | 3022 | rez-pos-service | Point of sale | Active |
| Currency Service | 3023 | rez-currency-service | Multi-currency | Active |

### Category 2: Restaurant Vertical (15 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Menu Service | 3024 | rez-menu-service | Menu management | Active |
| Kitchen Display | 3025 | rez-kitchen-display | KDS display | Active |
| Kitchen AI | 3026 | rez-kitchen-ai | Kitchen automation | Active |
| Recipe Costing | 3027 | rez-recipe-costing | Cost calculation | Active |
| Tracking Service | 3028 | rez-tracking-service | Order tracking | Active |
| Abandonment Tracker | 3029 | rez-abandonment-tracker | Cart analytics | Active |
| Inventory Service | 3030 | rez-inventory-service | Stock management | Active |
| ReZ Now | - | rez-now | Restaurant app | Active |
| Web Menu | - | rez-web-menu | Web ordering | Active |
| Restaurant AI | - | rez-ai-restaurant | Restaurant ML | Active |
| POS Service | - | rez-pos-service | Restaurant POS | Active |
| Direct Booking | - | rez-direct-booking-service | Table booking | Active |
| Instant Delivery | - | rez-instant-delivery-service | Quick delivery | Active |
| Billing Service | - | rez-billing-service | Restaurant billing | Active |
| Invoice Service | - | rez-invoice-service | E-invoicing | Active |

### Category 3: Hospitality Vertical (12 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Hotel Service | 3031 | rez-hotel-service | Hotel operations | Active |
| Hotel Admin Web | - | rez-hotel-admin-web | Hotel dashboard | Active |
| Hotel POS Service | - | rez-hotel-pos-service | Hotel POS | Active |
| Mind Hotel Service | - | rez-mind-hotel-service | Hotel AI | Active |
| StayOwn Service | - | rez-stayown-service | Long-stay bookings | Active |
| Direct Booking | - | rez-direct-booking-service | Direct reservations | Active |
| Habixo Service | - | rez-habixo-service | Travel platform | Active |
| Travel Service | - | rez-travel-service | Travel bookings | Active |
| Channel Manager | - | rez-channel-manager-service | OTA distribution | Active |
| Hotel OTA | - | Hotel-OTA | OTA app | Active |
| Booking Service | - | rez-booking-service | Reservations | Active |
| Loyalty Bridge | - | rez-karma-loyalty-bridge | Cross-platform loyalty | Active |

### Category 4: Healthcare Vertical (11 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Salon/Fitness AI | - | rez-ai-salon-fitness | Healthcare ML | Active |
| Inventory Service | - | rez-inventory-service | Medical inventory | Active |
| Booking Service | - | rez-booking-service | Appointments | Active |
| Profile Service | - | rez-profile-service | Patient profiles | Active |
| Notification Service | - | rez-notifications-service | Reminders | Active |
| Payment Service | - | rez-payment-service | Payments | Active |
| Wallet Service | - | rez-wallet-service | Wallet balance | Active |
| Loyalty Service | - | rez-karma-service | Loyalty rewards | Active |
| Emergency Service | 4730 | risa-care/emergency-service | Ambulance dispatch, SOS | Active |
| ABHA Service | 4731 | risa-care/abha-service | India Digital Health ID | Active |
| AI Clinical Scribe | 4732 | risa-care/risa-care-ai-scribe | Clinical documentation | Active |

### Category 5: Retail Vertical (10 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| POS Service | 3022 | rez-pos-service | Retail POS | Active |
| Procurement Service | 3032 | rez-procurement-service | B2B procurement | Active |
| Inventory Service | 3030 | rez-inventory-service | Stock tracking | Active |
| Contracts Service | 3018 | rez-contracts | Vendor contracts | Active |
| Catalog Service | 3005 | rez-catalog-service | Product catalog | Active |
| NextaBizz | - | (external) | B2B marketplace | Active |
| Analytics V2 | - | rez-analytics-v2 | Retail analytics | Active |
| Price Optimization | - | rez-price-optimization-service | Dynamic pricing | Active |
| Warranty Service | - | rez-warranty | Warranty tracking | Active |
| Loyalty Service | - | rez-karma-service | Customer loyalty | Active |

### Category 6: Events & Advertising Vertical (12 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Ads Service | 3033 | rez-ads-service | Ad management | Active |
| Ad Campaigns | - | rez-ad-campaigns | Campaign manager | Active |
| Targeting Engine | - | rez-targeting-engine | Ad targeting | Active |
| Attribution Engine | - | rez-attribution-system | Attribution tracking | Active |
| Media Events | - | rez-media-events | Event promotion | Active |
| Event Platform | - | rez-event-platform | Event management | Active |
| Analytics Service | - | rez-analytics-service | Ad analytics | Active |
| Copilot | - | rez-copilot | Ad AI assistant | Active |
| Ad AI | - | rez-ad-ai | Ad optimization | Active |
| DOOH Service | - | rez-dooh-service | Digital out-of-home | Active |
| AdBazaar | - | adBazaar | Ad marketplace | Active |
| AdSQR | - | adsqr | QR ads platform | Active |

### Category 7: Delivery & Logistics (8 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Delivery Service | 3034 | rez-delivery-service | Delivery management | Active |
| Delivery UI | - | rez-delivery-ui | Driver app UI | Active |
| Driver App | - | rez-driver-app | Driver mobile app | Active |
| Tracking Service | 3028 | rez-tracking-service | Live tracking | Active |
| Instant Delivery | - | rez-instant-delivery-service | Express delivery | Active |
| Ride Service | - | rez-ride | Ride hailing | Active |
| Channel Manager | - | rez-channel-manager-service | Multi-platform sync | Active |
| Economic Engine | - | rez-economic-engine | Delivery economics | Active |

### Category 8: Corporate & Enterprise (11 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| CorpPerks Service | 3035 | rez-corpperks-service | Enterprise perks | Active |
| Corporate Service | 3036 | rez-corporate-service | Corporate management | Active |
| Face Attendance | 4810 | corpperks/face-attendance | Face recognition attendance | Active |
| Consent Service | 3037 | rez-consent-service | GDPR consent | Active |
| GDPR Service | 3038 | rez-gdpr-service | Data privacy | Active |
| Payroll Service | - | rez-payroll | Employee payroll | Active |
| Capital Service | - | rez-capital-service | Working capital | Active |
| Merchant Loans | - | rez-merchant-loans-service | Business loans | Active |
| Procurement Service | 3032 | rez-procurement-service | B2B procurement | Active |
| Utility Platform | - | rez-utilities-platform | Bill payments | Active |
| Recharge Service | - | rez-recharge-service | Mobile recharge | Active |
| BBPS Service | - | rez-bbps-service | Bill payments | Active |

### Category 9: AI & Intelligence (25 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Intent Graph | 3001 | rez-intent-graph | Cross-app intent | Active |
| Intelligence Hub | 4020 | rez-intelligence-hub | Unified profiles | Active |
| Intent Predictor | 4018 | rez-intent-predictor | Intent scoring | Active |
| Intent Service | 4009 | rez-intent-service | Intent capture | Active |
| Lead Intelligence | 4014 | rez-lead-intelligence | Lead scoring | Active |
| User Intelligence | 3016 | rez-user-intelligence-service | User analytics | Active |
| Merchant Intelligence | 3015 | rez-merchant-intelligence-service | Merchant analytics | Active |
| Insights Service | 3011 | rez-insights-service | AI insights | Active |
| ML Model Registry | 3001 | rez-ml-model-registry | Model versioning | Active |
| ML Feature Store | 3005 | rez-ml-feature-store | Feature serving | Active |
| ML Engine | - | rez-ml-engine | Model training | Partial |
| ML | - | rez-ml | ML utilities | Active |
| Training Data | - | rez-training-data-service | Data prep | Stub |
| Decision Service | - | rez-decision-service | Decision engine | Active |
| Action Engine | - | rez-action-engine | Action triggers | Active |
| Recommendation Engine | - | rez-recommendation-engine | Recommendations | Active |
| Price Optimization | - | rez-price-optimization-service | Dynamic pricing | Active |
| Error Intelligence | - | rez-error-intelligence | Error tracking | Active |
| Voice AI | - | rez-ai-voice | Voice processing | Active |
| Copilot | - | rez-copilot | AI copilot | Active |
| REZ Mind | - | REZ-support-copilot | Support AI | Active |
| Merchant Copilot | - | rez-merchant-copilot | Merchant AI | Active |
| Consumer Copilot | - | rez-consumer-copilot | Consumer AI | Active |
| AI Platform | - | rez-ai-platform | AI orchestration | Active |
| AI Plugins | - | rez-ai-plugins | AI extensions | Active |
| Knowledge Base | - | rez-knowledge-base-service | KB management | Active |
| Knowledge Service | - | rez-knowledge-service | Knowledge queries | Active |
| Identity Graph | - | rez-identity-graph | User identity | Active |

### Category 10: Growth & Marketing (15 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Marketing Service | 3039 | rez-marketing-service | Marketing automation | Active |
| Marketing Backend | - | rez-marketing-backend | Marketing API | Active |
| Marketing | - | rez-marketing | Marketing app | Active |
| Offers Service | - | rez-offers | Offer management | Active |
| Rewards Service | - | rez-rewards | Rewards program | Active |
| Gamification Service | - | rez-gamification-service | Game mechanics | Active |
| Streak Service | - | rez-streak-service | Daily streaks | Active |
| Score Service | - | rez-score-service | Points system | Active |
| Feedback Service | - | rez-feedback-service | User feedback | Active |
| Reviews Service | - | rez-reviews | Review management | Active |
| Reputation Service | - | rez-reputation-service | Reputation scoring | Active |
| A/B Testing Service | - | rez-ab-testing-service | Experiment platform | Active |
| Experimentation Engine | - | rez-experimentation-engine | Experiments | Active |
| Cohort Service | - | rez-cohort-service | User cohorts | Active |
| Personalization Engine | - | rez-personalization-engine | Personalized content | Active |

### Category 11: Loyalty & Retention (8 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Karma Service | 3040 | rez-karma-service | Loyalty program | Active |
| Karma App | - | rez-karma-app | Karma mobile | Active |
| Karma Mobile | - | rez-karma-mobile | Karma native | Active |
| Loyalty Admin | - | rez-loyalty-admin | Loyalty dashboard | Active |
| Loyalty Notifications | - | rez-loyalty-notifications | Loyalty alerts | Active |
| Loyalty Security | - | rez-loyalty-security | Fraud prevention | Active |
| Loyalty Monitoring | - | rez-loyalty-monitoring | Loyalty analytics | Active |
| Loyalty Integration Tests | - | rez-loyalty-integration-tests | QA testing | Active |
| Loyalty Bridge | - | rez-karma-loyalty-bridge | Cross-platform | Active |
| Gift Cards | - | rez-gift-cards | Gift card system | Active |

### Category 12: Finance & Payments (15 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Finance Service | 3041 | rez-financing-service | Financial ops | Active |
| Refund Service | 3042 | rez-refund-service | Refund processing | Active |
| Payment Links | 3043 | rez-payment-links-service | Payment links | Active |
| Payment Correctness | - | rez-payment-correctness | Payment verification | Active |
| BNPL Service | - | rez-bnpl-service | Buy Now Pay Later | Active |
| Reconciliation Service | - | rez-reconciliation-service | Payment matching | Active |
| Ledger Service | - | REZ-ledger-service | Double-entry ledger | Active |
| Audit Service | - | rez-audit-service | Financial audit | Active |
| Billing System | - | rez-billing-system | Billing management | Active |
| Invoice Service | - | rez-invoice-service | Invoice generation | Active |
| EInvoice Service | - | rez-einvoice-service | E-invoicing | Active |
| Attribution System | - | REZ-attribution-system | Revenue attribution | Active |
| Economic Engine | - | rez-economic-engine | P&L tracking | Active |
| Recharge Service | - | rez-recharge-service | Mobile recharge | Active |
| BBPS Service | - | rez-bbps-service | Bill payments | Active |

### Category 13: Infrastructure & Reliability (19 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Event Bus | 4006 | rez-event-bus | Event streaming | Active |
| Rate Limit | 4007 | rez-rate-limit | Rate limiting | Active |
| Retry Service | 4008 | rez-retry-service | Retry logic | Active |
| DLQ Service | 4015 | REZ-dlq-service | Dead letter queue | Active |
| Circuit Breaker | - | REZ-circuit-breaker | Fault tolerance | Active |
| Idempotency Service | - | REZ-idempotency-service | Idempotent ops | Active |
| Monitoring | - | rez-monitoring | Service monitoring | Active |
| Observability | - | rez-observability | Distributed tracing | Active |
| Audit Logging | - | REZ-audit-logging | Audit trail | Active |
| Policy Engine | - | REZ-policy-engine | Policy enforcement | Active |
| Observability System | - | REZ-observability-system | System observability | Active |
| Websocket Hub | - | rez-websocket-hub | WebSocket management | Active |
| Push Service | - | rez-push-service | Push notifications | Active |
| Notification Events | - | rez-notification-events | Event-driven notifications | Active |
| Notification Hub | - | REZ-notifications-hub | Notification routing | Active |
| Unified Chat | - | rez-unified-chat | Chat service | Active |
| Unified Messaging | - | rez-unified-messaging | Messaging platform | Active |
| Aggregation Hub | - | rez-aggregator-hub | Data aggregation | Active |
| Profile Aggregator | - | rez-profile-aggregator-service | Profile sync | Active |
| Customer 360 | - | rez-customer-360 | 360-degree view | Active |
| Data Pipeline | - | rez-data-pipeline | ETL pipeline | Active |
| API Docs | - | rez-api-docs | API documentation | Active |
| DevOps Config | - | rez-devops-config | DevOps configs | Active |
| Deploy | - | rez-deploy | Deployment scripts | Active |
| Load Tests | - | REZ-load-tests | Performance testing | Active |
| Integration Tests | - | rez-integration-tests | Integration tests | Active |
| Feature Flags | - | rez-feature-flags | Feature toggles | Active |

### Category 14: Analytics & Insights (11 Services)

| Service | Port | Git Path | Purpose | Status |
|---------|------|----------|---------|--------|
| Analytics Service | 3044 | rez-analytics-service | Analytics platform | Active |
| Analytics V2 | - | rez-analytics-v2 | Next-gen analytics | Active |
| Analytics V2 UI | - | rez-analytics-v2-ui | Analytics dashboard | Active |
| Unified Dashboard | 4900 | rtnm-group/unified-dashboard | Cross-company analytics | Active |
| Insights Service | 3011 | rez-insights-service | AI insights | Active |
| Journey Service | - | rez-journey-service | User journeys | Active |
| Cohort Service | - | rez-cohort-service | Cohort analysis | Active |
| Tracking Service | 3028 | rez-tracking-service | Event tracking | Active |
| Customer 360 | - | rez-customer-360 | Customer analytics | Active |
| Fraud Detection | - | rez-fraud-detection-service | Fraud prevention | Active |
| Fraud Service | - | rez-fraud-service | Fraud detection | Active |

### Category 15: Mobile & Web Apps (20 Apps)

| App | Platform | Git Path | Screens | Store | Status |
|-----|----------|----------|---------|-------|--------|
| ReZ App (Consumer) | React Native | rez-app-consumer | 235+ | App Store, Play Store | Active |
| Merchant App | React Native | rez-app-merchant | 90+ | App Store, Play Store | Active |
| DO App | React Native | rez-driver-app | 50+ | App Store, Play Store | Active |
| Karma Mobile | React Native | rez-karma-mobile | 30+ | - | Active |
| Admin App | React Native | rez-app-admin | 45+ | - | Active |
| ReZ Now | React Native | rez-now | 40+ | - | Active |
| Rendez App | React Native | rendez-app | 25+ | - | Active |
| ReZ Dashboard | Next.js | REZ-dashboard | Web | - | Active |
| Admin Dashboard | Next.js | REZ-admin-dashboard | Web | - | Active |
| Admin REE Dashboard | Next.js | REZ-Admin-REE-Dashboard | Web | - | Active |
| Marketing | Next.js | rez-marketing | Web | - | Active |
| Loyalty Admin | Next.js | rez-loyalty-admin | Web | - | Active |
| Merchant Copilot | Next.js | rez-merchant-copilot | Web | - | Active |
| Consumer Copilot | Next.js | rez-consumer-copilot | Web | - | Active |
| Staff Web | Next.js | rez-staff-web | Web | - | Active |
| Inventory UI V2 | Next.js | rez-inventory-v2-ui | Web | - | Active |
| Analytics V2 UI | Next.js | rez-analytics-v2-ui | Web | - | Active |
| Hotel Admin Web | Next.js | rez-hotel-admin-web | Web | - | Active |
| Web Menu | Next.js | rez-web-menu | Web | - | Active |
| Delivery UI | Next.js | rez-delivery-ui | Web | - | Active |
| Admin Training Panel | Next.js | rez-admin-training-panel | Web | - | Active |
| Ops Dashboard | Next.js | rez-ops-dashboard | Web | - | Active |
| Customer Platform UI | Next.js | rez-customer-platform-ui | Web | - | Active |
| REZ Mind Client | Web | REZ-MIND-CLIENT | Web | - | Active |

---

## VERTICALS SUMMARY

| Vertical | Services | Apps | Revenue Model | Status |
|----------|----------|------|---------------|--------|
| Restaurant | 15 | ReZ Now, Web Menu, POS | Platform fee + payment processing | Active |
| Hospitality | 12 | Hotel OTA, Habixo, StayOwn | Commission on bookings | Active |
| Healthcare | 10 | Salon/Fitness, Emergency, ABHA | Subscription + transactions | Active |
| Retail | 10 | POS, Inventory, Procurement | Transaction fees | Active |
| Events | 12 | AdBazaar, AdSQR, DOOH | CPC/CPM rates | Active |
| Delivery | 8 | DO App, Driver App | Delivery fee | Active |
| Corporate | 10 | CorpPerks Portal | Enterprise subscription | Active |
| Advertising | 12 | Ad Campaigns, Targeting | Ad revenue | Active |
| Loyalty | 10 | Karma App | Engagement | Active |
| Finance | 15 | Payment Links, BNPL | Transaction fees | Active |

---

## INTEGRATIONS

### Payment Providers

| Provider | Status | Features |
|----------|--------|----------|
| Razorpay | Active | Cards, net banking, wallets, UPI |
| Stripe | Active | International payments |
| PhonePe | Active | UPI, cards, wallets |
| Paytm | Active | UPI, payments |
| UPI (Native) | Active | Real-time payments |
| BNPL | Active | Buy Now Pay Later |

### Communication Providers

| Provider | Status | Features |
|----------|--------|----------|
| Twilio | Active | SMS, WhatsApp, Voice AI |
| Firebase | Active | Push notifications, Auth |
| SendGrid | Active | Email |
| Socket.io | Active | Real-time messaging |
| WhatsApp Business | Active | Business messaging |

### Infrastructure Providers

| Provider | Status | Features |
|----------|--------|----------|
| MongoDB Atlas | Active | Primary database |
| Redis Cloud | Active | Caching, sessions, queues |
| BullMQ | Active | Job queues |
| Vercel | Active | Frontend hosting |
| Render | Active | Backend services |
| Cloudflare | Active | CDN, DDoS protection |

### AI Providers

| Provider | Status | Features |
|----------|--------|----------|
| OpenAI | Active | GPT models, embeddings |
| Anthropic | Active | Claude models |
| Twilio Voice | Active | Voice AI |
| Vector DB | Active | Embedding storage |

---

## BUSINESS METRICS

| Metric | Target | Current |
|--------|--------|---------|
| GMV | INR 1Cr+/month | Growing |
| Active Merchants | 10,000+ | Growing |
| Active Users | 100,000+ | Growing |
| Transactions/day | 10,000+ | Growing |
| Services | 150+ | Complete |
| Verticals | 10 | Active |

---

## REVENUE STREAMS

| Stream | Percentage | Description |
|--------|------------|-------------|
| Payment Processing | 2-3% | Per transaction |
| Platform Fee | 1-2% | Per order |
| Subscription | INR 99-999/mo | Merchant plans |
| Ads Revenue | CPC/CPM | Advertising |
| Wallet Transactions | 0.5% | ReZ Coins |
| Commission | 10-20% | Hospitality bookings |
| Delivery Fee | INR 20-50 | Per delivery |

---

## QUICK LINKS

- [Common Services](1_COMMON_SERVICES/README.md) - Core backend services
- [Verticals](2_VERTICALS/README.md) - Industry-specific implementations
- [Apps](3_APPS/README.md) - Frontend applications
- [AI Services](4_AI_SERVICES/README.md) - Machine learning, NLP
- [Infrastructure](5_INFRASTRUCTURE/README.md) - DevOps, databases
- [Integrations](6_INTEGRATIONS/README.md) - Third-party services
- [SOT Index](INDEX.md) - Master index

---

## DEVELOPMENT

### Getting Started

1. Clone repository: `git clone <repo-url>`
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env`
4. Start services: `pnpm dev`

### Service Template

See [TEMPLATE_SERVICE.md](TEMPLATE_SERVICE.md)

---

## SECURITY STATUS

| Category | Status |
|----------|--------|
| CORS Wildcards | ALL FIXED (60+ services) |
| Rate Limiting | ALL FIXED (40+ services) |
| JWT Validation | ALL FIXED |
| MongoDB Validation | ALL FIXED |
| Input Validation | ALL FIXED |
| Circuit Breakers | IMPLEMENTED |
| Unit Tests | 39+ tests |
| Security Audit | COMPLETE |

### Security Documentation

| Document | Location |
|----------|---------|
| Security Audit | `docs/SECURITY_AUDIT.md` |
| Code Audit | `../../docs/CODE_AUDIT.md` |
| Source of Truth | `SOT/SOURCE_OF_TRUTH.md` |
| Circuit Breaker | `shared-types/src/utils/circuitBreaker.ts` |

### Quick Security Commands

```bash
# Run security tests
npm test -- test/security.*

# Check for CORS issues
grep -r "origin.*'\*'" src/ --include="*.ts"

# Verify rate limiting
grep -r "rateLimit" src/ --include="*.ts"
```

---

**Last Updated:** May 14, 2026
**Security Audit:** COMPLETE
**Maintained By:** Claude Code
**Version:** 3.1
