# Inventory Management Documentation

## Overview

The ReZ platform's inventory management system handles product catalogs for retail merchants, restaurants, and service providers. The system manages menu items, product categories, dietary information, pricing, and stock availability through QR-based storefronts.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INVENTORY SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     QR SDK - Menu Module                            │   │
│   │                                                                      │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│   │  │   Menu     │  │   Item     │  │  Dietary   │                │   │
│   │  │  Manager   │  │  Catalog   │  │  Filters   │                │   │
│   │  └──────┬─────┘  └──────┬─────┘  └─────────────┘                │   │
│   │         │               │                                         │   │
│   │  ┌──────┴───────────────┴──────┐                                  │   │
│   │  │     Search & Recommendations │                                  │   │
│   │  └──────────────────────────────┘                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Store Profile Manager                            │   │
│   │                                                                      │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│   │  │   Store    │  │   Links    │  │   Reviews  │                │   │
│   │  │  Profile   │  │  Manager   │  │  Manager   │                │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Models

### Menu

```typescript
interface Menu {
  storeId: string;
  categories: MenuCategory[];
  items: MenuItem[];
  lastUpdated: string;
  version: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  itemCount: number;
}
```

### Menu Item

```typescript
interface MenuItem {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  images?: string[];
  dietary: DietaryTag[];
  allergens: string[];
  modifiers: ItemModifier[];
  availability: Availability;
  preparationTime?: number;
  calories?: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface DietaryTag {
  code: string;
  label: string;
  icon?: string;
}

interface ItemModifier {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: ModifierOption[];
  maxSelections?: number;
}

interface ModifierOption {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
  isAvailable: boolean;
}

interface Availability {
  type: 'always' | 'scheduled' | 'stock';
  stock?: number;
  availableFrom?: string;
  availableUntil?: string;
  daysOfWeek?: number[];
}
```

### Dietary Filters

| Filter Code | Label | Description |
|-------------|-------|-------------|
| `vegetarian` | Vegetarian | No meat or fish |
| `vegan` | Vegan | No animal products |
| `gluten_free` | Gluten-Free | No gluten ingredients |
| `dairy_free` | Dairy-Free | No dairy products |
| `nut_free` | Nut-Free | No nuts or derivatives |
| `halal` | Halal | Certified halal |
| `kosher` | Kosher | Certified kosher |
| `organic` | Organic | Certified organic |
| `spicy` | Spicy | Contains chili/spice |

## Menu Module API

**Location:** `/packages/rez-qr-sdk/src/modules/menu.ts`

### Get Full Menu

```typescript
async getMenu(storeId: string): Promise<Menu>
```

**Example:**
```typescript
const menu = await sdk.menu.getMenu('store_123');
console.log(menu.categories); // All categories with items
```

### Get Categories

```typescript
async getCategories(storeId: string): Promise<MenuCategory[]>
```

**Response:**
```typescript
[
  {
    id: 'cat_1',
    name: 'Appetizers',
    description: 'Start your meal right',
    sortOrder: 1,
    isActive: true,
    itemCount: 8
  },
  {
    id: 'cat_2',
    name: 'Main Course',
    description: 'Hearty entrees',
    sortOrder: 2,
    isActive: true,
    itemCount: 12
  }
]
```

### Get Items by Category

```typescript
async getItemsByCategory(storeId: string, categoryId: string): Promise<MenuItem[]>
```

### Filter by Dietary Preference

```typescript
filterByDietary(items: MenuItem[], filters: DietaryFilters): MenuItem[]
```

**Types:**
```typescript
interface DietaryFilters {
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  nutFree?: boolean;
  halal?: boolean;
  kosher?: boolean;
  custom?: string[];
}
```

**Example:**
```typescript
const vegetarianItems = sdk.menu.filterByDietary(menu.items, {
  vegetarian: true,
  glutenFree: true
});
```

### Search Menu Items

```typescript
async searchItems(storeId: string, query: string): Promise<MenuItem[]>
```

**Example:**
```typescript
const results = await sdk.menu.searchItems('store_123', 'chicken curry');
```

### Get Recommendations

```typescript
async getRecommendations(storeId: string, orderId?: string): Promise<MenuItem[]>
```

Returns AI-powered item recommendations based on:
- Current order context
- Popular items
- User preferences
- Time of day
- Seasonal items

### Get Popular Items

```typescript
async getPopularItems(storeId: string): Promise<MenuItem[]>
```

Returns top-selling items for the store.

## Store Module API

**Location:** `/packages/rez-qr-sdk/src/modules/store.ts`

### Store Profile

```typescript
interface StoreProfile {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  address: Address;
  contact: ContactInfo;
  hours: OperatingHours;
  links: StoreLink[];
  categories: string[];
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  minimumOrder?: number;
  deliveryInfo?: DeliveryInfo;
}

interface StoreLink {
  id: string;
  type: LinkType;
  title: string;
  url: string;
  icon?: string;
  order: number;
  analytics: LinkAnalytics;
}

type LinkType = 'menu' | 'order' | 'reservation' | 'social' | 'custom';
```

### Get Nearby Stores

```typescript
async getNearby(latitude: number, longitude: number, radius?: number): Promise<StoreProfile[]>
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| latitude | number | required | Latitude coordinate |
| longitude | number | required | Longitude coordinate |
| radius | number | 5000 | Search radius in meters |

**Example:**
```typescript
const nearby = await sdk.store.getNearby(40.7128, -74.0060, 3000);
```

### Search Stores

```typescript
async search(
  query: string,
  params?: {
    category?: string;
    city?: string;
    limit?: number;
  }
): Promise<StoreProfile[]>
```

## Inventory Operations

### Cart Management

```typescript
interface CartItem {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  modifiers?: {
    name: string;
    price: number;
  }[];
}
```

**Cart Operations:**
```typescript
// Add item
await sdk.menu.addToCart(storeId, itemId, quantity, modifiers);

// Get cart
const cart = await sdk.menu.getCart(cartId);

// Update quantity
await sdk.menu.updateCartItem(cartId, itemId, newQuantity);

// Remove item
await sdk.menu.removeFromCart(cartId, itemId);
```

### Order Management

```typescript
interface OrderDetails {
  id: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  taxes: number;
  discounts: number;
  total: number;
  tableNumber?: string;
  estimatedReadyTime?: string;
  createdAt: string;
  updatedAt: string;
}

type OrderStatus =
  | 'pending'      // Order submitted
  | 'confirmed'   // Merchant confirmed
  | 'preparing'    // Being prepared
  | 'ready'        // Ready for pickup/delivery
  | 'served'       // Served to customer
  | 'completed'    // Transaction complete
  | 'cancelled';  // Order cancelled
```

**Order Operations:**
```typescript
// Place order
const order = await sdk.menu.placeOrder(storeId, cartId, {
  tableNumber: '5',
  notes: 'Birthday celebration',
  priority: { level: 'rush' }
});

// Get order status
const status = await sdk.menu.getOrder(orderId);
```

## Availability Management

### Stock Tracking

```typescript
interface Availability {
  type: 'always' | 'scheduled' | 'stock';
  stock?: number;
  availableFrom?: string;
  availableUntil?: string;
  daysOfWeek?: number[]; // 0 = Sunday, 6 = Saturday
}
```

**Stock Status Flow:**
```
In Stock (>10) → Low Stock (≤10) → Out of Stock (0)
```

### Scheduled Availability

```typescript
// Example: Available only during dinner hours
{
  type: 'scheduled',
  availableFrom: '18:00',
  availableUntil: '22:00',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
}

// Example: Weekend only brunch
{
  type: 'scheduled',
  availableFrom: '10:00',
  availableUntil: '15:00',
  daysOfWeek: [0, 6] // Saturday, Sunday
}
```

## Product Recommendations

### Recommendation Engine

The system provides AI-powered recommendations:

```typescript
interface RecommendationContext {
  storeId: string;
  orderId?: string;
  userPreferences?: DietaryFilters;
  timeOfDay: 'breakfast' | 'lunch' | 'dinner' | 'late_night';
  currentItems?: string[];
}
```

**Recommendation Types:**

| Type | Description | Source |
|------|-------------|--------|
| Complementary | Goes well with current order | AI analysis |
| Popular | Top selling items | Sales data |
| Seasonal | Currently in season | Configuration |
| Personal | Based on user history | ML model |
| Trending | Recently popular | Real-time analytics |

### Recommendation Response

```typescript
interface RecommendationsResponse {
  items: MenuItem[];
  reason: string;
  score: number;
  type: 'complementary' | 'popular' | 'seasonal' | 'personal' | 'trending';
}
```

## Analytics

### Menu Analytics

```typescript
interface MenuAnalytics {
  totalViews: number;
  uniqueViews: number;
  topItems: {
    itemId: string;
    name: string;
    orderCount: number;
    revenue: number;
  }[];
  categoryPerformance: {
    categoryId: string;
    name: string;
    itemCount: number;
    totalOrders: number;
    averageOrderValue: number;
  }[];
  searchTerms: {
    term: string;
    count: number;
    results: number;
  }[];
}
```

### Track Menu Views

```typescript
await sdk.store.trackEvent(storeId, {
  type: 'menu_view',
  timestamp: new Date().toISOString(),
  metadata: {
    source: 'qr_scan',
    device: 'mobile'
  }
});
```

## Integration with Other Services

### With BNPL Service

Inventory determines purchase eligibility:
1. Item availability checked
2. Cart total calculated
3. BNPL eligibility determined
4. EMI schedule generated

### With Loyalty Service

Points calculated based on:
1. Item price
2. Karma multiplier
3. Active offers

### With Delivery Service

Stock updated on delivery confirmation:
1. Order placed
2. Stock reserved
3. Delivery completed
4. Stock decremented

## Best Practices

### Menu Organization
- Keep categories under 10 items
- Use descriptive names (< 50 chars)
- Include high-quality images
- Set appropriate sort order

### Dietary Information
- Always mark vegetarian/vegan items
- List all allergens
- Update availability in real-time
- Use standard dietary codes

### Inventory Updates
- Sync stock levels every 15 minutes
- Set low stock alerts at threshold
- Mark unavailable items as inactive
- Use scheduled availability for limited items

---

*Last Updated: 2026-05-10*
