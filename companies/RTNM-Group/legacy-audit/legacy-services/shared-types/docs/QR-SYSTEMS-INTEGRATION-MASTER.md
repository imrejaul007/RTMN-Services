# REZ QR Systems Integration Master Documentation

## Overview

This document provides comprehensive integration documentation for all REZ QR systems, including endpoints, SDK usage, integration flows, testing, and deployment checklists.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Service Endpoints](#service-endpoints)
3. [SDK Documentation](#sdk-documentation)
4. [Integration Flows](#integration-flows)
5. [Testing Guide](#testing-guide)
6. [Deployment Checklist](#deployment-checklist)

---

## System Architecture

### Microservices Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           REZ QR Ecosystem                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐          │
│  │   Room QR    │     │   Menu QR    │     │  Store QR   │          │
│  │   (Hotel)    │     │(Restaurant)  │     │  (Linktree) │          │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘          │
│         │                    │                     │                    │
│         └────────────────────┼─────────────────────┘                    │
│                              │                                            │
│                              ▼                                            │
│                    ┌──────────────────┐                                  │
│                    │   REZ QR SDK     │                                  │
│                    │  (Unified API)   │                                  │
│                    └────────┬─────────┘                                  │
│                             │                                             │
│         ┌──────────────────┼──────────────────┐                          │
│         │                  │                  │                          │
│         ▼                  ▼                  ▼                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐                   │
│  │    Auth    │    │   Wallet   │    │    AI      │                   │
│  │  Service   │    │  Service   │    │  Service   │                   │
│  └────────────┘    └────────────┘    └────────────┘                   │
│         │                  │                  │                          │
│         └──────────────────┼──────────────────┘                          │
│                            │                                             │
│                            ▼                                             │
│                   ┌─────────────────┐                                   │
│                   │    Payment      │                                   │
│                   │    Service      │                                   │
│                   └─────────────────┘                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Service URLs

#### Development Environment
| Service | URL |
|---------|-----|
| API | http://localhost:3001 |
| Wallet | http://localhost:4004 |
| Payment | http://localhost:4001 |
| Auth | http://localhost:4002 |
| Merchant | http://localhost:4005 |
| Intent | https://rez-intent-graph.onrender.com |
| Chat | https://REZ-support-copilot.onrender.com |
| Knowledge Base | https://rez-knowledge-base.onrender.com |

#### Staging Environment
| Service | URL |
|---------|-----|
| API | https://staging-api.rez.money |
| Wallet | https://staging-wallet.rez.money |
| Payment | https://staging-payment.rez.money |
| Auth | https://staging-auth.rez.money |
| Merchant | https://staging-merchant.rez.money |
| Intent | https://staging-intent.rez.money |
| Chat | https://staging-chat.rez.money |
| Knowledge Base | https://staging-knowledge.rez.money |

#### Production Environment
| Service | URL |
|---------|-----|
| API | https://api.rez.money |
| Wallet | https://wallet.rez.money |
| Payment | https://payment.rez.money |
| Auth | https://auth.rez.money |
| Merchant | https://merchant.rez.money |
| Intent | https://rez-intent-graph.onrender.com |
| Chat | https://REZ-support-copilot.onrender.com |
| Knowledge Base | https://rez-knowledge-base.onrender.com |

---

## Service Endpoints

### Room QR Endpoints

```
Base URL: {apiUrl}/qr/room

POST   /validate                    - Validate room QR code
POST   /requests                    - Submit service request
GET    /requests/:roomId            - Get room requests
GET    /requests/:requestId        - Get request status
DELETE /requests/:requestId        - Cancel request
POST   /checkout                    - Checkout and pay
POST   /feedback                    - Submit feedback
GET    /feedback/:feedbackId       - Get feedback status
```

### Menu QR Endpoints

```
Base URL: {apiUrl}/stores/:storeId

GET    /menu                        - Get full menu
GET    /menu/categories             - Get categories
GET    /menu/categories/:id/items   - Get items by category
GET    /menu/items/:id              - Get item details
GET    /menu/search                 - Search items
POST   /cart                        - Add to cart
GET    /cart/:cartId                - Get cart
PUT    /cart/:cartId/items/:id      - Update cart item
DELETE /cart/:cartId/items/:id      - Remove from cart
POST   /orders                      - Place order
GET    /orders/:orderId             - Get order
POST   /call-waiter                 - Call waiter
POST   /orders/:orderId/bill        - Request bill
POST   /orders/:orderId/split       - Split bill
POST   /orders/:orderId/checkout    - Pay order
POST   /reservations                - Make reservation
GET    /reservations/slots         - Get reservation slots
```

### Store QR Endpoints

```
Base URL: {apiUrl}/stores

GET    /profile/:slug               - Get store profile by slug
GET    /:storeId                    - Get store by ID
GET    /:storeId/links              - Get store links
POST   /:storeId/qr/generate        - Generate QR code
GET    /:storeId/qr                - Get all QR codes
POST   /:storeId/analytics         - Track analytics
GET    /:storeId/analytics          - Get analytics
GET    /:storeId/reviews           - Get reviews
POST   /:storeId/reviews           - Submit review
GET    /nearby                     - Get nearby stores
GET    /search                     - Search stores
```

### Campaign QR Endpoints

```
Base URL: {apiUrl}/campaigns

GET    /:slug                      - Get campaign by slug
GET    /id/:campaignId             - Get campaign by ID
GET    /active                     - Get active campaigns
GET    /:campaignId/rewards        - Get rewards
POST   /:campaignId/rewards/claim  - Claim reward
GET    /:campaignId/analytics      - Get analytics
POST   /consultations              - Book consultation
GET    /consultations/:id         - Get consultation
DELETE /consultations/:id         - Cancel consultation
POST   /:campaignId/samples        - Request sample
GET    /samples/:id               - Get sample status
POST   /:campaignId/conversions    - Track conversion
```

### AI Endpoints

```
Base URL: {apiUrl}/ai
Intent URL: {intentUrl}

POST   /recommendations            - Get recommendations
POST   /recommendations/room       - Room recommendations
POST   /recommendations/menu       - Menu recommendations
POST   /recommendations/store      - Store recommendations
POST   /chat                       - Chat with AI
POST   /suggestions                - Get suggestions
POST   /upsells                    - Get upsells
POST   /offers                     - Get personalized offers
POST   /sentiment                  - Analyze sentiment
POST   /feedback-response          - Generate feedback response
POST   /menu-description           - Generate menu description
POST   /translate-menu             - Translate menu
POST   /order-compliance           - Check dietary compliance
GET    /wait-time/:storeId         - Get wait time estimate
POST   /greeting                   - Generate greeting

Intent Service:
POST   /detect                     - Detect intent
POST   /alternatives               - Get intent alternatives
```

### Auth Endpoints

```
Base URL: {authUrl}/auth

POST   /otp/request                - Request OTP
POST   /otp/verify                  - Verify OTP
POST   /otp/resend                  - Resend OTP
POST   /email/login                 - Login with email
POST   /email/register              - Register
POST   /logout                      - Logout
GET    /session                     - Get session
GET    /profile                     - Get profile
PATCH  /profile                     - Update profile
GET    /preferences                 - Get preferences
PATCH  /preferences                 - Update preferences
POST   /password/change             - Change password
POST   /password/reset/request      - Request password reset
POST   /password/reset              - Reset password
POST   /email/verify                - Verify email
POST   /phone/link                  - Link phone
POST   /phone/verify                - Verify phone
```

### Wallet Endpoints

```
Base URL: {walletUrl}/wallet

GET    /balance                    - Get balance
GET    /coins                       - Get coin balances
POST   /pay                         - Pay from wallet
POST   /add-funds                   - Add funds
GET    /payment-methods             - Get payment methods
POST   /payment-methods             - Add payment method
DELETE /payment-methods/:id         - Remove payment method
PATCH  /payment-methods/:id         - Set default method
GET    /transactions                - Get transactions
GET    /transactions/:id            - Get transaction
GET    /transactions/pending        - Get pending transactions
DELETE /transactions/:id           - Cancel pending transaction
POST   /refunds                     - Request refund
GET    /refunds/:id                 - Get refund status
POST   /coins/convert               - Convert coins
GET    /coins/rates                 - Get conversion rates
POST   /gift                        - Gift coins
GET    /settings                    - Get settings
PATCH  /settings                    - Update settings
GET    /insights                    - Get spending insights
GET    /budget                      - Get budget status
POST   /budget                      - Set budget
```

---

## SDK Documentation

### Installation

```bash
npm install @rez/qr-sdk
```

### Initialization

```typescript
import { QRSDK } from '@rez/qr-sdk';

const sdk = new QRSDK({
  apiKey: 'your-api-key',
  environment: 'production', // or 'development', 'staging'
});
```

### Room QR Module

```typescript
// Validate QR
const room = await sdk.room.validateQR(qrData);

// Submit request
const request = await sdk.room.submitRequest({
  roomId: room.id,
  category: 'room_service',
  itemId: 'coffee',
  priority: 'normal',
  notes: 'With oat milk'
});

// Checkout
const receipt = await sdk.room.checkout(billId, {
  method: 'wallet',
  amount: bill.total
});

// Feedback
await sdk.room.submitFeedback({
  type: 'stay',
  rating: 5,
  comment: 'Great stay!'
});
```

### Menu QR Module

```typescript
// Get menu
const menu = await sdk.menu.getMenu(storeId);

// Filter dietary
const safeItems = sdk.menu.filterByDietary(menu.items, {
  vegetarian: true,
  glutenFree: true
});

// Add to cart
await sdk.menu.addToCart(storeId, itemId, 1);

// Place order
const order = await sdk.menu.placeOrder(storeId, cartId, {
  tableNumber: '12'
});

// Split bill
await sdk.menu.splitBill(orderId, [
  { type: 'equal' },
  { type: 'equal' }
]);

// Checkout
await sdk.menu.checkout(orderId, {
  method: 'wallet',
  amount: total
});
```

### Store QR Module

```typescript
// Get profile
const profile = await sdk.store.getProfile(slug);

// Generate QR
const qr = await sdk.store.generateQR(storeId, 'menu', {
  size: 300
});

// Track event
await sdk.store.trackEvent(storeId, {
  eventType: 'scan',
  source: 'qr',
  timestamp: new Date().toISOString()
});
```

### Campaign QR Module

```typescript
// Get campaign
const campaign = await sdk.campaign.getCampaign(slug);

// Claim reward
const reward = await sdk.campaign.claimReward(campaignId, 'discount');

// Book consultation
const booking = await sdk.campaign.bookConsultation({
  campaignId: campaign.id,
  name: 'John Doe',
  email: 'john@example.com'
});

// Track conversion
await sdk.campaign.trackConversion(campaignId, {
  type: 'purchase',
  value: 99.99
});
```

### AI Module

```typescript
// Get recommendations
const recs = await sdk.ai.getRecommendations({
  source: 'room_qr',
  roomId: room.id,
  timeOfDay: 'morning'
});

// Chat
const response = await sdk.ai.sendMessage(
  "I'd like to find a good restaurant",
  { source: 'room_qr', roomId: room.id }
);

// Detect intent
const intent = await sdk.ai.detectIntent(
  "I want to order food",
  { source: 'menu_qr' }
);
```

### Auth Module

```typescript
// Login
await sdk.auth.loginWithOTP('+1234567890');
const session = await sdk.auth.verifyOTP('+1234567890', '123456');

// Get profile
const profile = await sdk.auth.getProfile();

// Update preferences
await sdk.auth.updatePreferences({
  language: 'en',
  dietary: { vegetarian: true }
});

// Logout
await sdk.auth.logout();
```

### Wallet Module

```typescript
// Get balance
const balance = await sdk.wallet.getBalance();

// Pay
const result = await sdk.wallet.pay(25.99, 'Order #123');

// Add funds
await sdk.wallet.addFunds(100, { type: 'card', id: 'card-123' });

// Get transactions
const transactions = await sdk.wallet.getTransactions({ limit: 10 });

// Get insights
const insights = await sdk.wallet.getInsights({ period: 'month' });
```

---

## Integration Flows

### Flow 1: Room QR Scan to Checkout

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Guest     │     │    SDK      │     │    API      │     │   Wallet    │
│   Scans     │────▶│ validateQR  │────▶│   Server    │     │   Service   │
│   Room QR   │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘     └──────┬──────┘
                                               │                     │
                    ┌─────────────┐             │                     │
                    │   Guest    │◀────────────┤                     │
                    │   Views    │  Room Info  │                     │
                    │   Welcome  │             │                     │
                    └─────────────┘             │                     │
                                               │                     │
                    ┌─────────────┐             │                     │
                    │   Guest    │────────────▶│ Submit Request      │
                    │   Orders   │             │                     │
                    │   Service  │             │                     │
                    └─────────────┘             │                     │
                                               │                     │
                    ┌─────────────┐             │                     │
                    │   Guest    │◀────────────┤ Request Status       │
                    │   Tracks   │             │                     │
                    │   Request  │             │                     │
                    └─────────────┘             │                     │
                                               │                     │
                    ┌─────────────┐             │                     │
                    │   Guest    │────────────▶│ Request Bill         │
                    │   Requests │             │                     │
                    │   Checkout │             │                     │
                    └─────────────┘             │                     │
                                               │                     │
                                               │◀────────────────────┤
                    ┌─────────────┐             │     Pay with         │
                    │   Guest    │◀────────────┤     Wallet           │
                    │   Gets     │             │                     │
                    │   Receipt  │             │                     │
                    └─────────────┘             │                     │
```

### Flow 2: Menu QR Order to Payment

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Guest     │     │    SDK      │     │    API      │     │   Kitchen   │
│   Scans     │────▶│  getMenu    │────▶│   Server    │────▶│   Display   │
│   Menu QR   │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                                        │                     │
       │              ┌─────────────┐            │                     │
       │              │   Guest     │◀───────────┤ Menu Data           │
       │              │   Views     │            │                     │
       │              │   Menu      │            │                     │
       │              └─────────────┘            │                     │
       │                                        │                     │
       │              ┌─────────────┐            │                     │
       │              │   Guest     │───────────▶│ Add to Cart         │
       │              │   Selects   │            │                     │
       │              │   Items     │            │                     │
       │              └─────────────┘            │                     │
       │                                        │                     │
       │              ┌─────────────┐            │                     │
       │              │   Guest     │───────────▶│ Place Order         │
       │              │   Confirms  │            │                     │
       │              │   Order     │            │                     │
       │              └─────────────┘            │                     │
       │                                        │                     │
       │                                        │◀───────────────────┤
       │              ┌─────────────┐            │     Prepare         │
       │              │   Guest     │◀───────────┤     Order           │
       │              │   Tracks    │            │                     │
       │              │   Status    │            │                     │
       │              └─────────────┘            │                     │
       │                                        │                     │
       │              ┌─────────────┐            │                     │
       │              │   Guest     │───────────▶│ Request Bill        │
       │              │   Requests  │            │                     │
       │              │   Split     │            │                     │
       │              └─────────────┘            │                     │
       │                                        │                     │
       │              ┌─────────────┐            │                     │
       │              │   Guest     │───────────▶│ Checkout            │
       │              │   Pays     │            │                     │
       │              └─────────────┘            │                     │
       │                                        │                     │
       │                                        │◀───────────────────┤
       │              ┌─────────────┐            │     Payment         │
       │              │   Guest     │◀───────────┤     Complete        │
       │              │   Gets      │            │                     │
       │              │   Receipt   │            │                     │
       │              └─────────────┘            │                     │
```

---

## Testing Guide

### Unit Tests

```typescript
// Test dietary filtering
const filtered = sdk.menu.filterByDietary(items, { vegetarian: true });
expect(filtered).toHaveLength(expected);
```

### Integration Tests

```typescript
describe('Full QR Integration Flow', () => {
  test('Room QR: Scan -> Request -> Pay -> Feedback', async () => {
    const room = await sdk.room.validateQR(qrData);
    const request = await sdk.room.submitRequest({ roomId: room.id, ... });
    const receipt = await sdk.room.checkout(billId, { method: 'wallet', amount: bill.total });
    await sdk.room.submitFeedback({ type: 'stay', rating: 5 });
  });
});
```

### End-to-End Tests

Run with actual services:

```bash
npm run test:integration
```

### Verification Script

```bash
npx ts-node scripts/verify-integrations.ts
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Integration tests passing
- [ ] Code reviewed
- [ ] Environment variables configured
- [ ] API keys valid and accessible
- [ ] Service health checks passing

### Configuration

- [ ] Set `environment` to target (staging/production)
- [ ] Configure all service URLs
- [ ] Set API key from secure storage
- [ ] Configure timeout values
- [ ] Enable/disable debug mode

### Monitoring

- [ ] Set up logging
- [ ] Configure error tracking
- [ ] Set up alerts for service failures
- [ ] Monitor response times
- [ ] Track conversion metrics

### Security

- [ ] API keys stored securely
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] CORS configured properly

---

## Appendix

### Error Codes

| Code | Description |
|------|-------------|
| QR001 | Invalid QR code format |
| QR002 | QR code expired |
| QR003 | QR code already used |
| AUTH001 | Invalid OTP |
| AUTH002 | Session expired |
| WALLET001 | Insufficient balance |
| WALLET002 | Payment failed |
| PAYMENT001 | Payment declined |
| PAYMENT002 | Invalid payment method |

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Auth OTP | 5 per hour |
| Wallet Pay | 20 per minute |
| AI Chat | 30 per minute |
| Analytics Track | 100 per minute |

### Support

For issues or questions:
- Email: support@rez.money
- Documentation: docs.rez.money
- Status: status.rez.money
