# Hospitality OS - Development Guide

**Port:** 5050  
**Type:** Cross-Industry Hospitality Platform

## Architecture

Hospitality OS is a unified platform that manages multiple hospitality establishments (hotels, restaurants, spas, bars, venues) under one system.

### Supported Establishment Types

- hotel
- restaurant
- spa
- bar
- venue
- lounge
- club
- cafe

### Core Components

1. **Establishment Manager** - Multi-type hospitality business management
2. **Staff Roster** - Employee management across establishments
3. **Customer Hub** - Unified customer profiles
4. **Transaction Engine** - Cross-establishment transactions
5. **Event System** - Event creation and ticketing
6. **Loyalty Program** - Points and tier management

### Data Models

#### Establishment
```javascript
{
  id: string,
  name: string,
  type: string,
  address: string,
  amenities: string[],
  rating: number,
  status: 'active'|'inactive'
}
```

#### Staff
```javascript
{
  id: string,
  name: string,
  role: string,
  establishmentId: string,
  status: 'active'|'inactive'|'on_leave'
}
```

#### Transaction
```javascript
{
  id: string,
  customerId: string,
  establishmentId: string,
  type: 'sale'|'refund'|'deposit',
  amount: number,
  paymentMethod: string
}
```

### Digital Twins

| Twin | Purpose |
|------|---------|
| establishment-twin | Business count |
| staff-twin | Active roster |
| customer-twin | Active customers |
| transaction-twin | Volume tracking |
| event-twin | Upcoming events |

### Integration Points

- **API Gateway** (port 3000) - Request routing
- **Restaurant OS** (port 5010) - Restaurant-specific features
- **Hotel OS** (port 5025) - Hotel-specific features
- **TwinOS Hub** - Central synchronization

### Testing

```bash
curl http://localhost:5050/health
curl http://localhost:5050/api/analytics
```
