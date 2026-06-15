# Hotel OS - Development Guide

**Port:** 5025  
**Type:** Industry OS (Hospitality)

## Architecture

Hotel OS manages the complete hotel lifecycle from room inventory to booking management, guest services, and revenue tracking.

### Core Components

1. **Room Manager** - Room inventory, types, pricing, availability
2. **Booking Engine** - Reservation management, conflict detection, pricing
3. **Guest Manager** - Guest profiles, loyalty program, preferences
4. **Service Request** - Room service, spa, transport, housekeeping
5. **Invoice System** - Billing, payments, refunds
6. **Analytics** - Occupancy, revenue, guest insights

### Data Models

#### Room
```javascript
{
  id: string,
  number: number,
  floor: number,
  type: 'standard'|'deluxe'|'suite'|'presidential',
  price: number,
  capacity: number,
  amenities: string[],
  view: 'city'|'ocean',
  status: 'available'|'occupied'|'maintenance'|'reserved'
}
```

#### Booking
```javascript
{
  id: string,
  bookingNumber: string,
  roomId: string,
  guestId: string,
  checkIn: ISO8601,
  checkOut: ISO8601,
  nights: number,
  roomPrice: number,
  subtotal: number,
  tax: number,
  total: number,
  status: 'confirmed'|'checked-in'|'checked-out'|'cancelled'|'no-show'
}
```

#### Guest
```javascript
{
  id: string,
  name: string,
  email: string,
  phone: string,
  loyaltyPoints: number,
  tier: 'bronze'|'silver'|'gold'|'platinum',
  stayCount: number,
  totalSpent: number,
  preferences: object
}
```

### Digital Twins Sync

All twins are automatically updated on:
- Room status changes
- Booking creation/cancellation
- Guest check-in/out
- Service completions
- Invoice payments

### Integration Points

- **API Gateway** (port 3000) - Routes hotel requests
- **TwinOS Hub** - Central twin synchronization
- **MemoryOS** - Guest data persistence
- **RABTUL Payment** - Invoice payment processing

### Testing

```bash
# Health check
curl http://localhost:5025/health

# Create booking
curl -X POST http://localhost:5025/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"roomId":"R101","checkIn":"2026-06-15","checkOut":"2026-06-18"}'

# Get analytics
curl http://localhost:5025/api/analytics
```
