# RTMN Commerce Memory - Integration Complete

**Date:** 2026-04-27
**Status:** ✅ All ecosystem apps integrated

## Summary

ReZ Mind's Intent Graph has been successfully integrated across the entire ReZ ecosystem:

### User Side Apps

| App | Location | Events Captured |
|-----|----------|-----------------|
| ReZ app | `rez-app-consumer/` | Flights, hotels, trains, cabs, bills |
| ReZ Now | `rez-now/` | Store view, menu, cart, checkout, order |
| ReZ web menu | `rez-web-menu/` | Menu view, item viewed |
| Room QR | `Hotel OTA/apps/api/` | Guest services scan |
| Rendez | `Rendez/` | Profile view, match, date planned |
| Karma | `rez-karma-service/` | Reward view, points earned, redemption |
| Stay Own | `Hotel OTA/hotel-pms/` | Check-in, room service, reviews |

### Merchant Side Apps

| App | Location | Events Captured |
|-----|----------|-----------------|
| ReZ merchants (OS) | `rez-merchant-service/` | Product added, order received, offers |
| AdBazzar | `adBazaar/` | Ad viewed, clicked, conversions, leads |
| NextaBiZ | `nextabizz/` | B2B search, quote requested, bulk orders |
| Hotel PMS | `Hotel OTA/hotel-pms/` | Check-in, room service, housekeeping |

### Backend Services Integrated

| Service | Events Captured |
|---------|-----------------|
| Hotel OTA API | Hotel search, view, hold, confirm, cancel |
| Resturistan API | Restaurant view, menu, cart, checkout |

## Apps Already Integrated

### 1. Hotel OTA
**Location:** `Hotel OTA/apps/api/src/services/intent-capture.service.ts`

Functions:
- `captureHotelSearch()` - Hotel search intent
- `captureHotelView()` - Hotel view intent
- `captureBookingHold()` - Booking hold intent
- `captureBookingConfirmed()` - Booking confirmed intent
- `captureBookingCancelled()` - Booking cancelled intent

Used in:
- `booking.routes.ts` - Hold, confirm, cancel endpoints
- `search.routes.ts` - Search endpoint

### 2. rez-now
**Location:** `rez-now/lib/analytics/events.ts`

Event mapping:
```typescript
const EVENT_TO_INTENT_MAP = {
  store_viewed: { eventType: 'view', category: 'DINING', confidence: 0.3 },
  menu_item_viewed: { eventType: 'view', category: 'DINING', confidence: 0.25 },
  add_to_cart: { eventType: 'cart_add', category: 'DINING', confidence: 0.6 },
  checkout_started: { eventType: 'checkout_start', category: 'DINING', confidence: 0.8 },
  order_placed: { eventType: 'fulfilled', category: 'DINING', confidence: 1.0 },
};
```

## Apps Newly Integrated

### 3. rez-app-consumer
**Location:** `rez-app-consumer/services/intentCaptureService.ts`

Functions:
- `captureFlightIntent()` - Flight search/view/booking
- `captureHotelIntent()` - Hotel search/view/booking
- `captureTrainIntent()` - Train search/view/booking
- `captureCabIntent()` - Cab booking
- `captureBillIntent()` - Bill payment

### 4. Resturistan
**Location:** `Resturistan App/restauranthub/apps/api/src/services/intentCapture.service.ts`

Functions:
- `captureRestaurantView()` - Restaurant page viewed
- `captureMenuItemView()` - Menu item viewed
- `captureAddToCart()` - Item added to cart
- `captureCheckout()` - Checkout started
- `captureOrderPlaced()` - Order completed

### 5. Room QR
**Location:** `Hotel OTA/apps/api/src/routes/room-qr.routes.ts`

Added intent capture on QR validation:
- Captures hotel guest services intent when guest scans room QR code
- Links guest's stay to their intent profile

### 6. Karma (rez-karma-service)
**Location:** `rez-karma-service/src/services/intentCapture.service.ts`

Functions:
- `captureRewardView()` - Reward viewed
- `capturePointsEarned()` - Points earned
- `captureRewardRedemption()` - Reward redeemed
- `captureReferral()` - Referral sent

### 7. Rendez
**Location:** `Rendez/rendez-backend/src/services/intentCapture.service.ts`

Functions:
- `captureProfileView()` - Profile viewed (cross-app commerce signal)
- `captureMatchReceived()` - Match received
- `captureMatchAccepted()` - Match accepted
- `captureDatePlanned()` - Date planned (strong commerce signal)
- `captureDateCompleted()` - Date completed

### 8. ReZ Merchants (OS)
**Location:** `rez-merchant-service/src/services/intentCapture.service.ts`

Functions:
- `captureProductAdded()` - Product added
- `captureOrderReceived()` - Order received
- `captureReviewReceived()` - Review received
- `captureCampaignCreated()` - Campaign created
- `captureOfferPublished()` - Offer published

### 9. AdBazzar
**Location:** `adBazaar/src/services/intentCapture.service.ts`

Functions:
- `captureAdViewed()` - Ad viewed
- `captureAdClicked()` - Ad clicked
- `captureCampaignCreated()` - Campaign created
- `captureLeadGenerated()` - Lead generated
- `captureConversion()` - Conversion tracked

### 10. NextaBiZ
**Location:** `nextabizz/src/services/intentCapture.service.ts`

Functions:
- `captureProductSearch()` - B2B product search
- `captureProductView()` - Product viewed
- `captureQuoteRequested()` - Quote requested
- `captureBulkInquiry()` - Bulk inquiry
- `captureOrderPlaced()` - B2B order placed

### 11. Hotel PMS
**Location:** `Hotel OTA/hotel-pms/hotel-management-master/src/services/intentCapture.service.ts`

Functions:
- `captureCheckIn()` - Guest check-in
- `captureRoomService()` - Room service ordered
- `captureServiceRequest()` - Service request
- `captureGuestReview()` - Guest review submitted
- `captureUpsell()` - Upsell accepted/declined

### 12. ReZ web menu
**Location:** Uses analytics from `rez-now/lib/analytics/events.ts`

Shared analytics events:
- `menu_item_viewed` - Menu item viewed
- `store_viewed` - Restaurant viewed

The web menu shares the same analytics infrastructure as ReZ Now.

## Shared SDK

**Location:** `packages/rez-intent-capture-sdk/`

Unified SDK for easy integration:
```typescript
import { IntentCapture, createHotelIntentCapture, createRestaurantIntentCapture } from '@rez/intent-capture-sdk';

// Hotel app
const hotelCapture = createHotelIntentCapture(BASE_URL, userId);
await hotelCapture.search({ city: 'Mumbai', checkin: '2024-04-01' });
await hotelCapture.view({ hotelId: 'hotel123' });
await hotelCapture.hold({ hotelId: 'hotel123', roomTypeId: 'room456' });

// Restaurant app
const restaurantCapture = createRestaurantIntentCapture(BASE_URL, userId);
await restaurantCapture.viewStore({ storeSlug: 'pizza-palace' });
await restaurantCapture.addToCart({ storeSlug: 'pizza-palace', itemId: 'item1' });
```

## Environment Variables

Each app needs:
```env
NEXT_PUBLIC_INTENT_CAPTURE_URL=https://api.rezmind.example.com
# or for internal services:
INTENT_CAPTURE_URL=http://localhost:3005
```

## Intent Graph Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      All ReZ Ecosystem Apps                      │
├─────────────────────────────────────────────────────────────────┤
│  Hotel OTA ──► search, view, hold, confirm, cancel             │
│  rez-now ────► store_view, add_cart, checkout, order           │
│  rez-consumer ► flight, hotel, train, cab, bill intents        │
│  Resturistan ─► restaurant_view, menu_view, cart, checkout     │
│  Room QR ─────► guest_services_scan                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ReZ Mind Intent Graph                        │
├─────────────────────────────────────────────────────────────────┤
│  • Captures intents with confidence scores                      │
│  • Tracks dormant intents (7+ days inactive)                    │
│  • Cross-app user profiles (travel, dining, retail)            │
│  • Merchant demand signals                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ReZ Mind Agents                             │
├─────────────────────────────────────────────────────────────────┤
│  • Demand Signal Agent - Identifies demand trends               │
│  • Scarcity Alert Agent - Warns of low inventory               │
│  • Nudge Agent - Revives dormant intents                       │
│  • Chat Agent - Autonomous merchant communication               │
└─────────────────────────────────────────────────────────────────┘
```

## Testing

```bash
# Run the intent graph server
cd packages/rez-intent-graph
npm run dev

# Test Hotel OTA capture
curl -X POST http://localhost:3005/api/intent/capture \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "appType": "hotel_ota",
    "intentKey": "hotel_search_mumbai",
    "eventType": "search",
    "category": "TRAVEL",
    "metadata": {"city": "Mumbai", "checkin": "2024-04-01"}
  }'

# Get user intents
curl http://localhost:3005/api/agent/intents/user123

# Get dormant intents for revival
curl http://localhost:3005/api/agent/dormant/user123
```

## Next Steps

1. **Deploy ReZ Mind server** with proper environment configuration
2. **Configure environment variables** in each app
3. **Monitor intent capture** via the dashboard
4. **Test dormant intent revival** with real users
5. **Enable autonomous chat** for merchant knowledge base
