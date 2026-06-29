# Service Connectors - REZ-Merchant Integration

Service Connectors provide a **unified API** for connecting to all REZ-Merchant services with built-in tenant isolation.

## Architecture

```
CompanyOS Control Plane
        ↓
Service Connectors (Industry-specific)
        ↓
REZ-Merchant Services
```

## Industries & Services

### 🍔 Restaurant

| REZ Service | Purpose | Connector Module |
|-------------|---------|-----------------|
| `rez-menu-service` | Menu management | `RestaurantConnector` |
| `rez-order-service` | Order processing | `RestaurantConnector` |
| `rez-table-booking-service` | Reservations | `RestaurantConnector` |
| `rez-kds-service` | Kitchen display | `RestaurantConnector` |
| `rez-pos-service` | Point of sale | `RestaurantConnector` |
| `rez-inventory-service` | Inventory | `RestaurantConnector` |
| `rez-ai-waiter` | AI assistant | `RestaurantConnector` |

**Source:** `companies/REZ-Merchant/rez-*/`

### 💅 Beauty

| REZ Service | Purpose | Connector Module |
|-------------|---------|-----------------|
| Appointments | Scheduling | `BeautyConnector` |
| Stylists | Staff management | `BeautyConnector` |
| Services | Service catalog | `BeautyConnector` |
| Memberships | Loyalty tiers | `BeautyConnector` |

**Source:** `companies/REZ-Merchant/beauty-*` (if exists)

### 🏨 Hotel

| REZ Service | Purpose | Connector Module |
|-------------|---------|-----------------|
| PMS | Property management | `HotelConnector` |
| Booking | Reservations | `HotelConnector` |
| Channel Manager | OTA sync | `HotelConnector` |
| Housekeeping | Room tasks | `HotelConnector` |
| Billing | Invoicing | `HotelConnector` |

**Source:** `companies/REZ-Merchant/REZ-hotel-*`

### 🛒 Retail

| REZ Service | Purpose | Connector Module |
|-------------|---------|-----------------|
| `rez-retail-service` | Core retail | `RetailConnector` |
| `rez-retail-pos-service` | POS | `RetailConnector` |
| `rez-retail-inventory-service` | Inventory | `RetailConnector` |
| `rez-retail-loyalty-service` | Loyalty | `RetailConnector` |
| `rez-retail-analytics-service` | Analytics | `RetailConnector` |
| `rez-retail-crm-service` | CRM | `RetailConnector` |

**Source:** `companies/REZ-Merchant/rez-retail-*`

## Usage

### Basic Usage

```typescript
import { RestaurantConnector } from '@hojai/service-connectors';

// Create connector
const restaurant = new RestaurantConnector();

// Set tenant context
restaurant.setTenant({
  tenantId: 'company_123',
  companyId: 'company_123',
});

// Make API calls
const menu = await restaurant.getMenu();
const order = await restaurant.createOrder({
  items: [{ name: 'Burger', quantity: 2, price: 150 }],
  tableNumber: 5,
});
```

### Factory Function

```typescript
import { getConnector } from '@hojai/service-connectors';

// Get connector for industry
const restaurant = getConnector('restaurant', tenantContext);
const hotel = getConnector('hotel', tenantContext);
const retail = getConnector('retail', tenantContext);
```

### Restaurant Example

```typescript
// Create order
const order = await restaurant.createOrder({
  items: [
    { name: 'Margherita Pizza', quantity: 1, price: 299 },
    { name: 'Coke', quantity: 2, price: 50 },
  ],
  tableNumber: 5,
  customerId: 'cust_123',
});

// Get kitchen orders
const kitchenOrders = await restaurant.getKitchenOrders();

// Process payment
const paid = await restaurant.processPayment(order.data!.id, 'upi');
```

### Hotel Example

```typescript
// Check availability
const rooms = await hotel.checkAvailability('2026-07-01', '2026-07-03', 'deluxe');

// Create booking
const booking = await hotel.createBooking({
  guestId: 'guest_123',
  roomId: 'room_101',
  checkIn: '2026-07-01',
  checkOut: '2026-07-03',
  source: 'direct',
});

// Housekeeping task
await hotel.createTask({
  roomId: 'room_101',
  type: 'cleaning',
  priority: 'high',
  scheduledFor: '2026-07-01T10:00:00Z',
});
```

### Beauty Example

```typescript
// Get available slots
const slots = await beauty.getStylistAvailability('stylist_001', '2026-07-01');

// Create appointment
const appointment = await beauty.createAppointment({
  customerId: 'cust_123',
  serviceId: 'svc_haircut',
  stylistId: 'stylist_001',
  date: '2026-07-01',
  time: '14:00',
});

// Use membership visit
await beauty.useVisit('cust_123');
```

### Retail Example

```typescript
// Get products
const products = await retail.getProducts({ category: 'electronics' });

// Process sale
const sale = await retail.createSale({
  items: [{ productId: 'prod_001', quantity: 2 }],
  cashierId: 'staff_001',
  paymentMethod: 'card',
  customerId: 'cust_123',
});

// Get analytics
const report = await retail.getSalesReport('month');
```

## All Available Connectors

| Industry | Class | Services |
|----------|-------|----------|
| Restaurant | `RestaurantConnector` | Menu, Order, Booking, KDS, POS, Inventory, AI Waiter |
| Beauty | `BeautyConnector` | Appointments, Stylists, Services, Memberships |
| Hotel | `HotelConnector` | PMS, Booking, Channel, Housekeeping, Billing |
| Retail | `RetailConnector` | Products, POS, Inventory, Loyalty, Analytics, CRM |

## Environment Variables

```bash
# Restaurant
REZ_MENU_SERVICE_URL=http://localhost:3002
REZ_ORDER_SERVICE_URL=http://localhost:3003
REZ_TABLE_BOOKING_URL=http://localhost:3004
REZ_KDS_SERVICE_URL=http://localhost:3005
REZ_POS_SERVICE_URL=http://localhost:3006
REZ_INVENTORY_SERVICE_URL=http://localhost:3007
REZ_AI_WAITER_URL=http://localhost:3008

# Beauty
REZ_APPOINTMENT_SERVICE_URL=http://localhost:3010
REZ_STYLIST_SERVICE_URL=http://localhost:3011
REZ_BEAUTY_SERVICE_URL=http://localhost:3012
REZ_MEMBERSHIP_SERVICE_URL=http://localhost:3013

# Hotel
REZ_PMS_SERVICE_URL=http://localhost:3020
REZ_BOOKING_SERVICE_URL=http://localhost:3021
REZ_HOTEL_CHANNEL_URL=http://localhost:3022
REZ_HOUSEKEEPING_URL=http://localhost:3023
REZ_HOTEL_BILLING_URL=http://localhost:3024

# Retail
REZ_RETAIL_SERVICE_URL=http://localhost:3030
REZ_RETAIL_POS_URL=http://localhost:3031
REZ_RETAIL_INVENTORY_URL=http://localhost:3032
REZ_RETAIL_LOYALTY_URL=http://localhost:3033
REZ_RETAIL_ANALYTICS_URL=http://localhost:3034
REZ_RETAIL_CRM_URL=http://localhost:3035
```

## Health Checks

```typescript
// Check all services
const health = await restaurant.healthCheck();
console.log(health);
// { menu: 'healthy', order: 'healthy', kds: 'degraded', ... }
```

## Adding New Connectors

1. Create new connector file: `src/[industry]-connector.ts`
2. Extend `BaseConnector`
3. Add service URLs to environment variables
4. Export factory function
5. Update `src/index.ts`

## REZ-Merchant Services to Connect

```
companies/REZ-Merchant/
├── rez-menu-service/              → Restaurant
├── rez-order-service/           → Restaurant
├── rez-table-booking-service/    → Restaurant
├── rez-kds-service/              → Restaurant
├── rez-pos-service/             → Restaurant / Retail
├── rez-inventory-service/        → Restaurant
├── rez-ai-waiter/               → Restaurant
├── rez-retail-service/          → Retail
├── rez-retail-pos-service/       → Retail
├── rez-retail-inventory-service/ → Retail
├── rez-retail-loyalty-service/  → Retail
├── rez-retail-analytics-service/ → Retail
├── rez-retail-crm-service/       → Retail
├── rez-hotel-channel-bridge/    → Hotel
├── REZ-realestate-os/           → Real Estate
├── REZ-manufacturing-os/        → Manufacturing
└── ... (30+ more)
```
