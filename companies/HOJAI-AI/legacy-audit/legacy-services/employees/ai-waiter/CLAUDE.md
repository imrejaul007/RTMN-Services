# CLAUDE.md - AI Waiter

## Project Overview

**Name:** AI Waiter
**Company:** hojai-ai
**Type:** Restaurant Employee Agent (L2 Specialist)
**Port:** 5600
**Status:** ✅ Connected & Working (June 14, 2026)

## Description

AI Waiter is an AI employee that handles restaurant customer interactions via WhatsApp and voice. It takes orders, answers menu questions, and manages reservations.

## Tech Stack

- Node.js 18+
- Express.js
- TypeScript
- MongoDB
- Redis
- Axios (for service communication)

## Services

### Services Created

| Service | File | Connects To | Port |
|---------|------|-------------|------|
| **MenuService** | `src/services/menu-service.ts` | REZ Menu Service | 4030 |
| **OrderService** | `src/services/order-service.ts` | REZ POS Service | 4081 |
| **ReservationService** | `src/services/reservation-service.ts` | REZ Table Booking | 4070 |
| **MemoryService** | `src/services/memory-service.ts` | HOJAI Memory | 4520 |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server (port 5600) |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| AI_WAITER_PORT | No | 5600 | Service port |
| MENU_SERVICE_URL | No | http://localhost:4030 | REZ Menu Service |
| POS_SERVICE_URL | No | http://localhost:4081 | REZ POS Service |
| KDS_SERVICE_URL | No | http://localhost:4080 | Kitchen Display |
| TABLE_BOOKING_URL | No | http://localhost:4070 | Table Booking |
| MEMORY_SERVICE_URL | No | http://localhost:4520 | Memory Service |
| INTERNAL_SERVICE_TOKEN | No | dev-token | Service authentication |

## API Endpoints

### Main Endpoints

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

## Integration Points

### Connected Services

| Service | Port | Purpose |
|---------|------|---------|
| REZ Menu Service | 4030 | Menu data, dietary filtering |
| REZ POS Service | 4081 | Order creation, payment links |
| REZ KDS | 4080 | Kitchen display notification |
| REZ Table Booking | 4070 | Reservation management |
| HOJAI Memory | 4520 | Guest preferences, session memory |

## File Structure

```
ai-waiter/
├── src/
│   ├── index.ts              # Main server + AIWaiter class
│   └── services/
│       ├── menu-service.ts      # Menu Service client
│       ├── order-service.ts     # Order Service client
│       ├── reservation-service.ts # Reservation Service client
│       └── memory-service.ts     # Memory Service client
├── package.json
├── tsconfig.json
├── README.md
└── CLAUDE.md
```

## Key Classes

### AIWaiter

Main class that handles all restaurant interactions:

```typescript
const waiter = new AIWaiter();
await waiter.handleIntent(customerId, message, context);
```

### MenuService

Fetches menu from REZ Menu Service:

```typescript
const menuService = new MenuService();
const menu = await menuService.getFullMenu();
const dietaryItems = await menuService.getMenuByDietary('vegetarian');
```

### OrderService

Creates orders in POS and notifies kitchen:

```typescript
const orderService = new OrderService();
const order = await orderService.createOrder(orderRequest);
await orderService.sendToKDS(order);
```

### ReservationService

Manages table reservations:

```typescript
const reservationService = new ReservationService();
const reservation = await reservationService.create(reservationRequest);
```

## Story Coverage

This agent enables the following story chapters:

| Chapter | Description | Status |
|---------|------------|--------|
| Ch 6 | Coffee order → Kitchen | ✅ Working |
| Ch 8 | Restaurant experience | ✅ Working |

## Notes

- All services have fallback demo data if external services are unavailable
- Menu items include Indian cuisine (South Indian, Main Course, Beverages, Desserts)
- Dietary filtering supports: veg, vegan, jain, gluten-free, nut-free
- Order confirmation includes kitchen notification via KDS

---

**Last Updated:** June 14, 2026
