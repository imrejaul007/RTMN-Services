# Restaurant OS - Features

**Version:** 1.0.0  
**Last Updated:** June 15, 2026  
**Port:** 5010  
**Status:** ✅ RUNNING

---

## Core Features

### 1. Menu Management

| Feature | Description | Status |
|---------|-------------|--------|
| CRUD Operations | Create, read, update, delete menu items | ✅ |
| Category Filtering | Filter by category | ✅ |
| Price Management | Set and update prices | ✅ |
| Prep Time Tracking | Track preparation time | ✅ |
| Active/Inactive | Toggle item availability | ✅ |
| Dietary Tags | Vegetarian, vegan, gluten-free | ✅ |

### 2. Order Processing

| Feature | Description | Status |
|---------|-------------|--------|
| Order Creation | Create new orders | ✅ |
| Status Tracking | pending → preparing → ready → served | ✅ |
| Priority Orders | Urgent order handling | ✅ |
| Tax Calculation | Automatic GST calculation | ✅ |
| Order Items | Multiple items per order | ✅ |
| Special Instructions | Notes for kitchen | ✅ |

### 3. Kitchen Display

| Feature | Description | Status |
|---------|-------------|--------|
| Real-time Queue | Live order queue | ✅ |
| Status Updates | Mark items as preparing/ready | ✅ |
| Prep Notes | View special instructions | ✅ |
| Statistics | Orders per hour, avg prep time | ✅ |
| Priority Handling | Highlight urgent orders | ✅ |

### 4. Table Management

| Feature | Description | Status |
|---------|-------------|--------|
| Table CRUD | Create, read, update tables | ✅ |
| Reservation System | Book tables | ✅ |
| Capacity Tracking | Track available seats | ✅ |
| Section Management | Organize tables by section | ✅ |
| Status | available, reserved, occupied | ✅ |

### 5. Customer Management

| Feature | Description | Status |
|---------|-------------|--------|
| Customer CRUD | Manage customer profiles | ✅ |
| Loyalty Points | Point accumulation | ✅ |
| Tier System | Bronze, Silver, Gold, Platinum | ✅ |
| Visit History | Track customer visits | ✅ |
| Preferences | Store customer preferences | ✅ |

### 6. Reviews

| Feature | Description | Status |
|---------|-------------|--------|
| Review Submission | Submit customer reviews | ✅ |
| Rating System | 1-5 star rating | ✅ |
| Aspect Ratings | Food, Service, Ambiance | ✅ |
| Response | Owner responses | ✅ |

### 7. Digital Twins

| Twin | Purpose | Data |
|------|---------|------|
| Menu Twin | Menu items | Items, prices, categories |
| Order Twin | Orders | Order history, patterns |
| Kitchen Twin | Kitchen state | Queue, prep times |
| Table Twin | Table state | Occupancy, reservations |
| Customer Twin | Customer profiles | Loyalty, preferences |

---

## API Endpoints

### Menu

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu` | List menu items |
| POST | `/api/menu` | Create menu item |
| GET | `/api/menu/:id` | Get menu item |
| PUT | `/api/menu/:id` | Update menu item |
| DELETE | `/api/menu/:id` | Delete menu item |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/:id` | Get order |
| PATCH | `/api/orders/:id/status` | Update status |
| DELETE | `/api/orders/:id` | Cancel order |

### Tables

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tables` | List tables |
| GET | `/api/tables/:id` | Get table |
| PUT | `/api/tables/:id` | Update table |
| POST | `/api/tables/:id/reserve` | Reserve table |

### Kitchen

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/kitchen` | Kitchen queue |
| PATCH | `/api/kitchen/:orderId` | Update item status |

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Add customer |
| GET | `/api/customers/:id` | Get customer |
| PUT | `/api/customers/:id` | Update customer |
| POST | `/api/customers/:id/points` | Add loyalty points |

### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews` | List reviews |
| POST | `/api/reviews` | Submit review |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Dashboard analytics |

### Digital Twins

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/twins` | All twins |
| GET | `/api/twins/:name` | Specific twin |
| POST | `/api/twins/sync` | Sync twins |

---

## Integration

### Connected Services

| Service | Port | Integration |
|---------|------|-------------|
| REZ-ecosystem-connector | 4399 | Service registry |
| REZ-event-bus | 4510 | Event publishing |
| Nexha Procurement | - | Auto-reorder |

### Event Publishing

| Event | Trigger |
|-------|---------|
| order.created | New order |
| order.updated | Status change |
| table.reserved | Table booking |

---

*Last Updated: June 15, 2026*
*Restaurant OS - Hospitality Industry OS*