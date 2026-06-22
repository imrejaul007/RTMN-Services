# AdBazaar Service

> Last Updated: 2026-05-10

## Overview

AdBazaar is the marketplace component of the REZ advertising vertical. It connects merchants who own advertising surfaces (billboards, cabs, shop displays) with advertisers who want to reach audiences through those surfaces.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ADBAZAAR                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Merchant Dashboard                          │  │
│  │  • Create Listings    • Manage Bookings    • View Analytics   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Next.js Frontend                           │  │
│  │  (Server Components + API Routes)                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                       Supabase                                 │  │
│  │  (Listings, Bookings, QR Codes, Users)                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Features

### Listing Categories

| Category | Subcategories |
|----------|---------------|
| **Outdoor OOH** | Billboard, Digital Billboard, Bus/Truck/Cab Wrap, E-Rickshaw, Wall Painting |
| **Transit Infrastructure** | Metro Station, Airport Terminal, Railway Station, Highway Toll |
| **Property Spaces** | Mall, Cinema, Society Gate/Notice Board, Office Lobby, Gym |
| **Local Business** | Shop Window, Restaurant Table Tent/TV, Delivery Bag/Helmet |
| **Print Broadcast** | Newspaper/Magazine Ad, Radio Jingle, TV Ad Spot |
| **Influencer** | Instagram Post/Reel/Story, YouTube Sponsored Video, LinkedIn |
| **Digital Placements** | Website Banner, WhatsApp Broadcast, Mobile App Ad |
| **Unconventional** | Terrace/Rooftop, Custom Ambient, Branded QR Placement |

### Pricing Models

- **Fixed**: Set price per day/week/month/slot
- **Quote**: Buyer requests quote from vendor
- **Both**: Vendor offers both options

### Availability Models

- **Calendar**: Date range selection
- **Slot**: Time slot selection (e.g., hourly)
- **Always On**: Perpetual availability

## Key API Endpoints

### Listings

```typescript
// POST /api/listings - Create listing
interface CreateListingInput {
  category: ListingCategory
  subcategory: string
  title: string
  description?: string
  city: string
  area?: string
  images: string[]
  pricingModel: PricingModel
  price?: number
  availabilityModel: AvailabilityModel
  minBookingDays: number
  qrEnabled: boolean
  specs: ListingSpecs
}

// GET /api/listings - Search listings
interface ListListingsQuery {
  city?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  availabilityModel?: string
  qrEnabled?: boolean
  q?: string  // search query
  page?: number
  limit?: number
}
```

### Bookings

```typescript
// POST /api/bookings - Create booking
interface BookingCreateInput {
  listingId: string
  startDate?: string
  endDate?: string
  slots?: Record<string, unknown>[]
  coinsPerScan?: number
  visitBonusCoins?: number
  rezMerchantId?: string
  creativeInstructions?: string
  broadcastConfig?: {
    channel: 'push' | 'whatsapp' | 'sms'
    segment: 'all' | 'high_value' | 'at_risk' | 'new_users'
    broadcastTitle?: string
    broadcastBody?: string
    scheduledAt?: string
  }
}

// GET /api/bookings - List bookings
interface ListBookingsQuery {
  role: 'vendor' | 'buyer'
}
```

### Payment Flow

```
1. Create Booking → Returns Razorpay order
2. Client completes payment via Razorpay
3. Webhook received → Payment verified
4. Booking status updated → 'paid'
5. Vendor notified
```

## QR Code Generation

QR codes are automatically generated when a booking is created:

```typescript
interface QRCodeRecord {
  id: string
  bookingId: string
  listingId: string
  rezMerchantId?: string
  coinsPerScan: number        // Default: 20
  visitBonusCoins: number     // Default: 100
  purchaseBonusPct: number    // Default: 5%
  qrSlug: string              // UUID for unique URL
  qrImageUrl?: string
  totalScans: number
  uniqueScanners: number
  isActive: boolean
}
```

### QR Landing Page URL

```
/scan/[qr_slug]
```

## Attribution Tracking

The `/api/attribution` endpoint provides campaign analytics:

```typescript
interface AttributionResponse {
  totalScans: number
  totalVisits: number
  totalRevenue: number
  bookings: Array<{
    bookingId: string
    listingTitle: string
    bookingAmount: number
    totalScans: number
    visits: number
    purchases: number
    revenueAttributed: number
    roi: number
    costPerScan: number
    costPerVisit: number
    costPerAcquisition: number
  }>
}
```

## Security Measures

### AB-C4: Idempotency Keys
Prevents duplicate booking creation on network retries:

```typescript
const idempotencyKey = req.headers.get('Idempotency-Key')
if (idempotencyKey) {
  const existing = await supabase
    .from('bookings')
    .select('id, status, payment_order_id')
    .eq('buyer_id', user.id)
    .eq('idempotency_key', idempotencyKey)
    .single()
  if (existing) return existing
}
```

### AB-C5: Payment Amount Verification
Verifies actual Razorpay payment amount matches booking:

```typescript
const payment = await rz.payments.fetch(paymentId)
if (payment.amount !== expectedAmount * 100) {
  throw new Error('Payment amount mismatch')
}
```

### AB-M2: SQL Injection Prevention
Escapes LIKE/ilike wildcard characters:

```typescript
const escapeLikePattern = (s: string): string => {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx

# REZ Services
REZ_API_BASE_URL=https://api.rezapp.com/api
REZ_WALLET_SERVICE_URL=https://rez-wallet-service.onrender.com
REZ_MARKETING_SERVICE_URL=https://rez-marketing-service.onrender.com
REZ_PAYMENT_SERVICE_URL=https://rez-payment-service.onrender.com

# REZ Internal
REZ_INTERNAL_KEY=xxx
ADBAZAAR_INTERNAL_KEY=xxx

# App URLs
NEXT_PUBLIC_APP_URL=https://ad-bazaar.vercel.app
```

## File Structure

```
adBazaar/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── listings/
│   │   │   │   └── route.ts          # List/create listings
│   │   │   ├── bookings/
│   │   │   │   ├── route.ts          # List/create bookings
│   │   │   │   └── verify-payment/
│   │   │   │       └── route.ts      # Payment verification
│   │   │   ├── qr/
│   │   │   │   └── scan/
│   │   │   │       └── [slug]/
│   │   │   │           └── route.ts  # QR scan handling
│   │   │   ├── attribution/
│   │   │   │   └── route.ts          # Analytics
│   │   │   └── visit/
│   │   │       └── route.ts          # Visit tracking
│   │   └── (pages)/
│   │       ├── page.tsx              # Homepage
│   │       ├── browse/
│   │       │   └── page.tsx          # Browse listings
│   │       └── vendor/
│   │           └── listings/
│   │               └── new/
│   │                   └── page.tsx  # Create listing
│   ├── lib/
│   │   ├── supabase.ts               # Server client factory
│   │   ├── qr.ts                     # QR generation
│   │   ├── razorpay.ts               # Payment verification
│   │   ├── paymentService.ts         # Payment service client
│   │   ├── marketing.ts              # REZ marketing integration
│   │   └── schemas.ts                # Zod validation schemas
│   └── types/
│       └── index.ts                  # TypeScript types
├── package.json
├── vercel.json
└── .env.example
```

## Dependencies

```json
{
  "@supabase/ssr": "^0.6.1",
  "@supabase/supabase-js": "^2.78.0",
  "@react-google-maps/api": "^2.20.3",
  "qrcode": "^1.5.4",
  "razorpay": "^2.9.6",
  "zod": "^4.3.6",
  "zustand": "^5.0.12"
}
```

## Deployment

```bash
cd adBazaar
vercel --prod
```

## Related Documentation

- [README](README.md) - Advertising vertical overview
- [AdsQr](02_ADSQR.md) - QR campaign management
- [DOOH](03_DOOH.md) - Screen network
