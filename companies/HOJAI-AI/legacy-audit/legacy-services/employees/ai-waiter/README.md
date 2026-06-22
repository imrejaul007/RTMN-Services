# AI Waiter - Restaurant Employee Agent

**Company:** HOJAI AI
**Type:** L2 Specialist Employee
**Industry:** Restaurant/Hospitality
**Port:** 5600
**Status:** ✅ Connected & Working (June 14, 2026)

---

## Overview

AI Waiter is an AI employee that handles restaurant customer interactions via WhatsApp and voice. It takes orders, answers menu questions, and manages reservations.

### Tagline
> "Your AI Waiter - Order taking, reservations, and customer support"

---

## Services Created

| Service | File | Connects To | Port |
|---------|------|-------------|------|
| **Menu Service** | `src/services/menu-service.ts` | REZ Menu Service | 4030 |
| **Order Service** | `src/services/order-service.ts` | REZ POS Service | 4081 |
| **Reservation Service** | `src/services/reservation-service.ts` | REZ Table Booking | 4070 |
| **Memory Service** | `src/services/memory-service.ts` | HOJAI Memory | 4520 |

---

## Capabilities

### Order Taking
- [x] WhatsApp menu browsing
- [x] Item recommendations
- [x] Customization handling (no onion, extra cheese, etc.)
- [x] Special requests
- [x] Order confirmation
- [x] Payment link generation
- [x] Kitchen display notification

### Reservations
- [x] Table booking
- [x] Guest count handling
- [x] Special occasion notes
- [x] Time slot management
- [x] Confirmation messages

### Customer Support
- [x] Menu questions
- [x] Dietary restrictions (veg, vegan, Jain)
- [x] Allergen information
- [x] Opening hours
- [x] Location/Directions
- [x] Parking info

### Upselling
- [x] Combo suggestions
- [x] Beverages with meals
- [x] Desserts after main course
- [x] Special offers/deals

---

## Integration Points

| Service | Purpose | Status |
|---------|---------|--------|
| REZ Menu Service | Menu data, dietary filtering | ✅ Connected |
| REZ POS Service | Order creation, payment links | ✅ Connected |
| REZ KDS | Kitchen display notification | ✅ Connected |
| REZ Table Booking | Reservation management | ✅ Connected |
| HOJAI Memory | Guest preferences, session memory | ✅ Connected |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/chat` | Handle chat message |
| POST | `/api/whatsapp/webhook` | WhatsApp webhook |
| POST | `/api/reservations` | Create reservation |
| POST | `/api/orders` | Create order |
| GET | `/api/menu` | Get full menu |
| GET | `/api/menu/dietary` | Get dietary options |
| GET | `/api/orders/active` | Get active orders |
| POST | `/api/customer/info` | Set customer info |

---

## User Flow

```
Customer → WhatsApp Message
    ↓
AI Waiter Recognizes Intent
    ↓
[Order Taking] → [Menu Query] → [Reservation] → [Dietary]
    ↓
Confirms with Customer
    ↓
Creates Order in POS Service (Port 4081)
    ↓
Sends to Kitchen Display (Port 4080)
    ↓
Generates Payment Link
    ↓
Confirmation to Customer
```

---

## Example Conversations

### Order Flow
```
Customer: Hi, I want to order
AI Waiter: Hi! 🍽️ Welcome! Would you like to see our menu?

Customer: Show me vegetarian options
AI Waiter: 🌿 *Vegetarian Options:*
• Masala Dosa - ₹120
• Rava Idli - ₹80
• Pongal - ₹90
• Butter Paneer - ₹180
What would you like?

Customer: One masala dosa, one pongal
AI Waiter: 🛒 *Your Order:*
1. Masala Dosa - ₹120
2. Pongal - ₹90
Total: ₹210

Shall I confirm this order?

Customer: Yes
AI Waiter: ✅ *Order Confirmed!*
Order #ORD-1234
Kitchen has been notified.
Estimated time: 15-20 minutes
Enjoy your meal! 🍽️
```

### Reservation Flow
```
Customer: Book a table for 4 tonight at 8pm
AI Waiter: Table for 4 at 8 PM tonight.
Any special occasion I should know about?

Customer: It's my wife's birthday
AI Waiter: 🎂 Happy birthday to your wife!
I've noted it. We'll have a small surprise ready.
Name for the reservation?

Customer: Rahul Sharma
AI Waiter: ✅ *Confirmed!*
Rahul Sharma - Table for 4
Tonight at 8 PM
Birthday celebration noted.
See you soon! 🌟
```

---

## Quick Start

```bash
cd companies/hojai-ai/employees/ai-waiter
npm install
npm run dev
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| AI_WAITER_PORT | 5600 | Service port |
| MENU_SERVICE_URL | http://localhost:4030 | REZ Menu Service |
| POS_SERVICE_URL | http://localhost:4081 | REZ POS Service |
| KDS_SERVICE_URL | http://localhost:4080 | Kitchen Display |
| TABLE_BOOKING_URL | http://localhost:4070 | Table Booking |
| MEMORY_SERVICE_URL | http://localhost:4520 | Memory Service |
| INTERNAL_SERVICE_TOKEN | dev-token | Service authentication |

---

## Tech Stack

- Node.js 18+
- Express.js
- TypeScript
- MongoDB (for services)
- Redis (for caching)

---

## Technical Details

- **Port:** 5600
- **Framework:** Express.js
- **Memory:** Customer session memory via Memory Service
- **Channels:** WhatsApp, Web Chat
- **Languages:** Hindi, English, +8 Indian languages

---

## Story Coverage

| Chapter | Story Component | Status |
|---------|----------------|--------|
| Ch 6 | Coffee order → Kitchen | ✅ Working |
| Ch 8 | Restaurant experience | ✅ Working |

---

**Last Updated:** June 14, 2026
