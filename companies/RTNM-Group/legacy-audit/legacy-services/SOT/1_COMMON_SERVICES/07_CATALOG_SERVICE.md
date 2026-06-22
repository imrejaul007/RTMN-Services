# REZ Catalog Service

## Basic Info

| Field | Value |
|-------|-------|
| **Git Path** | `rez-catalog-service` |
| **Port** | 3005 (HTTP) |
| **Status** | Active |
| **Live URL** | https://rez-catalog-service.onrender.com |
| **Health Check** | `GET /health` |
| **Architecture** | CQRS (BullMQ workers + HTTP server) |

---

## Purpose

The Catalog Service manages the product and menu catalog for the ReZ platform. It handles restaurants, food items, categories, modifiers, variations, and inventory. The service provides search, filtering, and recommendation capabilities and coordinates with Order Service for menu data and Inventory Service for stock levels.

---

## Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache/Queue**: Redis, BullMQ
- **Observability**: Sentry, Prometheus

---

## API Endpoints

### Restaurants/Stores

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/restaurants` | List restaurants | Public |
| GET | `/api/restaurants/:restaurantId` | Get restaurant details | Public |
| POST | `/api/restaurants` | Create restaurant | Bearer |
| PUT | `/api/restaurants/:restaurantId` | Update restaurant | Bearer |
| DELETE | `/api/restaurants/:restaurantId` | Delete restaurant | Bearer |

### Categories

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/restaurants/:restaurantId/categories` | List categories | Public |
| POST | `/api/restaurants/:restaurantId/categories` | Create category | Bearer |
| PUT | `/api/categories/:categoryId` | Update category | Bearer |
| DELETE | `/api/categories/:categoryId` | Delete category | Bearer |

### Products/Items

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/products` | List all products | Public |
| GET | `/api/products/:productId` | Get product details | Public |
| GET | `/api/restaurants/:restaurantId/products` | List restaurant products | Public |
| POST | `/api/products` | Create product | Bearer |
| PUT | `/api/products/:productId` | Update product | Bearer |
| DELETE | `/api/products/:productId` | Delete product | Bearer |

### Modifiers & Variations

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/products/:productId/modifiers` | List modifiers | Public |
| POST | `/api/products/:productId/modifiers` | Add modifier | Bearer |
| PUT | `/api/modifiers/:modifierId` | Update modifier | Bearer |
| DELETE | `/api/modifiers/:modifierId` | Delete modifier | Bearer |
| GET | `/api/products/:productId/variations` | List variations | Public |
| POST | `/api/products/:productId/variations` | Add variation | Bearer |

### Search & Discovery

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/search` | Search products/restaurants | Public |
| GET | `/api/recommendations` | Get recommendations | Bearer |
| GET | `/api/nearby` | Nearby restaurants | Public |
| GET | `/api/popular` | Popular items | Public |
| GET | `/api/deals` | Current deals | Public |

### Inventory

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/products/:productId/availability` | Check availability | Public |
| PUT | `/api/products/:productId/stock` | Update stock | Bearer |
| POST | `/api/inventory/bulk-update` | Bulk stock update | Bearer |

### Internal Operations

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/internal/products/:productId` | Get product (internal) | X-Internal-Token |
| GET | `/internal/restaurants/:restaurantId` | Get restaurant (internal) | X-Internal-Token |
| POST | `/internal/products/bulk` | Bulk product operations | X-Internal-Token |

### Admin

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/admin/catalog/stats` | Catalog statistics | X-Internal-Token |
| POST | `/admin/catalog/reindex` | Reindex catalog | X-Internal-Token |
| GET | `/admin/catalog/audit` | Audit log | X-Internal-Token |

---

## Database Collections

| Collection | Purpose |
|------------|---------|
| `restaurants` | Restaurant/store profiles |
| `categories` | Product categories |
| `products` | Product/item definitions |
| `modifiers` | Item modifiers (add-ons) |
| `variations` | Product variations (size, etc.) |
| `deals` | Active deals and offers |
| `reviews` | Product reviews |
| `inventory` | Stock levels |
| `tags` | Search tags |

---

## Dependencies

| Service | Purpose | URL Config |
|---------|---------|------------|
| MongoDB | Catalog data storage | `MONGODB_URI` |
| Redis | BullMQ, caching | `REDIS_URL` |
| BullMQ | Async catalog operations | Built-in |
| Order Service | Menu ordering | Via HTTP |
| Inventory Service | Stock levels | Via HTTP |
| Auth Service | JWT verification | Via HTTP |

---

## Dependents (Services that call this service)

| Service | Usage |
|---------|-------|
| Consumer App | Browse menus, search |
| Merchant App | Manage catalog |
| Order Service | Menu data during checkout |
| Search Service | Search indexing |
| Recommendation Service | Product recommendations |

---

## Environment Variables

```env
# Core
NODE_ENV=production
PORT=3005
SERVICE_NAME=rez-catalog-service

# Database
MONGODB_URI=mongodb://localhost:27017/rez-catalog
MONGODB_QUERY_TIMEOUT_MS=30000

# Cache
REDIS_URL=redis://localhost:6379
REDIS_TLS=false

# Internal Auth (REQUIRED)
INTERNAL_SERVICE_TOKENS_JSON={"catalog-service": "<token>"}

# CORS
CORS_ORIGIN=https://rez.money,https://admin.rez.money,https://merchant.rez.money

# Observability
SENTRY_DSN=<dsn>
```

---

## Catalog Data Model

```typescript
interface Restaurant {
  _id: ObjectId;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  coverImage?: string;
  address: Address;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  contact: {
    phone: string;
    email?: string;
  };
  operatingHours: OperatingHours[];
  cuisines: string[];
  rating?: number;
  reviewCount: number;
  isActive: boolean;
  merchantId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface Category {
  _id: ObjectId;
  restaurantId: ObjectId;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

interface Product {
  _id: ObjectId;
  restaurantId: ObjectId;
  categoryId?: ObjectId;
  name: string;
  description: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  currency: string;
  unit: string;
  tags: string[];
  modifiers: Modifier[];
  variations: Variation[];
  dietary: string[];
  allergens: string[];
  calories?: number;
  preparationTime: number;
  isAvailable: boolean;
  isFeatured: boolean;
  stock: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface Modifier {
  _id: ObjectId;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  options: ModifierOption[];
}

interface ModifierOption {
  name: string;
  price: number;
  isDefault: boolean;
}

interface Variation {
  _id: ObjectId;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  attributes: Record<string, string>;
}

interface Deal {
  _id: ObjectId;
  restaurantId: ObjectId;
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y' | 'free_delivery';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  applicableProducts?: ObjectId[];
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
}
```

---

## Search & Discovery Features

### Search

- Full-text search on product names and descriptions
- Filters: cuisine, price range, dietary, rating
- Sorting: relevance, price, rating, distance

### Recommendations

- Based on order history
- Popular items
- Similar products
- Personalized suggestions

### Geolocation

- Nearby restaurants
- Delivery radius check
- Estimated delivery time

---

## Business Logic

### Product Availability

1. Check `isAvailable` flag
2. Verify stock level > 0
3. Validate restaurant operating hours
4. Return availability status

### Pricing

1. Base price from product
2. Add modifier prices
3. Apply variation price
4. Apply active deals
5. Calculate final total

### Stock Management

1. Reserve stock on order creation
2. Deduct on order confirmation
3. Release on order cancellation
4. Sync with Inventory Service

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Product read | 200 requests / minute |
| Product write | 20 requests / 5 minutes |
| Search | 50 requests / minute |

---

## Health Check Response

```json
{
  "status": "ok",
  "service": "rez-catalog-service",
  "uptime": 12345,
  "timestamp": "2026-05-10T12:00:00.000Z"
}
```

---

## Security Features

- [x] JWT authentication for write operations
- [x] Internal service token auth
- [x] Rate limiting
- [x] CORS whitelist
- [x] MongoDB injection prevention
- [x] Input validation
- [x] Authorization per restaurant

---

## CQRS Pattern

The service implements CQRS:

- **Commands**: Product CRUD, stock updates via BullMQ
- **Queries**: Optimized read queries with indexes
- **Caching**: Redis for popular products

---

## Strangler Fig Pattern

Extracted from monolith using Strangler Fig pattern.

---

## Deployment

| Environment | Platform | Auto-restart |
|-------------|----------|--------------|
| Production | Render | Yes |
| Staging | Render | Yes |
| Development | Local | Manual |

---

## Related Documentation

- [API Reference](../API_REFERENCE.md)
