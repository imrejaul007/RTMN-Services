# RisnaEstate Integration Service

**Service Name:** RisnaEstate Integration (Real Estate OS)  
**Version:** 1.0.0  
**Port:** 4971  
**Status:** Development

---

## Overview

RisnaEstate Integration connects the Real Estate OS to Customer Operations via Asset Twin, Customer Twin, and Lead Twin. It provides property listings, site visit bookings, and customer inquiry management.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RisnaEstate Integration                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Properties   │  │   Bookings   │  │     Inquiries       │ │
│  │   Routes      │  │   Routes     │  │      Routes          │ │
│  └───────┬───────┘  └───────┬───────┘  └──────────┬───────────┘ │
│          │                  │                     │             │
│  ┌───────▼──────────────────▼─────────────────────▼───────────┐ │
│  │                   CustomerOpsBridge                        │ │
│  │  Connects to Asset Twin, Customer Twin, Lead Twin          │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                     │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │                     PropertySync                           │ │
│  │  Handles property synchronization to Asset Twin             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼─────┐        ┌──────▼──────┐       ┌─────▼─────┐
   │Asset Twin│        │Customer Twin│       │ Lead Twin │
   │ :3015    │        │   :3017     │       │  :3018    │
   └──────────┘        └─────────────┘       └───────────┘
```

---

## Connected Twins

| Twin | Port | Purpose |
|------|------|---------|
| Asset Twin | 3015 | Property listings, valuations |
| Customer Twin | 3017 | Customer profiles, activities |
| Lead Twin | 3018 | Lead management, pipeline |
| Area Twin | 3019 | Location insights, comparables |

---

## API Endpoints

### Properties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List properties with filters |
| GET | `/api/properties/stats` | Property statistics |
| GET | `/api/properties/featured` | Featured properties |
| GET | `/api/properties/:id` | Get single property |
| POST | `/api/properties` | Create property |
| PUT | `/api/properties/:id` | Update property |
| DELETE | `/api/properties/:id` | Delete property |
| POST | `/api/properties/:id/sync` | Sync to Asset Twin |
| POST | `/api/properties/:id/interest` | Register interest |

### Bookings (Site Visits)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | List bookings |
| GET | `/api/bookings/stats` | Booking statistics |
| GET | `/api/bookings/:id` | Get booking |
| POST | `/api/bookings` | Create booking |
| PUT | `/api/bookings/:id` | Update booking |
| PUT | `/api/bookings/:id/confirm` | Confirm booking |
| PUT | `/api/bookings/:id/complete` | Mark complete |
| PUT | `/api/bookings/:id/cancel` | Cancel booking |
| PUT | `/api/bookings/:id/reschedule` | Reschedule |
| POST | `/api/bookings/:id/feedback` | Submit feedback |

### Inquiries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inquiries` | List inquiries |
| GET | `/api/inquiries/stats` | Inquiry statistics |
| GET | `/api/inquiries/unassigned` | Unassigned inquiries |
| GET | `/api/inquiries/:id` | Get inquiry |
| POST | `/api/inquiries` | Create inquiry |
| PUT | `/api/inquiries/:id` | Update inquiry |
| PUT | `/api/inquiries/:id/assign` | Assign to agent |
| PUT | `/api/inquiries/:id/respond` | Mark as responded |
| PUT | `/api/inquiries/:id/convert` | Convert to lead |
| PUT | `/api/inquiries/:id/close` | Close inquiry |
| PUT | `/api/inquiries/:id/followup` | Schedule follow-up |
| GET | `/api/inquiries/customer/:id` | Customer inquiries |

---

## Property Model

### PropertyProfile Fields

```typescript
{
  id: string;
  listingId: string;
  title: string;
  description: string;
  location: {
    address, city, state, country, pincode,
    coordinates?, locality?, landmark?
  };
  pricing: {
    price, pricePerSqft?, currency,
    priceType, additionalCosts?
  };
  details: {
    propertyType, bedrooms?, bathrooms?,
    carpetArea, carpetAreaUnit, yearBuilt?
  };
  amenities: {
    parking?, furnished, amenities?,
    powerBackup?, security?, lift?
  };
  ownership: {
    ownerName, ownershipType, encumbranceFree
  };
  legal: {
    reraApproved?, reraNumber?, ocReceived?
  };
  media: PropertyMedia[];
  analytics: {
    views, inquiries, siteVisitRequests,
    daysOnMarket, priceHistory
  };
  status: 'active' | 'pending' | 'sold' | 'withdrawn' | 'reserved';
  listingType: 'sale' | 'rent' | 'lease';
  syncedToTwin: boolean;
  twinId?: string;
}
```

---

## Environment Variables

```bash
PORT=4971
ASSET_TWIN_URL=http://localhost:3015
CUSTOMER_TWIN_URL=http://localhost:3017
LEAD_TWIN_URL=http://localhost:3018
AREA_TWIN_URL=http://localhost:3019
EVENT_BUS_URL=http://localhost:4510
SERVICE_REGISTRY_URL=http://localhost:4399
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Running the Service

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm start

# Health check
curl http://localhost:4971/health
```

---

## Service Dependencies

| Service | Port | Required |
|---------|------|----------|
| Asset Twin | 3015 | Yes |
| Customer Twin | 3017 | Yes |
| Lead Twin | 3018 | Yes |
| Area Twin | 3019 | No |
| Event Bus | 4510 | No |
| Service Registry | 4399 | No |

---

## Events Published

| Event | Trigger |
|-------|---------|
| `realestate.property.created` | New property created |
| `realestate.property.updated` | Property updated |
| `realestate.property.deleted` | Property deleted |
| `realestate.property.price_updated` | Price changed |
| `realestate.property.status_changed` | Status changed |
| `realestate.inquiry.created` | New inquiry |

---

## Sync Status

Properties sync automatically to Asset Twin on:
- Creation
- Update (price, details, status)
- Deletion (removes from twin)

Manual sync available via:
```
POST /api/properties/:id/sync
```

---

## Integration with Industry OS

RisnaEstate Integration is part of the 24-industry RTMN ecosystem:

- Connects to Asset Twin for property management
- Connects to Customer Twin for CRM
- Connects to Lead Twin for sales pipeline
- Publishes events to Event Bus for ecosystem notifications

---

*Last Updated: June 16, 2026*
