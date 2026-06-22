# Quick Start - Room QR Setup

> **Enable QR-based guest services in your hotel**

---

## Overview

Room QR allows hotel guests to:
- Request services (housekeeping, room service, maintenance)
- Add charges to their room
- View their bill
- Check out

---

## Prerequisites

- [Basic Setup Complete](./SETUP.md)
- Rez Now app running
- ReZ Auth, Wallet, and Payment services available

---

## Step 1: Generate Room QR Codes

### Option A: Admin Dashboard

1. Go to `rez-now/room/admin`
2. Enter hotel/room configuration
3. Click "Generate QRs"
4. Download QR codes as PNG/PDF

### Option B: API

```bash
# Generate QR for a room
curl -X POST http://localhost:3000/api/room/generate-qr \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "ROOM-101",
    "hotelId": "HOTEL-001",
    "guestId": null
  }'

# Response
{
  "roomId": "ROOM-101",
  "qrToken": "eyJhbGciOiJIUzI1NiIs...",
  "qrUrl": "rez://room/ROOM-101?token=eyJ...",
  "qrImage": "data:image/png;base64,..."
}
```

---

## Step 2: Print and Place QR Codes

1. Download QR codes (print-ready PDF available)
2. Print on durable material (laminate recommended)
3. Place QR code:
   - Back of room door
   - Bathroom mirror
   - Bedside table
   - Reception desk

### Recommended Placement

| Location | Purpose |
|----------|---------|
| Back of door | Quick access on entry |
| Bathroom | Service requests while getting ready |
| Bedside | Night-time requests |

---

## Step 3: Configure Services

Edit `rez-now/src/config/services.ts`:

```typescript
export const ROOM_SERVICES = {
  housekeeping: {
    name: 'Housekeeping',
    icon: '🧹',
    priorityOptions: ['low', 'normal', 'high'],
    estimatedTime: '30 mins',
  },
  roomService: {
    name: 'Room Service',
    icon: '🍽️',
    priorityOptions: ['normal', 'high', 'urgent'],
    estimatedTime: '45 mins',
  },
  maintenance: {
    name: 'Maintenance',
    icon: '🔧',
    priorityOptions: ['low', 'normal', 'urgent'],
    estimatedTime: '2 hours',
  },
  concierge: {
    name: 'Concierge',
    icon: '🛎️',
    priorityOptions: ['normal', 'high'],
    estimatedTime: '15 mins',
  },
};
```

---

## Step 4: Test the Flow

### Manual Test

1. Open the Rez Now app
2. Scan a room QR code
3. Verify authentication (token valid)
4. Request a service
5. Check dashboard for request

### Automated Test

```bash
npx tsx scripts/test-qr-integration.ts --test=room
```

---

## API Reference

### Generate Room QR
```
POST /api/room/generate-qr
```

### Submit Service Request
```
POST /api/room/service-request

Request:
{
  "roomId": "ROOM-101",
  "serviceType": "housekeeping",
  "description": "Extra towels",
  "priority": "normal"
}

Response:
{
  "id": "SR-uuid",
  "status": "pending",
  "estimatedTime": "30 mins"
}
```

### Add Charge
```
POST /api/room/add-charge

Request:
{
  "roomId": "ROOM-101",
  "guestId": "GUEST-uuid",
  "item": "Minibar - Beer",
  "amount": 150
}

Response:
{
  "id": "CH-uuid",
  "newTotal": 850
}
```

### Checkout
```
POST /api/room/checkout

Request:
{
  "roomId": "ROOM-101",
  "guestId": "GUEST-uuid",
  "paymentMethod": "wallet"
}

Response:
{
  "checkoutId": "CO-uuid",
  "status": "completed",
  "invoiceId": "INV-uuid",
  "total": 850
}
```

---

## Database Schema

```sql
-- Room Services
CREATE TABLE room_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(50) NOT NULL,
  guest_id UUID NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Room Charges
CREATE TABLE room_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(50) NOT NULL,
  guest_id UUID NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Room Checkouts
CREATE TABLE room_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(50) NOT NULL,
  guest_id UUID NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  invoice_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Integration with StayOwn

To sync room data with StayOwn property management:

```env
STAYOWN_API_URL=https://api.stayown.com
STAYOWN_API_KEY=your-stayown-key
```

This enables:
- Auto-check-in from StayOwn
- Sync guest profiles
- Update room status

---

## Troubleshooting

### QR not scanning
- Check camera permissions
- Verify QR is not blurred/damaged
- Test with another QR scanner app

### Service request not working
- Verify ReZ Auth service is running
- Check JWT token validity
- Review server logs

### Charge not adding
- Verify Wallet service has guest balance
- Check room exists in database
- Ensure guest is checked in

---

## Next Steps

| Task | Guide |
|------|-------|
| Set up Menu QR | [Menu QR Guide](./MENU-QR.md) |
| Set up Rez Now | [Rez Now Guide](./REZ-NOW.md) |
| Full testing | [Testing Guide](./TESTING.md) |

---

## Flow Diagram

```
Guest arrives ──► Scans Room QR ──► Authenticates
                                        │
                                        ▼
                                 Service Menu
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
       Housekeeping           Room Service           Maintenance
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
                                    ▼
                            Staff receives request
                                    │
                                    ▼
                            Request completed
                                    │
                                    ▼
                           Guest adds charges
                                    │
                                    ▼
                          Guest checks out (pay all)
```
