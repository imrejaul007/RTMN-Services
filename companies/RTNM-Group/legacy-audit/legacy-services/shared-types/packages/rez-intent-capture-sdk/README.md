# @rez/intent-capture-sdk

Unified Intent Capture SDK for ReZ ecosystem apps.

## Installation

```bash
npm install @rez/intent-capture-sdk
```

## Usage

### Basic Setup

```typescript
import { IntentCapture, initIntentCapture, getIntentCapture } from '@rez/intent-capture-sdk';

// Initialize once at app startup
const intentCapture = initIntentCapture({
  baseUrl: 'https://api.rez.example.com',
  appType: 'hotel_ota',
  userId: 'user123', // Optional, can be set later
});

// Or get the singleton instance anywhere in your app
const capture = getIntentCapture();
```

### Capture Individual Events

```typescript
// Basic capture
await intentCapture.capture({
  userId: 'user123',
  intentKey: 'hotel_search_mumbai',
  eventType: 'search',
  category: 'TRAVEL',
  metadata: { city: 'Mumbai', checkin: '2024-04-01', checkout: '2024-04-05' },
});

// View a product
await intentCapture.capture({
  userId: 'user123',
  intentKey: 'hotel_view_hotel_456',
  eventType: 'view',
  category: 'TRAVEL',
  metadata: { hotelId: 'hotel_456', city: 'Mumbai' },
});

// Add to wishlist
await intentCapture.capture({
  userId: 'user123',
  intentKey: 'hotel_wishlist_hotel_456',
  eventType: 'wishlist',
  category: 'TRAVEL',
  metadata: { hotelId: 'hotel_456' },
});
```

### Batch Capture

```typescript
// Capture multiple events at once
await intentCapture.captureBatch([
  { userId: 'user123', intentKey: 'hotel_view_1', eventType: 'view', category: 'TRAVEL' },
  { userId: 'user123', intentKey: 'hotel_view_2', eventType: 'view', category: 'TRAVEL' },
  { userId: 'user123', intentKey: 'hotel_view_3', eventType: 'view', category: 'TRAVEL' },
]);
```

### Retrieve User Intents

```typescript
// Get active intents
const activeIntents = await intentCapture.getActiveIntents('user123');
// Returns: [{ id, intentKey, category, confidence, status, lastSeenAt }, ...]

// Get dormant intents for revival
const dormantIntents = await intentCapture.getDormantIntents('user123');
// Returns: [{ id, intentKey, category, revivalScore, daysDormant }, ...]
```

### Pre-built Helpers

```typescript
import { createHotelIntentCapture, createRestaurantIntentCapture } from '@rez/intent-capture-sdk';

// Hotel-specific capture
const hotelCapture = createHotelIntentCapture('https://api.rez.example.com', 'user123');

hotelCapture.search({ city: 'Mumbai', checkin: '2024-04-01', checkout: '2024-04-05' });
hotelCapture.view({ hotelId: 'hotel_456', city: 'Mumbai' });
hotelCapture.hold({ hotelId: 'hotel_456', roomTypeId: 'room_789', checkin: '2024-04-01', checkout: '2024-04-05' });
hotelCapture.fulfill({ hotelId: 'hotel_456', bookingId: 'booking_123' });

// Restaurant-specific capture
const restaurantCapture = createRestaurantIntentCapture('https://api.rez.example.com', 'user123');

restaurantCapture.viewStore({ storeSlug: 'pizza-palace' });
restaurantCapture.addToCart({ storeSlug: 'pizza-palace', itemId: 'item_123', itemName: 'Margherita Pizza' });
restaurantCapture.checkout({ storeSlug: 'pizza-palace', orderId: 'order_456' });
restaurantCapture.orderPlaced({ storeSlug: 'pizza-palace', orderId: 'order_456' });
```

### React Integration

```typescript
import { createIntentTracker, initIntentCapture } from '@rez/intent-capture-sdk';

// Initialize at app start
initIntentCapture({
  baseUrl: 'https://api.rez.example.com',
  appType: 'hotel_ota',
});

// Create a tracker function
const trackIntent = createIntentTracker(getIntentCapture()!);

// In your component
function HotelSearchPage() {
  const handleSearch = (city: string) => {
    trackIntent('search', { city })({
      userId: currentUser.id,
      intentKey: `hotel_search_${city.toLowerCase()}`,
      category: 'TRAVEL',
    });
  };

  const handleHotelView = (hotelId: string) => {
    trackIntent('view', { hotelId })({
      userId: currentUser.id,
      intentKey: `hotel_view_${hotelId}`,
      category: 'TRAVEL',
    });
  };

  // ... component code
}
```

### Event Weights

| Event Type | Weight | Description |
|------------|--------|-------------|
| `search` | 0.15 | User performed a search |
| `view` | 0.10 | User viewed an item |
| `wishlist` | 0.25 | User added to wishlist |
| `cart_add` | 0.30 | User added to cart |
| `hold` | 0.35 | User initiated hold |
| `checkout_start` | 0.40 | User started checkout |
| `fulfilled` | 1.0 | Purchase completed |
| `abandoned` | -0.2 | User abandoned cart |

### App Types

- `hotel_ota` - Hotel booking app
- `restaurant` - Restaurant/food ordering
- `retail` - E-commerce retail
- `hotel_guest` - In-hotel guest services

### Categories

- `TRAVEL` - Hotel and travel bookings
- `DINING` - Restaurant and food orders
- `RETAIL` - E-commerce products
- `HOTEL_SERVICE` - In-hotel services
- `GENERAL` - General intents

## API Reference

### IntentCapture

```typescript
class IntentCapture {
  constructor(config: IntentConfig);

  // Set the current user
  setUser(userId: string): void;

  // Clear the current user
  clearUser(): void;

  // Capture a single intent
  capture(params: CaptureParams): Promise<void>;

  // Capture multiple intents in batch
  captureBatch(params: CaptureParams[]): Promise<void>;

  // Get active intents for a user
  getActiveIntents(userId?: string): Promise<ActiveIntent[]>;

  // Get dormant intents for a user
  getDormantIntents(userId?: string): Promise<DormantIntent[]>;
}
```

### Types

```typescript
type AppType = 'hotel_ota' | 'restaurant' | 'retail' | 'hotel_guest';
type EventType = 'search' | 'view' | 'wishlist' | 'cart_add' | 'hold' | 'checkout_start' | 'fulfilled' | 'abandoned';
type Category = 'TRAVEL' | 'DINING' | 'RETAIL' | 'HOTEL_SERVICE' | 'GENERAL';

interface CaptureParams {
  userId?: string;
  intentKey: string;
  eventType: EventType;
  category: Category;
  metadata?: Record<string, unknown>;
}

interface IntentConfig {
  baseUrl: string;
  appType: AppType;
  userId?: string;
}

interface ActiveIntent {
  id: string;
  intentKey: string;
  category: string;
  confidence: number;
  status: string;
  lastSeenAt: string;
}

interface DormantIntent {
  id: string;
  intentKey: string;
  category: string;
  revivalScore: number;
  daysDormant: number;
}
```

## License

MIT
