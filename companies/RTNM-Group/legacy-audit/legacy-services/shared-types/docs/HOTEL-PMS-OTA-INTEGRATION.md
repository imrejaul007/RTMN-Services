# Hotel PMS - Hotel OTA Integration

## Overview

This document describes the bidirectional webhook integration between the Hotel Property Management System (PMS) and the Hotel OTA (Online Travel Agency) platform. This enables seamless synchronization of bookings, inventory, guest data, and loyalty programs between both systems.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Hotel OTA Platform                                 │
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │   Booking API     │    │   Coin Service   │    │  Inventory API   │      │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘      │
│           │                       │                       │                  │
│           └───────────────────────┼───────────────────────┘                  │
│                                   │                                          │
│                    ┌──────────────┴──────────────┐                           │
│                    │   Webhook Handler Service   │                           │
│                    │  (ota-pms-webhook-handler)  │                           │
│                    └──────────────┬──────────────┘                           │
│                                   │                                          │
│                    POST /api/webhooks/pms/*                                  │
│                    POST /v1/partner/pms/*                                    │
│                                   │                                          │
└───────────────────────────────────┼──────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │       HTTPS/WSS               │
                    │                               │
┌───────────────────┼───────────────────────────────┼───────────────────────────┐
│                   │       Hotel PMS Backend       │                           │
│                   │                               │                           │
│  ┌────────────────┴────────────────┐             │                           │
│  │   PMS→OTA Webhook Integration   │             │                           │
│  │   (pmsOtaIntegration.js)        │             │                           │
│  └────────────────┬────────────────┘             │                           │
│                   │                               │                           │
│  ┌────────────────┴────────────────┐   ┌───────┴────────┐                 │
│  │   OTA→PMS Webhook Receiver       │   │   Partner API   │                 │
│  │   (hotelOtaWebhooks.js)          │   │   (coins/      │                 │
│  │                                  │   │   inventory)   │                 │
│  └──────────────────────────────────┘   └────────────────┘                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Event Flow Summary

### PMS → OTA Events (8 events)

| # | Event | Description | OTA Endpoint |
|---|-------|-------------|--------------|
| 1 | `booking_confirmed` | PMS booking confirmed | `POST /api/webhooks/pms/booking-confirmed` |
| 2 | `check_in` | Guest checked in | `POST /api/webhooks/pms/check-in` |
| 3 | `check_out` | Guest checked out (awards brand coins) | `POST /api/webhooks/pms/check-out` |
| 4 | `room_status_change` | Room status changed | `POST /api/webhooks/pms/room-status-change` |
| 5 | `guest_data_updated` | Guest data/loyalty changed | `POST /api/webhooks/pms/guest-data-update` |
| 6 | `pricing_changed` | Rate changed | `POST /api/webhooks/pms/pricing-change` |
| 7 | `housekeeping_status` | HK status changed | `POST /api/webhooks/pms/housekeeping-status` |
| 8 | `inventory_updated` | Availability changed | `POST /api/webhooks/pms/inventory-update` |

### OTA → PMS Events (5 events)

| # | Event | Description | PMS Endpoint |
|---|-------|-------------|--------------|
| 1 | `booking_created` | OTA booking confirmed | `POST /api/v1/ota-webhooks/hotel-ota` |
| 2 | `booking_cancelled` | OTA booking cancelled | `POST /api/v1/ota-webhooks/hotel-ota` |
| 3 | `inventory_sync_request` | OTA requests inventory update | `POST /api/v1/ota-webhooks/hotel-ota` |
| 4 | `pricing_sync_request` | OTA requests rate update | `POST /api/v1/ota-webhooks/hotel-ota` |
| 5 | `guest_loyalty_query` | OTA queries loyalty info | `POST /api/v1/ota-webhooks/hotel-ota` |

## File Structure

### Hotel OTA (Consumer/Receiver)

| File | Description |
|------|-------------|
| `apps/api/src/services/integrations/pms-ota-types.ts` | Shared TypeScript types for webhook payloads |
| `apps/api/src/services/integrations/pms-webhook-sender.service.ts` | Service to send events TO PMS |
| `apps/api/src/services/integrations/ota-pms-webhook-handler.ts` | Handler for PMS→OTA webhooks |
| `apps/api/src/routes/pms-ota-webhooks.routes.ts` | Express routes for PMS→OTA webhooks |
| `apps/api/src/routes/partner-pms.routes.ts` | Partner API for PMS-initiated calls |

### Hotel PMS (Producer/Sender)

| File | Description |
|------|-------------|
| `backend/src/services/otaWebhookSender.js` | Core service to send events TO OTA |
| `backend/src/services/pmsOtaIntegration.js` | Integration wrapper for controllers |
| `backend/src/routes/hotelOtaWebhooks.js` | Express routes for OTA→PMS webhooks |
| `backend/src/routes/rezOtaWebhooks.js` | REZ OTA webhook routes |

## Webhook Payload Formats

### PMS → OTA Payload

```typescript
interface PMSWebhookPayload {
  eventId: string;           // Unique event identifier (format: {event_type}_{timestamp}_{random})
  eventType: string;         // Event type (e.g., 'booking_confirmed')
  timestamp: string;         // ISO 8601 timestamp
  hotelId: string;           // OTA hotel ID (UUID)
  otaHotelId?: string;       // OTA hotel ID (if different from hotelId)
  source: 'pms';             // Always 'pms' for PMS→OTA
  data: PMSWebhookData;       // Event-specific data
  metadata?: Record<string, unknown>;
}
```

### OTA → PMS Payload

```typescript
interface OTAWebhookPayload {
  eventId: string;           // Unique event identifier
  eventType: string;         // Event type (e.g., 'booking_created')
  timestamp: string;         // ISO 8601 timestamp
  hotelId: string;           // PMS hotel ID
  pmsHotelId?: string;       // PMS hotel ID (if different)
  source: 'ota';              // Always 'ota' for OTA→PMS
  data: OTAWebhookData;       // Event-specific data
  metadata?: Record<string, unknown>;
}
```

## Security Implementation

### HMAC-SHA256 Signature Verification

All webhooks are signed using HMAC-SHA256 to ensure authenticity.

**Signing Algorithm:**
```javascript
const crypto = require('crypto');

function signPayload(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}
```

**Verification:**
```javascript
function verifySignature(payload, signature, secret) {
  const expected = signPayload(payload, secret);
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
```

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Webhook-Signature` | HMAC-SHA256 signature (hex-encoded) |
| `X-Webhook-Event` | Event type |
| `X-Webhook-ID` | Unique event ID |
| `X-Webhook-Timestamp` | Unix timestamp (for replay protection) |
| `X-PMS-ID` | PMS hotel ID (for OTA→PMS) |

### Security Measures

1. **Signature Verification**: All webhooks verified using HMAC-SHA256
2. **Rate Limiting**: 100 requests per minute per IP
3. **Timestamp Validation**: 5-minute tolerance window
4. **Event Deduplication**: 24-hour Redis-based dedup
5. **Constant-time Comparison**: Prevents timing attacks

## Environment Variables

### Hotel OTA (.env)

```env
# Webhook secret for PMS verification (PMS uses this to sign)
PMS_WEBHOOK_SECRET=your_pms_webhook_secret_here

# Internal token for server-to-server auth (PMS uses x-internal-token)
REZ_OTA_INTERNAL_TOKEN=your_internal_token_here
INTERNAL_SERVICE_TOKEN=your_internal_token_here

# Redis URL (for deduplication)
REDIS_URL=redis://localhost:6379
```

### Hotel PMS (.env)

```env
# Hotel OTA webhook URL (where PMS sends events)
HOTEL_OTA_WEBHOOK_URL=https://api.hotelota.com/api/webhooks/pms/unified

# Webhook secret for OTA verification (OTA uses this to sign)
REZ_OTA_WEBHOOK_SECRET=your_ota_webhook_secret_here

# Hotel OTA API base URL
REZ_OTA_API_URL=https://api.hotelota.com
```

## Usage Guide

### 1. PMS: Sending Booking Confirmed Event

```javascript
import pmsOtaIntegration from '../services/pmsOtaIntegration.js';

// After booking is confirmed in PMS
await pmsOtaIntegration.emitBookingConfirmed(hotel, booking, guest);
```

### 2. PMS: Sending Check-Out Event (with Coin Award)

```javascript
// When guest checks out
const bookingValuePaise = Math.round(booking.totalAmount * 100);
await pmsOtaIntegration.emitCheckOut(hotel, booking, guest, room, bookingValuePaise);
```

### 3. PMS: Sending Pricing Change

```javascript
await pmsOtaIntegration.emitPricingChanged(
  hotel,
  roomType,
  new Date(),
  previousRate,
  newRate,
  previousAvailability,
  newAvailability,
  'Seasonal adjustment'
);
```

### 4. OTA: Awarding Brand Coins (via Partner API)

```bash
curl -X POST https://api.hotelota.com/v1/partner/pms/coins/earn \
  -H "Content-Type: application/json" \
  -H "x-internal-token: your_internal_token" \
  -d '{
    "user_id": "ota_user_uuid",
    "hotel_id": "ota_hotel_uuid",
    "booking_value_paise": 500000,
    "coin_type": "hotel_brand",
    "source": "pms_checkout"
  }'
```

### 5. OTA: Updating PMS Inventory

```bash
curl -X PUT https://api.hotelota.com/v1/partner/pms/inventory/{hotelId}/{roomTypeId}/{date} \
  -H "Content-Type: application/json" \
  -H "x-internal-token: your_internal_token" \
  -d '{
    "available_rooms": 5,
    "rate_paise": 450000,
    "is_blocked": false
  }'
```

## API Endpoints Reference

### PMS → OTA Webhook Endpoints (OTA Server)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/webhooks/pms/booking-confirmed` | POST | HMAC | Booking confirmed event |
| `/api/webhooks/pms/check-in` | POST | HMAC | Guest check-in event |
| `/api/webhooks/pms/check-out` | POST | HMAC | Guest check-out event |
| `/api/webhooks/pms/room-status-change` | POST | HMAC | Room status change event |
| `/api/webhooks/pms/guest-data-update` | POST | HMAC | Guest data update event |
| `/api/webhooks/pms/pricing-change` | POST | HMAC | Pricing change event |
| `/api/webhooks/pms/housekeeping-status` | POST | HMAC | Housekeeping status event |
| `/api/webhooks/pms/inventory-update` | POST | HMAC | Inventory update event |
| `/api/webhooks/pms/reservation-cancelled` | POST | HMAC | Reservation cancelled event |
| `/api/webhooks/pms/unified` | POST | HMAC | Unified endpoint (all events) |
| `/api/webhooks/pms/health` | GET | None | Health check |

### OTA → PMS Webhook Endpoints (PMS Server)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/ota-webhooks/rez-ota` | POST | HMAC | REZ OTA webhooks |
| `/api/v1/ota-webhooks/hotel-ota` | POST | HMAC | Hotel OTA webhooks |
| `/api/v1/ota-webhooks` | POST | HMAC | Generic OTA webhooks |

### Partner API Endpoints (OTA Server)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/v1/partner/pms/coins/earn` | POST | Token | Award brand coins |
| `/v1/partner/pms/inventory/:hId/:rtId/:date` | PUT | Token | Update inventory |

## Event Data Schemas

### booking_confirmed

```json
{
  "reservationId": "pms_booking_id",
  "otaBookingId": "ota_channel_booking_id",
  "guestId": "pms_guest_id",
  "guestEmail": "guest@example.com",
  "guestPhone": "+919876543210",
  "guestName": "John Doe",
  "checkInDate": "2024-01-15T14:00:00.000Z",
  "checkOutDate": "2024-01-17T11:00:00.000Z",
  "roomNumber": "101",
  "roomTypeId": "room_type_uuid",
  "roomTypeName": "Deluxe King",
  "totalPrice": 5000,
  "currency": "INR",
  "status": "confirmed",
  "numberOfGuests": 2,
  "numberOfNights": 2,
  "paymentStatus": "paid",
  "otaUserId": "ota_user_uuid"
}
```

### check_out

```json
{
  "reservationId": "pms_booking_id",
  "guestId": "pms_guest_id",
  "guestEmail": "guest@example.com",
  "guestPhone": "+919876543210",
  "checkInDate": "2024-01-15T14:00:00.000Z",
  "checkOutDate": "2024-01-17T11:00:00.000Z",
  "roomNumber": "101",
  "roomTypeId": "room_type_uuid",
  "roomTypeName": "Deluxe King",
  "actualCheckOutTime": "2024-01-17T11:00:00.000Z",
  "lateCheckOut": false,
  "earlyCheckOut": false,
  "bookingValuePaise": 500000,
  "otaUserId": "ota_user_uuid"
}
```

### pricing_changed

```json
{
  "roomTypeId": "room_type_uuid",
  "roomTypeName": "Deluxe King",
  "date": "2024-01-20",
  "previousRate": 4500,
  "newRate": 5000,
  "currency": "INR",
  "previousAvailability": 8,
  "newAvailability": 5,
  "reason": "Weekend rate increase",
  "effectiveFrom": "2024-01-20T00:00:00.000Z"
}
```

## Error Handling

### Webhook Failures

- Automatic retry with exponential backoff: 1s → 5s → 15s
- Max 3 retries by default
- Failed events stored for manual review
- Alerting on repeated failures

### Error Responses

```json
{
  "success": false,
  "message": "Invalid signature",
  "code": "INVALID_SIGNATURE"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Event processed successfully |
| 400 | Invalid payload |
| 401 | Invalid signature |
| 404 | Hotel/resource not found |
| 422 | Unknown event type |
| 500 | Internal processing error |

## Monitoring & Logging

### Key Log Patterns

**OTA (PMS→OTA events):**
```
[PMS→OTA] Received event: booking_confirmed | hotelId: xyz
[PMS→OTA] booking_confirmed processed | coinsAwarded: 500
[PMS→OTA] Duplicate webhook event, skipping | eventId: abc
```

**PMS (OTA→PMS events):**
```
[HotelOTA→PMS] Booking created | bookingId: xyz | otaBookingId: abc
[HotelOTA→PMS] Inventory updated | roomTypeId: room1 | availableRooms: 5
```

### Health Checks

```bash
# OTA Health
curl http://localhost:3000/api/webhooks/pms/health

# PMS Health
curl http://localhost:4000/api/v1/ota-webhooks/hotel-ota/health
```

## Testing

### Test Booking Confirmed Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/pms/booking-confirmed \
  -H "Content-Type: application/json" \
  -H "X-Signature: $(echo -n '{"eventId":"test_123",...}' | openssl dgst -sha256 -hmac 'your_secret')" \
  -d '{
    "eventId": "booking_confirmed_test_123",
    "eventType": "booking_confirmed",
    "timestamp": "2024-01-15T10:00:00.000Z",
    "hotelId": "hotel_uuid",
    "source": "pms",
    "data": {
      "eventType": "booking_confirmed",
      "reservationId": "test_booking_123",
      "guestEmail": "guest@example.com",
      "checkInDate": "2024-01-15T14:00:00.000Z",
      "checkOutDate": "2024-01-17T11:00:00.000Z",
      "totalPrice": 5000,
      "currency": "INR",
      "roomTypeId": "room_type_uuid",
      "roomTypeName": "Deluxe King",
      "numberOfGuests": 2,
      "numberOfNights": 2,
      "paymentStatus": "paid",
      "status": "confirmed"
    }
  }'
```

### Test Check-Out with Coin Award

```bash
curl -X POST http://localhost:3000/api/webhooks/pms/check-out \
  -H "Content-Type: application/json" \
  -H "X-Signature: your_signature" \
  -d '{
    "eventId": "check_out_test_456",
    "eventType": "check_out",
    "timestamp": "2024-01-17T11:00:00.000Z",
    "hotelId": "hotel_uuid",
    "source": "pms",
    "data": {
      "eventType": "check_out",
      "reservationId": "test_booking_123",
      "guestEmail": "guest@example.com",
      "checkInDate": "2024-01-15T14:00:00.000Z",
      "checkOutDate": "2024-01-17T11:00:00.000Z",
      "roomNumber": "101",
      "roomTypeId": "room_type_uuid",
      "roomTypeName": "Deluxe King",
      "actualCheckOutTime": "2024-01-17T11:00:00.000Z",
      "bookingValuePaise": 500000,
      "otaUserId": "ota_user_uuid"
    }
  }'
```

## Troubleshooting

### Webhook Not Delivered

1. Check environment variables are set correctly
2. Verify network connectivity between PMS and OTA
3. Check logs for signature verification errors
4. Verify hotel ID mapping is correct (otaConnections in Hotel model)

### Signature Verification Fails

1. Ensure secrets match on both systems
2. Check for JSON serialization differences (key order)
3. Verify timestamp format is ISO 8601
4. Use constant-time comparison (already implemented)

### Duplicate Events Processed

1. Check Redis connectivity is working
2. Verify eventId is unique per event
3. Review deduplication TTL (24 hours)
4. Check for clock skew between servers

### Brand Coins Not Awarded

1. Verify hotel has brandCoinEnabled = true
2. Check coin earn rules exist for hotel
3. Verify user_id (otaUserId) is correct
4. Check CoinService logs for errors

## Database Schema Changes

### Hotel OTA (Prisma)

No schema changes required. Uses existing tables:
- `booking` - Status updates, coin linking
- `inventory_slot` - Rate/availability updates
- `user` - Loyalty updates
- `coin_wallet` - Coin balances
- `coin_transaction` - Transaction history

### Hotel PMS (MongoDB)

Required field added to Hotel model:
```javascript
otaConnections: {
  rezOta: {
    hotelId: 'ota-hotel-uuid-here',  // UUID from Hotel OTA hotels table
    isEnabled: true,
    lastSync: null,
  }
}
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial integration |
| 1.1 | 2024-06 | Added all 8 PMS→OTA events |
| 1.2 | 2024-12 | Enhanced security, deduplication |
| 2.0 | 2026-04 | Complete rewrite with unified endpoints |

## Support

For issues or questions:
1. Check logs on both systems
2. Verify environment variables
3. Run health check endpoints
4. Contact integration team
