# REZ QR SDK

Unified SDK for all REZ QR systems - Room QR, Menu QR, Rez Now, and Ads QR.

## Features

- **Room QR**: Hotel room service, checkout, and feedback
- **Menu QR**: Restaurant digital menu, ordering, and split bill
- **Rez Now**: Linktree-style store profiles and QR generation
- **Ads QR**: Campaign management, rewards, and attribution
- **AI Services**: Recommendations, chat, and intent detection
- **Auth**: OTP login, session management, and user profiles
- **Wallet**: Balance, payments, and transactions

## Installation

```bash
npm install @rez/qr-sdk
```

## Quick Start

```typescript
import { QRSDK } from '@rez/qr-sdk';

const sdk = new QRSDK({
  apiKey: 'your-api-key',
  environment: 'production',
});

// Scan hotel room QR
const room = await sdk.room.validateQR('REZ-ROOM-HOTEL001-305');
console.log(`Welcome to ${room.hotelName}, Room ${room.roomNumber}`);

// Order room service
const request = await sdk.room.submitRequest({
  roomId: room.id,
  category: 'room_service',
  itemId: 'coffee',
  priority: 'normal',
  notes: 'With oat milk'
});

// Pay with wallet
const receipt = await sdk.room.checkout(billId, {
  method: 'wallet',
  amount: bill.total
});
```

## Configuration

```typescript
const sdk = new QRSDK({
  // Environment (default: production)
  environment: 'production',

  // API Key (get from REZ dashboard)
  apiKey: 'your-api-key',

  // Custom service URLs (optional)
  baseUrl: 'https://api.rez.money',
  walletUrl: 'https://wallet.rez.money',
  authUrl: 'https://auth.rez.money',

  // Request timeout (default: 30000ms)
  timeout: 30000,

  // Debug mode
  debug: false,
});
```

## Room QR

Hotel room service, checkout, and feedback.

```typescript
// Validate room QR
const room = await sdk.room.validateQR(qrData);

// Get room details
const room = await sdk.room.getRoom(roomId);

// Submit service request
const request = await sdk.room.submitRequest({
  roomId: room.id,
  category: 'room_service',
  itemId: 'coffee',
  quantity: 1,
  priority: 'normal',
  notes: 'With oat milk'
});

// Get bill
const bill = await sdk.room.getBill(roomId);

// Checkout
const receipt = await sdk.room.checkout(bill.id, {
  method: 'wallet',
  amount: bill.total
});

// Submit feedback
await sdk.room.submitFeedback({
  type: 'stay',
  rating: 5,
  comment: 'Great stay!'
});
```

## Menu QR

Restaurant digital menu, ordering, and split bill.

```typescript
// Get menu
const menu = await sdk.menu.getMenu(storeId);

// Filter by dietary
const filtered = sdk.menu.filterByDietary(menu.items, {
  vegetarian: true,
  glutenFree: true
});

// Add to cart
const cart = await sdk.menu.addToCart(storeId, itemId, quantity);

// Place order
const order = await sdk.menu.placeOrder(storeId, cart.cartId, {
  tableNumber: '12'
});

// Split bill
const splits = [
  { type: 'equal' },
  { type: 'equal' }
];
await sdk.menu.splitBill(order.orderId, splits);

// Pay
const receipt = await sdk.menu.checkout(order.orderId, {
  method: 'wallet',
  amount: total
});
```

## Store QR (Rez Now)

Linktree-style store profiles.

```typescript
// Get store profile
const profile = await sdk.store.getProfile(slug);

// Get store links
const links = await sdk.store.getLinks(storeId);

// Generate QR code
const qr = await sdk.store.generateQR(storeId, 'menu', {
  size: 300
});

// Track analytics
await sdk.store.trackEvent(storeId, {
  eventType: 'scan',
  source: 'qr',
  timestamp: new Date().toISOString()
});
```

## Campaign QR (Ads)

Campaign management and rewards.

```typescript
// Get campaign
const campaign = await sdk.campaign.getCampaign(slug);

// Claim reward
const reward = await sdk.campaign.claimReward(campaign.id, 'discount');

// Book consultation
const booking = await sdk.campaign.bookConsultation({
  campaignId: campaign.id,
  name: 'John Doe',
  email: 'john@example.com',
  preferredDate: '2024-01-20'
});

// Request sample
const sample = await sdk.campaign.requestSample(campaign.id, sampleId, {
  name: 'John Doe',
  line1: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94102',
  country: 'USA'
});

// Track conversion
await sdk.campaign.trackConversion(campaign.id, {
  type: 'purchase',
  value: 99.99
});
```

## AI Services

Personalized recommendations and chat.

```typescript
// Get recommendations
const recs = await sdk.ai.getRecommendations({
  source: 'room_qr',
  roomId: room.id,
  timeOfDay: 'morning',
  stayDuration: '3 nights'
});

// Chat with AI
const response = await sdk.ai.sendMessage(
  "I'd like to find a good restaurant for dinner",
  { source: 'room_qr', roomId: room.id }
);

// Detect intent
const intent = await sdk.ai.detectIntent(
  "I want to order food",
  { source: 'room_qr' }
);
```

## Auth

OTP login and session management.

```typescript
// Request OTP
await sdk.auth.loginWithOTP('+1234567890');

// Verify OTP
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

## Wallet

Balance, payments, and transactions.

```typescript
// Get balance
const balance = await sdk.wallet.getBalance();

// Pay from wallet
const result = await sdk.wallet.pay(25.99, 'Room service');

// Add funds
const tx = await sdk.wallet.addFunds(100, {
  type: 'card',
  id: 'card-123'
});

// Get transactions
const transactions = await sdk.wallet.getTransactions({
  limit: 10,
  type: 'credit'
});

// Get spending insights
const insights = await sdk.wallet.getInsights({ period: 'month' });
```

## Examples

See the `examples/` directory for complete examples:

- `examples/room-qr.ts` - Hotel room service flow
- `examples/menu-qr.ts` - Restaurant ordering flow
- `examples/store-qr.ts` - Store profile and links
- `examples/campaign-qr.ts` - Campaign engagement
- `examples/full-integration.ts` - Complete end-to-end flow

## Testing

```bash
# Run all tests
npm test

# Run integration tests only
npm run test:integration
```

## Documentation

See [docs/](docs/) for detailed documentation.

## Environment Support

- Node.js 18+
- TypeScript 5.0+
- Browser (ESM)

## License

MIT
