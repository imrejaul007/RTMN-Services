# REZ-Consumer App - Complete Integration Guide

**Last Updated:** 2026-05-12  
**Version:** 1.0.0

---

## Table of Contents

1. [App Overview](#app-overview)
2. [Services Integration](#services-integration)
3. [Environment Variables](#environment-variables)
4. [API Services](#api-services)
5. [Feature Modules](#feature-modules)
6. [Testing](#testing)
7. [Deployment](#deployment)

---

## App Overview

**REZ-Consumer** is a comprehensive mobile commerce application built with React Native/Expo.

### Tech Stack

- **Frontend:** React Native 0.76.9, Expo SDK 53
- **Navigation:** Expo Router
- **State:** Zustand
- **API Client:** Custom axios-based client
- **Backend:** 23 microservices (RABTUL-Technologies)

### App Structure

```
rez-app-consumer/
├── app/                    # 237 screens (Expo Router)
│   ├── (tabs)/             # Tab navigation
│   ├── checkout/          # Checkout flow
│   ├── orders/            # Order management
│   ├── wallet/            # Wallet & coins
│   └── ...
├── components/             # Reusable components
├── contexts/              # React contexts
├── hooks/                  # Custom hooks
├── services/               # API clients (233 files)
├── stores/                 # Zustand stores
├── types/                  # TypeScript types
└── utils/                  # Utilities
```

---

## Services Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REZ-Consumer App                          │
│                     (237 Screens, React Native)                  │
└─────────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
        ┌───────────────────┐   ┌───────────────────┐
        │   API Client      │   │  Direct Services   │
        │   (apiClient.ts) │   │  (authApi.ts,     │
        │                   │   │   walletApi.ts,   │
        │   - Auth token   │   │   etc.)           │
        │   - Retry       │   │                   │
        │   - Deduplication│   │                   │
        └───────────────────┘   └───────────────────┘
                    │                       │
                    ▼                       ▼
        ┌─────────────────────────────────────────────────────────┐
        │                  API Gateway                              │
        │           https://rez-api-gateway.onrender.com             │
        └─────────────────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┬───────────────┬───────────────┐
    │               │               │               │               │
    ▼               ▼               ▼               ▼               ▼
┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐
│ Auth  │    │Wallet │    │Payment│    │ Orders│    │Search │
└───────┘    └───────┘    └───────┘    └───────┘    └───────┘
```

### Connected Services (23)

| Service | Routes | Status |
|---------|--------|--------|
| Auth Service | `/user/auth/*` | ✅ |
| Wallet Service | `/wallet/*` | ✅ |
| Payment Service | `/payment/*` | ✅ |
| Order Service | `/orders/*` | ✅ |
| Catalog Service | `/products/*`, `/categories/*` | ✅ |
| Search Service | `/search/*` | ✅ |
| Profile Service | `/profile/*` | ✅ |
| Booking Service | `/bookings/*` | ✅ |
| Articles Service | `/articles/*` | ✅ |
| Bill Payments | `/bills/*` | ✅ |
| Cashback Service | `/cashback/*` | ✅ |
| Gamification | `/achievements/*`, `/challenges/*` | ✅ |
| Creator Earnings | `/creators/*` | ✅ |
| Notifications | `/notifications/*` | ✅ |
| Analytics | `/events/*` | ✅ |

---

## Environment Variables

### Required Variables

```bash
# API Gateway (Main Entry Point)
EXPO_PUBLIC_API_BASE_URL=https://rez-api-gateway.onrender.com/api

# Core Services
EXPO_PUBLIC_AUTH_SERVICE_URL=https://rez-auth-service.onrender.com
EXPO_PUBLIC_WALLET_SERVICE_URL=https://rez-wallet-service-36vo.onrender.com
EXPO_PUBLIC_PAYMENT_SERVICE_URL=https://rez-payment-service.onrender.com
EXPO_PUBLIC_ORDER_SERVICE_URL=https://rez-order-service.onrender.com
EXPO_PUBLIC_SEARCH_SERVICE_URL=https://rez-search-service.onrender.com
EXPO_PUBLIC_CATALOG_SERVICE_URL=https://rez-catalog-service-1.onrender.com

# Business Services
EXPO_PUBLIC_ARTICLES_SERVICE_URL=https://rez-articles-service.onrender.com
EXPO_PUBLIC_BILL_PAYMENTS_SERVICE_URL=https://rez-bill-payments-service.onrender.com
EXPO_PUBLIC_CASHBACK_SERVICE_URL=https://rez-cashback-service.onrender.com
EXPO_PUBLIC_GAMIFICATION_SERVICE_URL=https://rez-gamification-service.onrender.com
EXPO_PUBLIC_CREATOR_EARNINGS_SERVICE_URL=https://rez-creator-earnings-service.onrender.com
EXPO_PUBLIC_BOOKING_SERVICE_URL=https://rez-booking-service.onrender.com

# External Services
GOOGLE_MAPS_API_KEY=your_key
RAZORPAY_KEY_ID=your_key
FIREBASE_API_KEY=your_key
```

---

## API Services

### API Clients (services/*.ts)

| Service | File | Purpose |
|---------|------|---------|
| Auth | `authApi.ts` | Login, OTP, profile |
| Wallet | `walletApi.ts` | Balance, transactions |
| Payment | `paymentApi.ts` | Razorpay, checkout |
| Orders | `orderApi.ts` | Cart, orders |
| Catalog | `catalogApi.ts` | Products, categories |
| Search | `searchApi.ts` | Product search |
| Articles | `articlesApi.ts` | Editorial content |
| Bill Payments | `billPaymentApi.ts` | Pay bills |
| Cashback | `cashbackApi.ts` | Cashback management |
| Gamification | `gamificationApi.ts` | Achievements, challenges |
| Creator | `creatorsApi.ts` | Creator dashboard |

### Using API Client

```typescript
import apiClient from '@/services/apiClient';
import authApi from '@/services/authApi';

// Using the base client
const response = await apiClient.get('/products', { category: 'electronics' });

// Using a service module
const user = await authApi.getProfile();
const balance = await walletApi.getBalance();
```

---

## Feature Modules

### 1. Authentication

**Files:** `services/authApi.ts`, `contexts/AuthContext.tsx`

**Flow:**
1. Send OTP → `/user/auth/send-otp`
2. Verify OTP → `/user/auth/verify-otp`
3. Get Profile → `/user/auth/me`

```typescript
// Login with OTP
const { sendOTP, verifyOTP } = useAuth();
await sendOTP('+919876543210');
await verifyOTP('123456');
```

### 2. Wallet & Coins

**Files:** `services/walletApi.ts`, `contexts/WalletContext.tsx`

**Flow:**
1. Get Balance → `/wallet/balance`
2. Transactions → `/wallet/transactions`
3. Withdraw → `/wallet/withdraw`

### 3. Shopping

**Files:** `services/catalogApi.ts`, `services/cartApi.ts`, `services/orderApi.ts`

**Flow:**
1. Browse Products → `/products`
2. Add to Cart → `/cart/add`
3. Checkout → `/orders` → `/payment/*`

### 4. Gamification

**Files:** `services/gamificationApi.ts`, `services/achievementApi.ts`

**Features:**
- Achievements → `/achievements`
- Challenges → `/challenges`
- Badges → `/badges`
- Leaderboard → `/leaderboard`

---

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E Tests ( Detox )
npm run test:e2e
```

### Test Files

```
__tests__/
├── unit/          # Unit tests
├── integration/    # Integration tests
└── e2e/          # End-to-end tests
```

---

## Deployment

### Build Commands

```bash
# Development
npm start

# Android
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview

# Production
eas build --platform all --profile production
```

### EAS Build

```bash
# Configure EAS
eas build:configure

# Submit to App Store
eas submit --platform ios --latest
```

---

## Security

### Implemented

- ✅ CSRF protection (production blocking)
- ✅ JWT token refresh
- ✅ Secure storage (expo-secure-store)
- ✅ Encrypted AsyncStorage (secureAsyncStorage)
- ✅ Error sanitization
- ✅ ESLint rules (no-console, no Math.random())

### Best Practices

1. Never log sensitive data
2. Use `logger` instead of `console.log`
3. Validate all user inputs
4. Use Zod schemas for API responses

---

## Monitoring

### Sentry Integration

All errors are tracked via Sentry:

```typescript
import * as Sentry from '@sentry/react-native';
```

### Analytics Events

```typescript
import eventAnalytics from '@/services/eventAnalytics';

eventAnalytics.track('page_view', { page: '/home' });
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| API 401 | Token expired, re-login required |
| API 500 | Check service health at `/health` |
| Build fails | Run `expo start --clear` |
| Native modules | Rebuild with `npx expo prebuild` |

### Health Checks

```bash
# Check all services
curl https://rez-api-gateway.onrender.com/health
```

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-05-12 | 1.0.0 | Initial comprehensive guide |
| 2026-05-12 | 1.0.0 | Added 5 new services (articles, bill-payments, cashback, gamification, creator-earnings) |
| 2026-05-12 | 1.0.0 | Security fixes applied |

---

## Support

For issues, contact the platform team.
