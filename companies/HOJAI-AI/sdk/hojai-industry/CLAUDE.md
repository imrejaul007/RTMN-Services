# CLAUDE.md - HOJAI Industry SDK (@hojai/industry)

> **Package:** `@hojai/industry` v1.0.0
> **TypeScript:** First-class with full type definitions
> **Runtime:** Node.js >= 18
> **Status:** Built and tested (8/8 tests passing, 0 failures)

## What this SDK is

**The official TypeScript client for the 26 Industry OS services of RTMN.** Each industry is a vertical operating system (restaurant, hotel, healthcare, etc.) running on its own port. This SDK wraps all 26 of them into a single ergonomic client, organized as one sub-client per industry.

22 of the 26 industries share a common template surface (`menu + orders + tables + customers`) and inherit from `IndustryBaseClient`. Hotel, Beauty, Event-Banquet, and Exhibition have richer industry-specific surfaces.

| Sub-client | Industry | Port | Surface | Methods |
|---|---|---|---|---|
| `restaurant` | Restaurant | 5010 | template | 9 |
| `hotel` | Hotel | 5025 | rooms + bookings + guests | 11 |
| `healthcare` | Healthcare | 5020 | template | 9 |
| `retail` | Retail | 5030 | template | 9 |
| `legal` | Legal | 5035 | template | 9 |
| `education` | Education | 5060 | template | 9 |
| `agriculture` | Agriculture | 5070 | template | 9 |
| `automotive` | Automotive | 5080 | template | 9 |
| `beauty` | Beauty | 5090 | services + stylists + appointments | 9 |
| `fashion` | Fashion | 5095 | template | 9 |
| `fitness` | Fitness | 5110 | template | 9 |
| `gaming` | Gaming | 5120 | template | 9 |
| `government` | Government | 5130 | template | 9 |
| `homeServices` | Home Services | 5140 | template | 9 |
| `manufacturing` | Manufacturing | 5150 | template | 9 |
| `nonProfit` | Non-Profit | 5160 | template | 9 |
| `professional` | Professional | 5170 | template | 9 |
| `sports` | Sports | 5180 | template | 9 |
| `travel` | Travel | 5190 | template | 9 |
| `entertainment` | Entertainment | 5200 | template | 9 |
| `construction` | Construction | 5210 | template | 9 |
| `financial` | Financial | 5220 | template | 9 |
| `realEstate` | Real Estate | 5230 | template | 9 |
| `transport` | Transport | 5240 | template | 9 |
| `eventBanquet` | Event & Banquet | 4751 | events (lifecycle) | 11 |
| `exhibition` | Exhibition | 5040 | exhibitions (lifecycle) | 11 |

## Architecture

```
@hojai/industry
├── Industry                       # Main client (facade)
│   ├── restaurant                 # 9 methods (template)
│   ├── hotel                      # 11 methods (rooms + bookings)
│   ├── healthcare                 # 9 methods (template)
│   ├── ...                        # 19 more template-style
│   ├── beauty                     # 9 methods (services + stylists)
│   ├── eventBanquet               # 11 methods (events + lifecycle)
│   └── exhibition                 # 11 methods (exhibitions + lifecycle)
├── IndustryBaseClient             # Shared 9-method template surface
├── HojaiConfig                    # Shared config (apiKey, baseUrl, timeout, maxRetries, fetchImpl, logger)
├── resolveConfig()                # Apply defaults
└── INDUSTRY_PORTS                 # Map of industry key → port number
```

Self-contained — does NOT import from other `@hojai/*` packages. Each SDK carries its own copy of `HojaiConfig` and the `request()` + `buildQueryString` helpers (~80 LOC), so it can be installed and used independently. This mirrors the pattern in `@hojai/sutar`, `@hojai/marketplace`, `@hojai/genie`, and `@hojai/commerce`.

## Quick Start

```ts
import { Industry } from '@hojai/industry';

const ind = new Industry({ apiKey, baseUrl: 'https://api.hojai.ai' });

// Restaurant
const order = await ind.restaurant.createOrder({ tableId: 't-1', items: [{ menuItemId: 'm-1', quantity: 2 }] });

// Hotel: full booking lifecycle
const booking = await ind.hotel.createBooking({ roomId: 'r-101', guestId: 'g-1', checkIn: '2026-07-01', checkOut: '2026-07-05' });
await ind.hotel.checkIn(booking.id);
await ind.hotel.checkOut(booking.id);

// Beauty: book an appointment
const appt = await ind.beauty.createAppointment({ serviceId: 's-1', stylistId: 'st-1', customerId: 'c-1', startAt: '2026-07-01T10:00:00Z' });

// Event: full lifecycle
const event = await ind.eventBanquet.createEvent({ name: 'Wedding', eventDate: '2026-08-15', startTime: '18:00', endTime: '23:00', venue: 'Ballroom', guestCount: 200, customerId: 'c-1' });
await ind.eventBanquet.confirm(event.id);
await ind.eventBanquet.start(event.id);
await ind.eventBanquet.complete(event.id);

// Cross-industry aggregation
const openOrders = await Promise.all([
  ind.restaurant.listOrders({ status: 'pending' }),
  ind.retail.listOrders({ status: 'pending' }),
]);
```

## Build & test

```bash
cd companies/HOJAI-AI/sdk/hojai-industry
npm install
npm run build
npm test
```

## Files

```
hojai-industry/
├── CLAUDE.md                       # This file
├── README.md                       # Quick start
├── package.json                    # npm config with subpath exports for 26 sub-clients
├── tsconfig.json
├── src/
│   ├── foundation-config.ts        # HojaiConfig + resolveConfig (copied)
│   ├── utils.ts                    # request() + buildQueryString (copied)
│   ├── types.ts                    # Common types + INDUSTRY_PORTS map
│   ├── base.ts                     # IndustryBaseClient — 9 shared template methods
│   ├── restaurant.ts               # template: extends base (port 5010)
│   ├── hotel.ts                    # rooms + bookings + guests (port 5025)
│   ├── healthcare.ts               # template: extends base (port 5020)
│   ├── retail.ts                   # template: extends base (port 5030)
│   ├── legal.ts                    # template: extends base (port 5035)
│   ├── education.ts                # template: extends base (port 5060)
│   ├── agriculture.ts              # template: extends base (port 5070)
│   ├── automotive.ts               # template: extends base (port 5080)
│   ├── beauty.ts                   # services + stylists + appointments (port 5090)
│   ├── fashion.ts                  # template: extends base (port 5095)
│   ├── fitness.ts                  # template: extends base (port 5110)
│   ├── gaming.ts                   # template: extends base (port 5120)
│   ├── government.ts               # template: extends base (port 5130)
│   ├── home-services.ts            # template: extends base (port 5140)
│   ├── manufacturing.ts            # template: extends base (port 5150)
│   ├── non-profit.ts               # template: extends base (port 5160)
│   ├── professional.ts             # template: extends base (port 5170)
│   ├── sports.ts                   # template: extends base (port 5180)
│   ├── travel.ts                   # template: extends base (port 5190)
│   ├── entertainment.ts            # template: extends base (port 5200)
│   ├── construction.ts             # template: extends base (port 5210)
│   ├── financial.ts                # template: extends base (port 5220)
│   ├── real-estate.ts              # template: extends base (port 5230)
│   ├── transport.ts                # template: extends base (port 5240)
│   ├── event-banquet.ts            # events lifecycle (port 4751)
│   ├── exhibition.ts               # exhibitions lifecycle (port 5040)
│   ├── index.ts                    # Main Industry class + re-exports
│   └── __tests__/index.test.ts     # 8 tests
└── dist/                           # Compiled output
```

## Tests (8/8 passing)

- Industry client instantiates with all 26 sub-clients
- RestaurantClient.createOrder (template surface, port 5010)
- HotelClient.createBooking + checkIn (hotel surface, port 5025)
- BeautyClient.createAppointment (beauty surface, port 5090)
- EventBanquetClient full lifecycle (create → confirm → start → complete, port 4751)
- ExhibitionClient full lifecycle (create → publish → start → complete, port 5040)
- Retries on 5xx (calls mock 3 times before success)
- Throws on 4xx

## Related

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Core platform client
- [@hojai/sutar](../hojai-sutar/CLAUDE.md) — SUTAR agent runtime SDK
- [@hojai/nexha](../hojai-nexha/CLAUDE.md) — Nexha federation network SDK
- [@hojai/marketplace](../hojai-marketplace/CLAUDE.md) — BAM marketplace SDK
- [@hojai/genie](../hojai-genie/CLAUDE.md) — Personal AI assistant SDK
- [@hojai/commerce](../hojai-commerce/CLAUDE.md) — RABTUL commerce SDK
- [Industry OS services](../../../../industry-os/services/) — the 26 underlying services wrapped here
