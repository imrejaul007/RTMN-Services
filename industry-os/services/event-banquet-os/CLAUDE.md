# Event & Banquet OS v1.0.0

**Port:** 4751  
**Status:** ✅ PRODUCTION READY  
**Category:** Industry OS - Vertical Layer

---

## Overview

Event & Banquet OS is a comprehensive platform for managing events, weddings, corporate functions, conferences, and banquets. It provides end-to-end capabilities from venue booking to guest management and analytics.

---

## Modules (14)

| Module | Description |
|--------|-------------|
| **Event Management** | Create, schedule, track events |
| **Venue Management** | Booking, capacity, equipment |
| **Booking System** | Availability, quotes, confirmations |
| **Guest Management** | RSVP, seating, check-in |
| **Vendor Management** | Directory, ratings, contracts |
| **Catering** | Menus, dietary, service style |
| **Banquet** | Rooms, setup, flow |
| **Decorations** | Themes, flowers, lighting |
| **Entertainment** | Music, DJ, performers |
| **Transport** | Shuttle, valet, parking |
| **Invoicing** | Quotes, billing, payments |
| **Task Management** | Checklist, assign, track |
| **Event Timeline** | Schedule, countdown, alerts |
| **Analytics** | ROI, metrics, reports |

---

## AI Agents (10)

| Agent | Purpose |
|-------|---------|
| Event Planner | Suggest event types, themes, formats |
| Venue Matcher | Match event to best venue |
| Catering Advisor | Menu planning, portions, dietary |
| Budget Optimizer | Cost optimization across elements |
| Guest Recommender | Guest list optimization |
| Schedule Optimizer | Event timing optimization |
| Vendor Matcher | Best vendors for event |
| Seating Optimizer | Optimal seating arrangements |
| Sentiment Analyzer | Post-event feedback analysis |
| ROI Calculator | Event ROI analysis |

---

## Event Types

| Type | Description |
|------|-------------|
| `wedding` | Wedding ceremonies & receptions |
| `corporate` | Business events & conferences |
| `social` | Social gatherings & parties |
| `conference` | Professional conferences |
| `birthday` | Birthday celebrations |
| `anniversary` | Anniversary parties |
| `gala` | Gala dinners & award ceremonies |
| `product_launch` | Product launches |

---

## Data Models

### Event
```javascript
{
  id, name, type, description,
  clientName, clientEmail, clientPhone,
  venueId, startDate, endDate,
  expectedGuests, confirmedGuests,
  budget, spent, status, theme,
  checklist, createdAt
}
```

### Venue
```javascript
{
  id, name, type, address, city,
  capacity, pricePerPlate, hallCharge,
  rooms, parking, facilities, rating
}
```

### Guest
```javascript
{
  id, eventId, name, email, phone,
  company, dietary, tableNumber,
  status, plusOne, checkIn
}
```

### Booking
```javascript
{
  id, eventId, venueId, date,
  startTime, guestCount, status,
  quoteAmount, advanceAmount
}
```

### Invoice
```javascript
{
  id, eventId, items, subtotal,
  tax, discount, total, paid, due,
  status, dueDate
}
```

---

## API Endpoints

### Health & Info
```
GET /health
GET /api/modules
GET /api/agents
POST /api/agents/:id/run
```

### Events
```
GET    /api/events
POST   /api/events
GET    /api/events/:id
PATCH  /api/events/:id
POST   /api/events/:id/confirm
POST   /api/events/:id/start
POST   /api/events/:id/complete
POST   /api/events/:id/cancel
POST   /api/events/:id/expense
GET    /api/events/:id/analytics
GET    /api/events/:id/tasks
POST   /api/events/:id/tasks
```

### Venues
```
GET  /api/venues
POST /api/venues
GET  /api/venues/:id
PATCH /api/venues/:id
GET  /api/venues/:id/availability
```

### Bookings
```
GET  /api/bookings
POST /api/bookings
POST /api/bookings/:id/quote
POST /api/bookings/:id/confirm
POST /api/bookings/:id/cancel
```

### Guests
```
GET  /api/events/:id/guests
POST /api/events/:id/guests
GET  /api/guests/:id
POST /api/guests/:id/rsvp
POST /api/guests/:id/checkin
POST /api/guests/:id/seating
GET  /api/events/:id/guests/stats
```

### Vendors
```
GET  /api/vendors
POST /api/vendors
GET  /api/vendors/:id
GET  /api/vendors/category/:category
POST /api/vendors/:id/rate
GET  /api/vendor-categories
```

### Catering
```
GET  /api/menus
POST /api/menus
GET  /api/menus/:id
POST /api/menus/:id/sections
GET  /api/menus/:id/cost
```

### Banquet Rooms
```
GET /api/banquet-rooms
POST /api/banquet-rooms
GET /api/venues/:id/banquet-rooms
```

### Entertainment
```
GET /api/entertainment
POST /api/entertainment
GET /api/entertainment/types
GET /api/events/:id/entertainment
```

### Decorations
```
GET /api/decorations
POST /api/decorations
GET /api/decorations/themes
GET /api/events/:id/decorations
```

### Invoices
```
GET  /api/invoices
POST /api/invoices
GET  /api/invoices/:id
POST /api/invoices/:id/items
POST /api/invoices/:id/payment
POST /api/invoices/:id/discount
GET  /api/events/:id/invoices
```

### Analytics
```
GET /api/analytics/platform
GET /api/analytics/revenue
```

---

## Quick Start

```bash
cd industry-os/services/event-banquet-os
npm install
npm start  # Port 4751

# Test
curl http://localhost:4751/health

# Create event
curl -X POST http://localhost:4751/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Corporate Gala","type":"corporate","expectedGuests":200}'

# Create venue
curl -X POST http://localhost:4751/api/venues \
  -H "Content-Type: application/json" \
  -d '{"name":"Grand Ballroom","capacity":500,"city":"Mumbai"}'
```

---

## RTMN Integration

| Service | Purpose |
|---------|---------|
| Marketing OS (5500) | Promote events |
| Finance OS (4801) | Invoicing |
| Hotel OS (5025) | Venue partnership |
| Restaurant OS (5010) | Catering |
| Analytics OS (4750) | Platform metrics |
| Exhibition OS (5040) | Exhibition events |

---

*Last Updated: June 18, 2026*
