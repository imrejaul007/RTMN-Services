# RTMN API Quick Reference Card

## Base URL
```
http://localhost:4399/api
```

## Health & Registry

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Hub health |
| `/api/services` | GET | All services |
| `/api/services/:category` | GET | By category |
| `/api/services/:id` | GET | Single service |

---

## Industry Workflows

### Hospitality

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Restaurant Order | `POST /workflow/restaurant/order` | Orders + CRM + Wallet |
| Hotel Booking | `POST /workflow/hotel/booking` | Bookings + CRM + Journey |
| Multi-Property | `POST /workflow/hospitality/multi-property` | Bundle booking |

### Healthcare

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Appointment | `POST /workflow/healthcare/appointment` | Patients + CRM + Care |
| Emergency | `POST /workflow/healthcare/emergency` | Priority + Ambulance |

### Retail

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Order | `POST /workflow/retail/order` | Cart → Payment → Shipping |
| Return | `POST /workflow/retail/return` | Refund → Inventory |
| Subscription | `POST /workflow/retail/subscription` | Recurring billing |

### Real Estate

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Inquiry | `POST /workflow/realestate/inquiry` | Lead + Viewing + CRM |
| Purchase | `POST /workflow/realestate/purchase` | Deal + Legal + Finance |
| Rental | `POST /workflow/realestate/rental` | Lease + Payments |

### Education

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Enrollment | `POST /workflow/education/enrollment` | Student + Payment + CRM |
| Course Access | `POST /workflow/education/course-access` | Content + Progress |
| Certification | `POST /workflow/education/certification` | Credentials + Wallet |

### Automotive

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Purchase | `POST /workflow/automotive/purchase` | Test Drive + Finance |
| Service | `POST /workflow/automotive/service` | Appointment + Care |
| Rental | `POST /workflow/automotive/rental` | Vehicle + Insurance |
| Lease | `POST /workflow/automotive/lease` | Finance + Insurance |

### Travel

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Complete Trip | `POST /workflow/travel/complete-trip` | Flights + Hotel + Activities |
| Flight Booking | `POST /workflow/travel/flight` | Booking + Baggage + Meals |
| Hotel Booking | `POST /workflow/travel/hotel` | Room + Amenities + CRM |
| Package | `POST /workflow/travel/package` | Bundle + Savings |

### Manufacturing

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| B2B Order | `POST /workflow/manufacturing/b2b-order` | Quote + Production + Logistics |
| Supply Chain | `POST /workflow/manufacturing/supply` | Vendor + Inventory |
| Quality Check | `POST /workflow/manufacturing/quality` | Inspection + Compliance |

### Beauty & Fitness

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Salon Appointment | `POST /workflow/beauty/appointment` | Stylist + Products |
| Gym Membership | `POST /workflow/fitness/membership` | Trainer + Classes |
| Personal Training | `POST /workflow/fitness/personal` | Trainer + Schedule |

### Professional Services

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Consultation | `POST /workflow/professional/consultation` | Expert + Calendar + Payment |
| Legal Case | `POST /workflow/legal/case` | Lawyer + Documents |
| Accounting | `POST /workflow/financial/bookkeeping` | Transactions + Reports |

### Construction

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Quote | `POST /workflow/construction/quote` | Survey + Estimates |
| Project | `POST /workflow/construction/project` | Timeline + Budget |
| Renovation | `POST /workflow/construction/renovation` | Design + Materials |

### Events & Entertainment

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Registration | `POST /workflow/events/registration` | Tickets + CRM + Journey |
| Exhibition Lead | `POST /workflow/events/lead` | Contact + Follow-up |
| Conference | `POST /workflow/events/conference` | Sessions + Networking |

### Gaming

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Tournament | `POST /workflow/gaming/tournament` | Registration + Prize Pool |
| Subscription | `POST /workflow/gaming/subscription` | Cloud + Premium |
| Tournament Prize | `POST /workflow/gaming/prize` | Wallet + Leaderboard |

### Sports

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Academy | `POST /workflow/sports/academy` | Enrollment + Equipment |
| League | `POST /workflow/sports/league` | Team + Schedule |
| Training Camp | `POST /workflow/sports/training` | Coach + Facility |

### Agriculture

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Farm Inputs | `POST /workflow/agriculture/inputs` | Seeds + Fertilizer + Logistics |
| Contract Farming | `POST /workflow/agriculture/contract` | Buyer + Farmer + Terms |
| Harvest | `POST /workflow/agriculture/harvest` | Quality + Payment |

### Government

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Permit | `POST /workflow/government/permit` | Application + Fee + Tracking |
| Certificate | `POST /workflow/government/certificate` | Documents + Verification |
| Scheme | `POST /workflow/government/scheme` | Eligibility + Application |

### Transport

| Workflow | Endpoint | Service |
|-----------|-----------|---------|
| Shipment | `POST /workflow/transport/shipment` | Tracking + Insurance |
| Fleet | `POST /workflow/transport/fleet` | Vehicles + Maintenance |
| Delivery | `POST /workflow/transport/delivery` | Route + Driver + Customer |

---

## Cross-OS Operations

### Customer 360

```bash
GET /api/customer360/:id
```
Returns: Sales + Media + Marketing + CRM + Wallet

### Lead to Revenue

```bash
POST /api/workflow/lead-to-revenue
{
  "email": "customer@example.com",
  "name": "John Doe",
  "source": "website"
}
```

### Campaign Launch

```bash
POST /api/workflow/campaign-launch
{
  "name": "Summer Sale",
  "budget": 50000,
  "audience": "luxury_travelers",
  "channels": ["google_ads", "meta_ads", "email"]
}
```

---

## Service Proxies

| Service | Proxy Prefix | Port |
|---------|-------------|------|
| Sales OS | `/api/sales/` | 5055 |
| Media OS | `/api/media/` | 5600 |
| Marketing OS | `/api/marketing/` | 5500 |
| Hotel OS | `/api/hotel/` | 5025 |
| Restaurant OS | `/api/restaurant/` | 5010 |
| Healthcare OS | `/api/healthcare/` | 5020 |
| Retail OS | `/api/retail/` | 5030 |
| RealEstate OS | `/api/realestate/` | 5230 |
| Education OS | `/api/education/` | 5060 |
| Automotive OS | `/api/automotive/` | 5080 |
| Beauty OS | `/api/beauty/` | 5090 |
| Fitness OS | `/api/fitness/` | 5110 |
| Gaming OS | `/api/gaming/` | 5120 |
| Travel OS | `/api/travel/` | 5190 |
| Manufacturing OS | `/api/manufacturing/` | 5150 |
| Finance OS | `/api/financial/` | 5220 |

---

## Response Format

### Success
```json
{
  "success": true,
  "workflow": "hotel_booking",
  "results": {
    "booking": { "success": true, "data": {...} },
    "crm": { "success": true, "data": {...} },
    "wallet": { "success": true, "data": {...} }
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Service unavailable",
  "service": "hotel-os",
  "workflow": "hotel_booking"
}
```

---

## Common Data Models

### Customer
```json
{
  "customerId": "CUST_123",
  "email": "john@example.com",
  "phone": "+91 98765 43210",
  "name": "John Doe",
  "addresses": [{ "type": "billing", "line1": "123 Main St" }]
}
```

### Order
```json
{
  "orderId": "ORD_123",
  "customerId": "CUST_123",
  "items": [{ "productId": "PROD_456", "quantity": 2, "price": 999 }],
  "total": 1998,
  "currency": "INR",
  "status": "pending"
}
```

### Booking
```json
{
  "bookingId": "BK_123",
  "customerId": "CUST_123",
  "checkIn": "2026-07-01",
  "checkOut": "2026-07-03",
  "roomType": "deluxe",
  "guests": 2,
  "total": 15000,
  "status": "confirmed"
}
```

---

## Status Codes

| Status | Description |
|--------|-------------|
| `pending` | Awaiting action |
| `confirmed` | Action completed |
| `processing` | In progress |
| `shipped` | Dispatched |
| `delivered` | Completed |
| `cancelled` | Terminated |
| `refunded` | Money returned |
| `active` | Currently valid |
| `expired` | No longer valid |

---

## HTTP Methods

| Method | Usage |
|--------|-------|
| `GET` | Read/Retrieve |
| `POST` | Create |
| `PUT` | Full update |
| `PATCH` | Partial update |
| `DELETE` | Remove |

---

## Rate Limits

| Tier | Requests | Window |
|------|----------|--------|
| Free | 100 | 15 min |
| Pro | 1,000 | 15 min |
| Enterprise | Unlimited | - |

---

## Headers

```bash
Authorization: Bearer <token>
Content-Type: application/json
X-Organization-ID: <org_id>
X-Request-ID: <uuid>
```

---

## Environment Variables

```bash
PORT=4399
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/rtmn
SALES_OS_URL=http://localhost:5055
MEDIA_OS_URL=http://localhost:5600
MARKETING_OS_URL=http://localhost:5500
```

---

*Last Updated: June 17, 2026*
