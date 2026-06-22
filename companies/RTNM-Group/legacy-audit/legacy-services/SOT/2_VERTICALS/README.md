# Verticals - Source of Truth v2.0

**Last Updated:** May 11, 2026
**Total Verticals:** 10
**Total Vertical Services:** 65+

---

## Vertical Directory

| Vertical | Services | Apps | Revenue Model | Status |
|----------|----------|------|---------------|--------|
| Restaurant | 15 | ReZ Now, Web Menu | Platform fee + payment processing | Active |
| Hospitality | 12 | Hotel OTA, StayOwn, Habixo | Commission on bookings | Active |
| Healthcare | 8 | Salon/Fitness | Subscription + transactions | Active |
| Retail | 10 | POS, Inventory, Procurement | Transaction fees | Active |
| Events | 12 | AdBazaar, AdSQR | CPC/CPM rates | Active |
| Delivery | 8 | DO App, Driver App | Delivery fee | Active |
| Corporate | 11 | CorpPerks Portal | Enterprise subscription | Active |
| Advertising | 12 | Ad Campaigns, Targeting | Ad revenue | Active |
| Loyalty | 10 | Karma App | Engagement | Active |
| Travel | 8 | Habixo, Travel | Booking commission | Active |

---

## Restaurant Vertical (15 Services)

### Core Services

| Service | Port | Git Path | Purpose |
|---------|------|----------|---------|
| Order Service | 4003 | rez-order-service | Order lifecycle management |
| Menu Service | 3024 | rez-menu-service | Menu management |
| Kitchen Display | 3025 | rez-kitchen-display | KDS display system |
| Kitchen AI | 3026 | rez-kitchen-ai | Kitchen automation |
| Recipe Costing | 3027 | rez-recipe-costing | Cost calculation |
| Tracking Service | 3028 | rez-tracking-service | Real-time order tracking |
| Abandonment Tracker | 3029 | rez-abandonment-tracker | Cart abandonment analytics |
| Inventory Service | 3030 | rez-inventory-service | Stock management |
| POS Service | 3022 | rez-pos-service | Restaurant POS |
| Direct Booking | - | rez-direct-booking-service | Table reservations |
| Instant Delivery | - | rez-instant-delivery-service | Quick delivery |
| Billing Service | - | rez-billing-service | Restaurant billing |
| Invoice Service | - | rez-invoice-service | E-invoicing |
| Search Service | 3009 | rez-search-service | Menu search |
| Catalog Service | 3005 | rez-catalog-service | Product catalog |

### AI Services

| Service | Git Path | Purpose |
|---------|----------|---------|
| Restaurant AI | rez-ai-restaurant | Restaurant intelligence |
| Voice AI | rez-ai-voice | Voice ordering |
| Intent Graph | rez-intent-graph | Order intent tracking |

### Apps

| App | Platform | Git Path | Screens |
|-----|----------|----------|---------|
| ReZ Now | React Native | rez-now | 40+ |
| Web Menu | Next.js | rez-web-menu | Web |

### Key Flows

1. **QR Scan Flow**: QR Code -> Menu -> Order -> Payment -> Kitchen -> Delivery
2. **Voice Ordering**: Voice command -> AI processing -> Order creation
3. **Delivery Flow**: Order -> Kitchen Display -> Preparation -> Driver -> Customer
4. **POS Flow**: Order Entry -> Payment -> Receipt -> Inventory Update

### Integrations

- Razorpay / Stripe for payments
- Twilio for SMS notifications
- Firebase for push notifications
- Socket.io for real-time updates

---

## Hospitality Vertical (12 Services)

### Core Services

| Service | Port | Git Path | Purpose |
|---------|------|----------|---------|
| Hotel Service | 3031 | rez-hotel-service | Hotel operations |
| Booking Service | 3012 | rez-booking-service | Reservations |
| Channel Manager | 3020 | rez-channel-manager-service | Multi-OTA sync |
| StayOwn Service | - | rez-stayown-service | Long-stay bookings |
| Direct Booking | - | rez-direct-booking-service | Direct reservations |
| Hotel POS Service | - | rez-hotel-pos-service | Hotel POS |
| Staff Service | 3021 | rez-staff-service | Staff management |
| Invoice Service | - | rez-invoice-service | Billing |

### AI Services

| Service | Git Path | Purpose |
|---------|----------|---------|
| Mind Hotel Service | rez-mind-hotel-service | Hotel AI assistant |
| REZ Mind | REZ-support-copilot | Support automation |
| Intent Graph | rez-intent-graph | Booking intent |

### Apps

| App | Platform | Git Path | Purpose |
|-----|----------|----------|---------|
| Hotel OTA | React | Hotel-OTA | OTA booking |
| Hotel Admin Web | Next.js | rez-hotel-admin-web | Hotel dashboard |
| Habixo | - | rez-habixo-service | Travel platform |

### Key Flows

1. **Booking Flow**: Search -> Availability -> Booking -> Payment -> Confirmation -> Check-in
2. **Channel Manager**: Property -> Channel Manager -> OTA Platforms (MakeMyTrip, OYO, etc.)
3. **Direct Booking**: Website -> Direct Booking -> Commission-free reservation
4. **StayOwn**: Long-term booking -> Monthly rates -> Extended stay

### OTA Integrations

- MakeMyTrip
- OYO
- Booking.com
- Agoda
- Airbnb
- MMT, Yatra, Goibibo (via Channel Manager)

---

## Healthcare Vertical (8 Services)

### Core Services

| Service | Git Path | Purpose |
|---------|----------|---------|
| Booking Service | rez-booking-service | Appointment scheduling |
| Inventory Service | rez-inventory-service | Medical inventory |
| Profile Service | rez-profile-service | Patient profiles |
| Payment Service | rez-payment-service | Payments |
| Wallet Service | rez-wallet-service | Wallet balance |
| Notification Service | rez-notifications-service | Reminders |
| POS Service | rez-pos-service | Point of sale |

### AI Services

| Service | Git Path | Purpose |
|---------|----------|---------|
| Salon/Fitness AI | rez-ai-salon-fitness | Healthcare intelligence |
| Voice AI | rez-ai-voice | Voice appointments |
| Intent Graph | rez-intent-graph | Health intent |

### Key Features

- Voice AI appointment booking
- Inventory tracking
- Appointment reminders
- Loyalty rewards (Karma integration)
- Payment processing

### Key Flows

1. **Appointment Booking**: Voice/Chat -> Slot Selection -> Confirmation -> Reminder
2. **Inventory Management**: Stock -> Usage -> Reorder alerts
3. **Service Flow**: Check-in -> Service -> Payment -> Review

---

## Retail Vertical (10 Services)

### Core Services

| Service | Port | Git Path | Purpose |
|---------|------|----------|---------|
| POS Service | 3022 | rez-pos-service | Retail POS |
| Procurement Service | 3032 | rez-procurement-service | B2B procurement |
| Inventory Service | 3030 | rez-inventory-service | Stock tracking |
| Contracts Service | 3018 | rez-contracts | Vendor contracts |
| Catalog Service | 3005 | rez-catalog-service | Product catalog |
| Payment Service | 4001 | rez-payment-service | Payments |
| Order Service | 4003 | rez-order-service | Orders |
| Search Service | 3009 | rez-search-service | Product search |

### AI Services

| Service | Git Path | Purpose |
|---------|----------|---------|
| Price Optimization | rez-price-optimization-service | Dynamic pricing |
| Recommendation Engine | rez-recommendation-engine | Product recommendations |
| Intent Graph | rez-intent-graph | Purchase intent |

### Key Features

- Point of Sale
- B2B Procurement (NextaBizz)
- Contract Management
- Stock Management
- Dynamic Pricing
- Warranty Tracking

### Integrations

- NextaBizz for B2B marketplace
- Razorpay for payments
- Inventory sync across channels

---

## Events & Advertising Vertical (12 Services)

### Core Services

| Service | Port | Git Path | Purpose |
|---------|------|----------|---------|
| Ads Service | 3033 | rez-ads-service | Ad management |
| Ad Campaigns | - | rez-ad-campaigns | Campaign manager |
| Targeting Engine | - | rez-targeting-engine | Ad targeting |
| Attribution Engine | - | rez-attribution-system | Attribution tracking |
| Media Events | - | rez-media-events | Event promotion |
| Event Platform | - | rez-event-platform | Event management |
| Analytics Service | 3044 | rez-analytics-service | Ad analytics |
| Copilot | - | rez-copilot | Ad AI assistant |
| Ad AI | - | rez-ad-ai | Ad optimization |
| DOOH Service | - | rez-dooh-service | Digital out-of-home |
| Price Optimization | - | rez-price-optimization-service | Ad pricing |
| Tracking Service | 3028 | rez-tracking-service | Event tracking |

### Apps

| App | Git Path | Purpose |
|-----|----------|---------|
| AdBazaar | adBazaar | Ad marketplace |
| AdSQR | adsqr | QR ads platform |
| DOOH | dooh | Digital signage |

### Revenue Model

- CPC (Cost Per Click)
- CPM (Cost Per Mille)
- CPA (Cost Per Acquisition)
- Flat fee campaigns

### Key Features

- Campaign Management
- Ad Targeting (behavioral, demographic, contextual)
- Analytics Dashboard
- Attribution Engine
- Creative Engine
- DOOH (Digital Out-of-Home) advertising

---

## Delivery Vertical (8 Services)

### Core Services

| Service | Port | Git Path | Purpose |
|---------|------|----------|---------|
| Delivery Service | 3034 | rez-delivery-service | Delivery management |
| Tracking Service | 3028 | rez-tracking-service | Live tracking |
| Instant Delivery | - | rez-instant-delivery-service | Express delivery |
| Ride Service | - | rez-ride | Ride hailing |
| Channel Manager | - | rez-channel-manager-service | Multi-platform sync |
| Economic Engine | - | rez-economic-engine | Delivery economics |
| Order Service | 4003 | rez-order-service | Orders |
| Notification Service | 4011 | rez-notifications-service | Updates |

### Apps

| App | Platform | Git Path | Purpose |
|-----|----------|----------|---------|
| DO App | React Native | rez-driver-app | Driver app |
| Delivery UI | Next.js | rez-delivery-ui | Dispatch dashboard |

### Key Flows

1. **Order Assignment**: Order -> Delivery Service -> Driver Assignment -> Pickup -> Delivery
2. **Real-time Tracking**: Order -> Tracking -> Live Location -> Customer Updates
3. **Instant Delivery**: Order -> Express Pool -> Nearest Driver -> 30-min delivery

---

## Corporate & Enterprise Vertical (11 Services)

### Core Services

| Service | Port | Git Path | Purpose |
|---------|------|----------|---------|
| CorpPerks Service | 3035 | rez-corpperks-service | Enterprise perks |
| Corporate Service | 3036 | rez-corporate-service | Corporate management |
| Consent Service | 3037 | rez-consent-service | GDPR consent |
| GDPR Service | 3038 | rez-gdpr-service | Data privacy |
| Payroll Service | - | rez-payroll | Employee payroll |
| Capital Service | - | rez-capital-service | Working capital |
| Merchant Loans | - | rez-merchant-loans-service | Business loans |
| Procurement Service | 3032 | rez-procurement-service | B2B procurement |
| Utility Platform | - | rez-utilities-platform | Bill payments |
| Recharge Service | - | rez-recharge-service | Mobile recharge |
| BBPS Service | - | rez-bbps-service | Bill payments |

### Key Features

- Employee perk management
- Corporate billing
- GST-compliant invoicing
- Working capital loans
- Bill payments (BBPS)
- Mobile recharge

---

## Loyalty & Retention Vertical (10 Services)

### Core Services

| Service | Port | Git Path | Purpose |
|---------|------|----------|---------|
| Karma Service | 3040 | rez-karma-service | Loyalty program |
| Loyalty Admin | - | rez-loyalty-admin | Loyalty dashboard |
| Loyalty Notifications | - | rez-loyalty-notifications | Loyalty alerts |
| Loyalty Security | - | rez-loyalty-security | Fraud prevention |
| Loyalty Monitoring | - | rez-loyalty-monitoring | Loyalty analytics |
| Loyalty Bridge | - | rez-karma-loyalty-bridge | Cross-platform |
| Gamification Service | - | rez-gamification-service | Game mechanics |
| Streak Service | - | rez-streak-service | Daily streaks |
| Score Service | - | rez-score-service | Points system |
| Gift Cards | - | rez-gift-cards | Gift card system |

### Apps

| App | Platform | Git Path |
|-----|----------|----------|
| Karma App | React Native | rez-karma-app |
| Karma Mobile | React Native | rez-karma-mobile |

### Key Features

- Points-based loyalty
- Tiered rewards
- Gift cards
- Cross-vertical rewards
- Gamification elements

---

## Travel Vertical (8 Services)

### Core Services

| Service | Git Path | Purpose |
|---------|----------|---------|
| Travel Service | rez-travel-service | Travel bookings |
| Habixo Service | rez-habixo-service | Travel platform |
| Booking Service | rez-booking-service | Reservations |
| Payment Service | rez-payment-service | Payments |
| Wallet Service | rez-wallet-service | Wallet balance |
| Loyalty Bridge | rez-karma-loyalty-bridge | Loyalty rewards |
| Inventory Service | rez-inventory-service | Inventory |
| Tracking Service | rez-tracking-service | Tracking |

### Key Features

- Hotel bookings
- Flight search (future)
- Package deals
- Loyalty integration
- Corporate travel

---

## Data Flows Between Verticals

```
Restaurant ──────────────────────────────────────────────────┐
    │                                                          │
    ├──> Hospitality (Restaurant in Hotels)                   │
    ├──> Healthcare (Catering to Medical)                    │
    ├──> Corporate (Corporate Dining)                        │
    └──> Loyalty (Karma integration across verticals)        │
                                                            │
Hospitality ────────────────────────────────────────────────>│
    │                                                          │
    ├──> Restaurant (Room Service, Hotel Dining)              │
    ├──> Travel (Habixo integration)                          │
    └──> Loyalty (Karma integration)                         │
                                                            │
All Verticals ───────────────────────────────────────────────┘
    │
    ├──> Core Services (Auth, Payment, Wallet, Order)
    ├──> AI Services (Intent Graph, Insights)
    ├──> Analytics (Unified reporting)
    └──> Loyalty (Cross-vertical rewards)
```

---

## Related Documentation

- [Common Services](../1_COMMON_SERVICES/README.md)
- [Apps](../3_APPS/README.md)
- [AI Services](../4_AI_SERVICES/README.md)
- [Infrastructure](../5_INFRASTRUCTURE/README.md)

---

**Last Updated:** May 11, 2026
**Maintained By:** Claude Code
