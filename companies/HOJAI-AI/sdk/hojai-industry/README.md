# @hojai/industry

> The official TypeScript SDK for the 24 (now 26) vertical **Industry OS** services of the RTMN ecosystem.

[![npm version](https://img.shields.io/npm/v/@hojai/industry.svg)](https://www.npmjs.com/package/@hojai/industry)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

RTMN has one **Industry OS** per vertical: restaurant, hotel, healthcare, retail, education, real estate, and 20+ more. Each one runs as its own service on a dedicated port and exposes a domain-specific API. This SDK wraps all 26 of them into a single ergonomic TypeScript client.

22 of the 26 sub-clients share a common 9-method template (menu / orders / tables / customers) via `IndustryBaseClient`. Hotel, Beauty, Event-Banquet, and Exhibition have richer industry-specific surfaces.

## Install

```bash
npm install @hojai/industry
```

## Quick start

```ts
import { Industry } from '@hojai/industry';

const ind = new Industry({
  apiKey: process.env.HOJAI_API_KEY!,
  baseUrl: 'https://api.hojai.ai'
});

// 1. Restaurant: create an order
const order = await ind.restaurant.createOrder({
  tableId: 't-1',
  customerId: 'c-1',
  items: [{ menuItemId: 'm-1', quantity: 2 }]
});

// 2. Hotel: book + check in
const booking = await ind.hotel.createBooking({
  roomId: 'r-101',
  guestId: 'g-1',
  checkIn: '2026-07-01',
  checkOut: '2026-07-05'
});
await ind.hotel.checkIn(booking.id);

// 3. Beauty: book an appointment with a stylist
const appt = await ind.beauty.createAppointment({
  serviceId: 's-1',
  stylistId: 'st-1',
  customerId: 'c-1',
  startAt: '2026-07-01T10:00:00Z'
});

// 4. Event & Banquet: full lifecycle (create → confirm → start → complete)
const event = await ind.eventBanquet.createEvent({
  name: 'Wedding Reception',
  eventDate: '2026-08-15',
  startTime: '18:00',
  endTime: '23:00',
  venue: 'Grand Ballroom',
  guestCount: 200,
  customerId: 'c-1'
});
await ind.eventBanquet.confirm(event.id);
await ind.eventBanquet.start(event.id);
await ind.eventBanquet.complete(event.id, 'Perfect evening');

// 5. Cross-industry: get all pending orders across industries
const openOrders = await Promise.all([
  ind.restaurant.listOrders({ status: 'pending' }),
  ind.retail.listOrders({ status: 'pending' }),
  ind.healthcare.listOrders({ status: 'pending' })
]);
console.log(`Open orders: ${openOrders.flat().length}`);
```

## What's inside

26 sub-clients, ~120 methods total:

| Group | Industries | Surface | Methods |
|---|---|---|---|
| **Template (22)** | restaurant, healthcare, retail, legal, education, agriculture, automotive, fashion, fitness, gaming, government, homeServices, manufacturing, nonProfit, professional, sports, travel, entertainment, construction, financial, realEstate, transport | Menu + orders + tables + customers | 9 each |
| **Hotel** | hotel | Rooms + bookings (check-in/out/cancel) + guests | 11 |
| **Beauty** | beauty | Services + stylists + appointments | 9 |
| **Event-Banquet** | eventBanquet | Modules + agents + events (lifecycle) | 11 |
| **Exhibition** | exhibition | Modules + agents + exhibitions (lifecycle) | 11 |

The 22 template-style industries share `IndustryBaseClient` — they all expose:
- `listMenu`, `addMenuItem`
- `listOrders`, `createOrder`, `updateOrderStatus`
- `listTables`, `reserveTable`
- `listCustomers`, `addCustomer`, `addPoints`

Hotel adds rooms/bookings on top of the base. Beauty, Event-Banquet, and Exhibition have their own surfaces (no shared base).

## Subpath imports

For tree-shaking and smaller bundles:

```ts
import { RestaurantClient } from '@hojai/industry/restaurant';
import { HotelClient } from '@hojai/industry/hotel';
import { IndustryBaseClient } from '@hojai/industry/base';
```

## Configuration

```ts
const ind = new Industry({
  apiKey: 'hojai_live_...',         // required
  baseUrl: 'https://api.hojai.ai',  // required
  timeout: 10_000,                  // optional, default 10s
  maxRetries: 3,                    // optional, default 3
  fetchImpl: customFetch,           // optional, for testing/proxies
  logger: (level, msg, meta) => {}  // optional
});
```

Each sub-client automatically targets its dedicated port. To override (e.g. for staging), construct a sub-client with a custom HojaiConfig whose `baseUrl` points at the desired host.

## Error handling

```ts
try {
  await ind.restaurant.createOrder({ ... });
} catch (err) {
  // err.message = "HTTP 404: ..." or "HTTP 500: ..."
  // SDK retries 5xx automatically (up to maxRetries)
  // SDK throws on 4xx immediately
}
```

## Tests

```bash
cd companies/HOJAI-AI/sdk/hojai-industry
npm install
npm run build
npm test
```

## See also

- [@hojai/foundation](../hojai-foundation/) — CorpID, Memory, Twin, Trust, Flow, Policy
- [@hojai/sutar](../hojai-sutar/) — SUTAR agent runtime
- [@hojai/nexha](../hojai-nexha/) — Nexha federation network
- [@hojai/marketplace](../hojai-marketplace/) — BAM marketplace
- [@hojai/genie](../hojai-genie/) — Personal AI assistant
- [@hojai/commerce](../hojai-commerce/) — RABTUL commerce
- [Industry OS services](../../../../industry-os/services/) — the 26 underlying services wrapped here
