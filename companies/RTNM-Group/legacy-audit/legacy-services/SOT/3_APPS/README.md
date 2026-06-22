# Apps - Source of Truth v2.0

**Last Updated:** May 11, 2026
**Total Apps:** 24 (14 Mobile, 10 Web)

---

## Overview

The ReZ ecosystem includes mobile apps for consumers, merchants, delivery partners, and administrators, plus web applications for dashboards and management.

## Complete App Inventory

### Mobile Apps (14)

| App | Platform | Git Path | Screens | Store | Status |
|-----|----------|----------|---------|-------|--------|
| **ReZ App (Consumer)** | React Native | rez-app-consumer | 235+ | App Store, Play Store | Active |
| **Merchant App** | React Native | rez-app-merchant | 90+ | App Store, Play Store | Active |
| **DO App** | React Native | rez-driver-app | 50+ | App Store, Play Store | Active |
| **Karma Mobile** | React Native | rez-karma-mobile | 30+ | - | Active |
| **Admin App** | React Native | rez-app-admin | 45+ | - | Active |
| **ReZ Now** | React Native | rez-now | 40+ | - | Active |
| **Rendez App** | React Native | rendez-app | 25+ | - | Active |
| **Karma App** | React Native | rez-karma-app | 20+ | - | Active |
| **Driver App** | React Native | rez-driver-app | 40+ | App Store, Play Store | Active |
| **Staff App** | React Native | rez-staff-ui | 30+ | - | Active |
| **Merchant Web** | React Native WebView | rez-staff-web | Web | - | Active |

### Web Apps (10)

| App | Platform | Git Path | Purpose | Status |
|-----|----------|----------|---------|--------|
| **ReZ Dashboard** | Next.js | REZ-dashboard | Main merchant dashboard | Active |
| **Admin Dashboard** | Next.js | REZ-admin-dashboard | System administration | Active |
| **Admin REE Dashboard** | Next.js | REZ-Admin-REE-Dashboard | Rule engine dashboard | Active |
| **Marketing** | Next.js | rez-marketing | Marketing management | Active |
| **Loyalty Admin** | Next.js | rez-loyalty-admin | Loyalty management | Active |
| **Merchant Copilot** | Next.js | rez-merchant-copilot | AI merchant assistant | Active |
| **Consumer Copilot** | Next.js | rez-consumer-copilot | AI consumer assistant | Active |
| **Staff Web** | Next.js | rez-staff-web | Staff management | Active |
| **Inventory UI V2** | Next.js | rez-inventory-v2-ui | Inventory dashboard | Active |
| **Analytics V2 UI** | Next.js | rez-analytics-v2-ui | Analytics dashboard | Active |
| **Hotel Admin Web** | Next.js | rez-hotel-admin-web | Hotel management | Active |
| **Web Menu** | Next.js | rez-web-menu | Restaurant web menu | Active |
| **Delivery UI** | Next.js | rez-delivery-ui | Delivery dashboard | Active |
| **Admin Training Panel** | Next.js | rez-admin-training-panel | Admin training | Active |
| **Ops Dashboard** | Next.js | rez-ops-dashboard | Operations dashboard | Active |
| **Customer Platform UI** | Next.js | rez-customer-platform-ui | Customer platform | Active |
| **REZ Mind Client** | Web | REZ-MIND-CLIENT | AI support client | Active |

---

## Consumer App (ReZ App)

### Overview
Primary consumer-facing mobile application for food ordering, delivery, and more.

### Features
- Phone/OTP authentication
- PIN login for returning users
- Order food/delivery
- Track orders in real-time
- Payment via wallet/cards/UPI
- Loyalty rewards (Karma)
- Voice ordering (AI)
- Profile management
- Browse restaurants/hotels/services
- Search and filtering
- Reviews and ratings
- Order history

### Tech Stack
- React Native (Expo)
- TypeScript
- Navigation: React Navigation
- State: Zustand
- API Client: Axios
- Real-time: Socket.io

### Commands
```bash
cd rez-app-consumer
npm install
npm start
npm run android  # Android
npm run ios      # iOS
```

### Screens (235+)
- Splash, Onboarding, Auth (Phone, OTP, PIN)
- Home, Search, Categories, Filters
- Restaurant/Merchant Detail, Menu
- Cart, Checkout, Payment
- Order Tracking, Order History
- Profile, Settings, Addresses
- Wallet, Transactions
- Karma Rewards, Points
- Voice AI Assistant
- Notifications, Support

---

## Merchant App

### Overview
Business management app for merchants to manage orders, menu, and analytics.

### Features
- Business profile management
- Menu management
- Order management
- Kitchen display system
- Analytics dashboard
- Notification management
- Payment tracking
- Contract management
- Staff management
- Performance metrics

### Tech Stack
- React Native (Expo)
- TypeScript
- WebView integrations
- Push notifications

### Commands
```bash
cd rez-app-merchant
npm install
npm start
npm run android
npm run ios
```

---

## DO App (Delivery Operations)

### Overview
Delivery partner app for managing deliveries and earnings.

### Features
- Order pickup notifications
- Delivery tracking
- Earnings management
- Performance metrics
- Order history
- Support chat

### Commands
```bash
cd rez-driver-app
npm install
npm start
```

---

## Karma Mobile App

### Overview
Loyalty rewards app for customers to track and redeem points.

### Features
- Points balance
- Transaction history
- Rewards catalog
- Redeem rewards
- Tier status
- Streak tracking

### Commands
```bash
cd rez-karma-mobile
npm install
npm start
```

---

## Admin App

### Overview
Internal admin operations app for system management.

### Features
- User management
- Service monitoring
- Audit logs
- Configuration management
- Analytics dashboard
- Support tickets

### Commands
```bash
cd rez-app-admin
npm install
npm start
```

---

## ReZ Now

### Overview
Restaurant-focused app for ordering from local restaurants.

### Features
- Restaurant discovery
- Menu browsing
- Quick ordering
- Real-time tracking

### Commands
```bash
cd rez-now
npm install
npm start
```

---

## Web Dashboards

### ReZ Dashboard (Merchant Dashboard)
- Order management
- Menu management
- Analytics and reports
- Financial overview
- Settings and configuration

### Admin Dashboard
- System overview
- User management
- Service health
- Logs and monitoring
- Configuration

### REE Dashboard
- Rule engine management
- Business rules configuration
- Rule testing
- Analytics

### Analytics Dashboard
- Real-time metrics
- Revenue reports
- User analytics
- Conversion funnels

---

## Common Tech Stack

| Component | Technology |
|-----------|------------|
| Mobile Framework | React Native (Expo) |
| Language | TypeScript |
| Navigation | React Navigation |
| State Management | Zustand |
| HTTP Client | Axios |
| Real-time | Socket.io |
| Push Notifications | Firebase Cloud Messaging |
| Maps | Google Maps / Mapbox |
| Analytics | Custom + Mixpanel |

| Component | Technology |
|-----------|------------|
| Web Framework | Next.js |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | React hooks / Zustand |
| Charts | Recharts |
| Tables | TanStack Table |

---

## Related Documentation

- [Common Services](../1_COMMON_SERVICES/README.md)
- [Verticals](../2_VERTICALS/README.md)
- [API Reference](../../API_REFERENCE.md)

---

**Last Updated:** May 11, 2026
**Maintained By:** Claude Code
