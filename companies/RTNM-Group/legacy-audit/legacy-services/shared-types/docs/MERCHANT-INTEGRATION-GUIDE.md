# Rez Merchant Integration Guide

This guide covers how to integrate with the Rez Merchant Service for QR code systems including Room QR, Menu QR, Rez Now, and Ads QR.

## Overview

The Rez Merchant Service provides unified endpoints for all QR-based systems through:

- **Public QR Endpoints**: No authentication required for QR scanning
- **Merchant Endpoints**: Authenticated endpoints for merchant operations
- **SDK Packages**: Type-safe SDKs for each integration type

## Quick Start

### Using the Merchant SDK

```typescript
import { MerchantSDK } from '@rez/merchant-sdk';

// Initialize SDK
const sdk = new MerchantSDK({
  baseUrl: 'https://api.rez.money',
  token: 'your-merchant-token', // Optional for public endpoints
});

// Get store by slug
const store = await sdk.store.getBySlug('my-restaurant');

// Get menu
const menu = await sdk.menu.get(store.id);

// Track analytics
await sdk.analytics.trackScan(store.id, { source: 'menu_qr' });
```

## QR System Integration Points

### Room QR (Hotels)

Room QR codes enable hotel guests to access:
- Room service ordering
- Housekeeping requests
- Maintenance reporting
- Hotel information
- Quick actions

**Endpoints:**
- `GET /qr/public/hotel/:hotelId/room/:roomId` - Get room info
- `GET /qr/public/services/:storeId` - Get available services
- `POST /qr/public/service-request` - Submit service request

**Example:**
```typescript
import { getHotelRoomInfo, orderRoomService } from '@hotel-ota/merchant-sdk';

const roomInfo = await getHotelRoomInfo(hotelId, roomId);

const order = await orderRoomService(
  hotelId,
  roomId,
  roomInfo.hotel.id,
  [
    { name: 'Breakfast', quantity: 2 },
    { name: 'Coffee', quantity: 2 }
  ]
);
```

### Menu QR (Restaurants)

Menu QR codes provide:
- Store information
- Full menu with categories
- Product details with pricing
- Availability status

**Endpoints:**
- `GET /qr/public/store/:slug` - Get store info
- `GET /qr/public/store/id/:storeId` - Get store by ID
- `GET /qr/public/menu/:storeId` - Get full menu

**Example:**
```typescript
import { getStoreBySlug, getStoreMenu } from '@rez-now/merchant';

const store = await getStoreBySlug('my-restaurant');
const menu = await getStoreMenu(store.id);

// Search products
const products = menu.categories
  .flatMap(c => c.products)
  .filter(p => p.name.includes('burger'));
```

### Rez Now

Rez Now pages use:
- Store profile information
- Services catalog
- Appointment booking
- Analytics tracking

**Endpoints:**
- All store operations
- All menu operations
- Analytics tracking

**Example:**
```typescript
import { trackMenuView, trackOrder } from '@rez-now/merchant';

trackMenuView(storeId, { customerId, sessionId });

trackOrder(storeId, orderId, total, { customerId, sessionId });
```

### Ads QR (Advertising)

Ads QR codes provide:
- Campaign information
- Brand details
- Store locations
- Campaign analytics

**Endpoints:**
- `GET /qr/public/campaign/:campaignId` - Get campaign
- `GET /qr/merchant/campaigns` - List campaigns
- `GET /qr/merchant/campaigns/:id/qr` - Get campaign QR data

**Example:**
```typescript
import { getCampaignById, trackCampaignView } from '@ads-qr/merchant';

const campaign = await getCampaignById(campaignId);

trackCampaignView(campaignId, { storeId, customerId });
```

## API Reference

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/qr/public/store/:slug` | Get store by slug |
| GET | `/qr/public/store/id/:storeId` | Get store by ID |
| GET | `/qr/public/menu/:storeId` | Get full menu |
| GET | `/qr/public/services/:storeId` | Get services catalog |
| GET | `/qr/public/campaign/:campaignId` | Get campaign |
| GET | `/qr/public/hotel/:hotelId/room/:roomId` | Get hotel room info |
| POST | `/qr/public/service-request` | Submit service request |
| POST | `/qr/public/analytics/track` | Track analytics event |

### Merchant Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/qr/merchant/stores` | List merchant stores |
| GET | `/qr/merchant/stores/:id/analytics` | Store QR analytics |
| POST | `/qr/merchant/stores/:id/regenerate` | Regenerate QR codes |
| GET | `/qr/merchant/qr-links` | Get all QR links |
| GET | `/qr/merchant/campaigns` | List campaigns |
| GET | `/qr/merchant/campaigns/:id/qr` | Get campaign QR data |
| POST | `/qr/merchant/campaigns` | Create campaign |
| PUT | `/qr/merchant/campaigns/:id` | Update campaign |
| DELETE | `/qr/merchant/campaigns/:id` | Delete campaign |

## Data Types

### Store

```typescript
interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string[];
  category: string;
  subcategories?: string[];
  location: {
    address: string;
    city: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number];
    landmark?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
  };
  operationalInfo?: {
    hours?: Record<string, { open: string; close: string }>;
    dineIn?: boolean;
    delivery?: boolean;
    takeaway?: boolean;
  };
  storeType?: 'restaurant' | 'cafe' | 'bakery' | 'salon' | 'spa' | 'retail' | 'other';
  acceptsOnlineOrders?: boolean;
  acceptsScanPay?: boolean;
  deliveryEnabled?: boolean;
  ratings?: { average: number; count: number };
  tags?: string[];
  features?: string[];
}
```

### Menu

```typescript
interface Menu {
  store: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    category: string;
  };
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    image?: string;
    sortOrder?: number;
    products: MenuProduct[];
  }>;
  totalProducts: number;
}

interface MenuProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  images: Array<{ url: string; alt?: string; isPrimary?: boolean }>;
  pricing: {
    original: number;
    selling: number;
    discount?: number;
    currency: string;
  };
  inventory: {
    stock: number;
    isAvailable: boolean;
    unlimited?: boolean;
  };
  isVeg?: boolean;
  tags?: string[];
  preparationTime?: number;
}
```

### Service Request

```typescript
interface ServiceRequest {
  type: 'room_service' | 'housekeeping' | 'maintenance' | 'general' | 'order';
  storeId: string;
  roomId?: string;
  hotelId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  request: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  items?: Array<{
    productId?: string;
    name: string;
    quantity: number;
    notes?: string;
  }>;
  scheduledTime?: string;
}
```

## SDK Packages

### @rez/merchant-sdk

Main SDK for all QR integrations.

```bash
npm install @rez/merchant-sdk
```

### @hotel-ota/merchant-sdk

Hotel-specific SDK for room service and housekeeping.

```bash
npm install @hotel-ota/merchant-sdk
```

### Integration Libraries

- `rez-now/lib/api/merchantIntegration.ts` - Rez Now integration
- `adsqr/src/lib/merchant.ts` - Ads QR integration

## Authentication

### Public Endpoints

No authentication required. These endpoints are designed for QR code scanning.

### Merchant Endpoints

Require Bearer token authentication:

```typescript
const sdk = new MerchantSDK({
  baseUrl: 'https://api.rez.money',
  token: 'your-merchant-token',
});
```

Or set the token after initialization:

```typescript
sdk.setToken('your-merchant-token');
```

## Error Handling

All SDK methods throw typed errors:

```typescript
try {
  const store = await sdk.store.getBySlug('my-restaurant');
} catch (error) {
  if (error.code === 'STORE_NOT_FOUND') {
    // Handle not found
  } else if (error.code === 'VALIDATION_ERROR') {
    // Handle validation error
  } else {
    // Handle other errors
  }
}
```

## Rate Limiting

Public endpoints are rate-limited to 300 requests per 15 minutes per IP.

Merchant endpoints are rate-limited to 100 requests per minute per merchant.

## Caching

Public QR endpoints cache responses for 3-5 minutes:
- Store info: 5 minutes
- Menu: 3 minutes

Use cache-busting query parameters if real-time data is required.

## Analytics Tracking

Track all QR interactions for analytics:

```typescript
await sdk.analytics.trackScan(storeId, {
  source: 'room_qr',
  customerId: 'customer-123',
  sessionId: 'session-456',
});

await sdk.analytics.trackMenuView(storeId, {
  customerId: 'customer-123',
  source: 'menu_qr',
});

await sdk.analytics.trackOrder(storeId, {
  orderId: 'order-789',
  total: 1500,
  customerId: 'customer-123',
  source: 'menu_qr',
});
```

## Webhooks

Configure webhooks for real-time updates in `docs/WEBHOOKS.md`.

## Support

- Documentation: https://docs.rez.money
- API Status: https://status.rez.money
- Support: support@rez.money
