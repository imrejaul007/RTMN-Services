# Phase 1: Unified CommerceOS
> **Duration:** Weeks 5-12
> **Purpose:** Merge fragmented commerce services into one unified CommerceOS
> **Depends on:** Phase 0 completion

---

## Overview

Currently, commerce is fragmented:

| Location | Services | Status |
|----------|----------|--------|
| SiteOS Commerce | 19 services | ✅ Built but isolated |
| Nexha Commerce | 5 services | ⚠️ Basic scaffolds |
| Commerce Twins | 9 twins | ⚠️ Not connected |

**Goal:** Create one unified CommerceOS that merges all commerce capabilities.

---

## Target Architecture

```
COMMERCEOS (Unified)
│
├── Gateway (port TBD)
│   ├── API entry point
│   ├── Service discovery
│   ├── Load balancing
│   └── Rate limiting
│
├── Catalog Engine
│   ├── Product management
│   ├── Categories
│   ├── Search
│   ├── Universal Product ID
│   └── Variants
│
├── Inventory Engine
│   ├── Stock tracking
│   ├── Multi-location
│   ├── Reorder triggers
│   └── Low stock alerts
│
├── Order Engine
│   ├── Order capture
│   ├── Status tracking
│   ├── Cancellation
│   └── Returns
│
├── Checkout Engine
│   ├── Cart
│   ├── Address
│   ├── Shipping
│   └── Payment routing
│
├── Pricing Engine
│   ├── Base pricing
│   ├── Dynamic pricing
│   ├── Volume discounts
│   └── Competitor matching
│
├── Promotion Engine
│   ├── Discounts
│   ├── Coupons
│   ├── Bundles
│   └── Flash sales
│
├── Loyalty Engine
│   ├── Points
│   ├── Tiers
│   ├── Rewards
│   └── Referrals
│
├── Recommendation Engine
│   ├── Personalization
│   ├── Cross-sell
│   ├── Up-sell
│   └── Demand forecasting
│
└── Subscription Engine
    ├── Recurring billing
    ├── Plans
    ├── Usage tracking
    └── Renewals
```

---

## Directory Structure

```bash
companies/HOJAI-AI/platform/commerce-os/
│
├── commerce-os-gateway/          # Unified gateway
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── catalog.js
│   │   │   ├── inventory.js
│   │   │   ├── order.js
│   │   │   ├── checkout.js
│   │   │   ├── pricing.js
│   │   │   ├── promotion.js
│   │   │   ├── loyalty.js
│   │   │   ├── recommendation.js
│   │   │   └── subscription.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── rateLimit.js
│   │   │   └── logging.js
│   │   └── services/
│   │       └── integration/
│   │           ├── siteos-bridge.js      # Connect to SiteOS
│   │           ├── nexha-bridge.js       # Connect to Nexha
│   │           └── twins-bridge.js       # Connect to Twins
│   └── tests/
│
├── catalog-engine/               # Catalog service
│   └── ...
│
├── inventory-engine/             # Inventory service
│   └── ...
│
├── order-engine/                 # Order service
│   └── ...
│
├── checkout-engine/              # Checkout service
│   └── ...
│
├── pricing-engine/               # Pricing service
│   └── ...
│
├── promotion-engine/             # Promotion service
│   └── ...
│
├── loyalty-engine/               # Loyalty service
│   └── ...
│
├── recommendation-engine/        # Recommendation service
│   └── ...
│
├── subscription-engine/          # Subscription service
│   └── ...
│
├── product-graph/                # Universal Product ID
│   └── ...
│
└── shared/
    ├── models/
    ├── utils/
    └── constants/
```

---

## Week 5-6: CommerceOS Gateway

### Gateway Specification

```javascript
// commerce-os-gateway/src/index.js

const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));
app.use(authenticate);

// Routes
app.use('/catalog', require('./routes/catalog'));
app.use('/inventory', require('./routes/inventory'));
app.use('/order', require('./routes/order'));
app.use('/checkout', require('./routes/checkout'));
app.use('/pricing', require('./routes/pricing'));
app.use('/promotion', require('./routes/promotion'));
app.use('/loyalty', require('./routes/loyalty'));
app.use('/recommendation', require('./routes/recommendation'));
app.use('/subscription', require('./routes/subscription'));

// Health
app.get('/health', (req, res) => {
  res.json({ 
    service: 'commerce-os',
    version: '1.0.0',
    status: 'healthy',
    modules: ['catalog', 'inventory', 'order', 'checkout', 'pricing', 'promotion', 'loyalty', 'recommendation', 'subscription']
  });
});

module.exports = app;
```

### Service Discovery

```javascript
// commerce-os-gateway/src/services/registry.js

const services = {
  // SiteOS services
  'siteos-catalog': { url: 'http://localhost:5476', healthy: false },
  'siteos-cart': { url: 'http://localhost:5477', healthy: false },
  'siteos-checkout': { url: 'http://localhost:5478', healthy: false },
  'siteos-payment': { url: 'http://localhost:5479', healthy: false },
  'siteos-loyalty': { url: 'http://localhost:5481', healthy: false },
  
  // Nexha services
  'nexha-catalog': { url: 'http://localhost:4370', healthy: false },
  'nexha-order': { url: 'http://localhost:4371', healthy: false },
  'nexha-inventory': { url: 'http://localhost:4372', healthy: false },
  'nexha-pricing': { url: 'http://localhost:4373', healthy: false },
};

module.exports = services;
```

---

## Week 7-8: Catalog Engine

### Integration with Existing Services

```javascript
// catalog-engine/src/integrations/siteos-bridge.js

const siteosCatalog = require('./siteos-catalog-client');

class SiteOSCatalogBridge {
  async getProducts(query) {
    // Call SiteOS product-catalog:5476
    return await siteosCatalog.search(query);
  }
  
  async getProduct(id) {
    return await siteosCatalog.getById(id);
  }
  
  async createProduct(data) {
    return await siteosCatalog.create(data);
  }
  
  async updateProduct(id, data) {
    return await siteosCatalog.update(id, data);
  }
}

module.exports = new SiteOSCatalogBridge();
```

```javascript
// catalog-engine/src/integrations/nexha-bridge.js

const nexhaCatalog = require('./nexha-catalog-client');

class NexhaCatalogBridge {
  async getProducts(query) {
    // Call Nexha catalog-os:4370
    return await nexhaCatalog.search(query);
  }
  
  async syncProduct(productId) {
    // Sync with Nexha catalog
    return await nexhaCatalog.sync(productId);
  }
}

module.exports = new NexhaCatalogBridge();
```

### Unified Catalog API

```javascript
// catalog-engine/src/routes/index.js

router.get('/products', async (req, res) => {
  const { source, category, search, page, limit } = req.query;
  
  let products = [];
  
  // Merge results from all sources
  if (!source || source === 'all') {
    const [siteos, nexha] = await Promise.all([
      siteosBridge.getProducts({ category, search, page, limit }),
      nexhaBridge.getProducts({ category, search, page, limit })
    ]);
    products = mergeAndDeduplicate(siteos, nexha);
  } else if (source === 'siteos') {
    products = await siteosBridge.getProducts({ category, search, page, limit });
  } else if (source === 'nexha') {
    products = await nexhaBridge.getProducts({ category, search, page, limit });
  }
  
  res.json({ products, source });
});

router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { source } = req.query;
  
  // Try SiteOS first (has more data)
  try {
    const product = await siteosBridge.getProduct(id);
    res.json({ product, source: 'siteos' });
  } catch {
    // Fall back to Nexha
    const product = await nexhaBridge.getProduct(id);
    res.json({ product, source: 'nexha' });
  }
});
```

---

## Week 9-10: Inventory + Order Engines

### Inventory Engine

```javascript
// inventory-engine/src/index.js

const InventoryEngine = {
  // Stock management
  async getStock(productId, locationId) {
    // Aggregate from SiteOS + Nexha
    const [siteosStock, nexhaStock] = await Promise.all([
      siteosBridge.getStock(productId, locationId),
      nexhaBridge.getStock(productId, locationId)
    ]);
    
    return {
      total: siteosStock + nexhaStock,
      locations: {
        siteos: siteosStock,
        nexha: nexhaStock
      }
    };
  },
  
  // Low stock alerts
  async checkReorder(productId) {
    const stock = await this.getStock(productId);
    const threshold = await getReorderThreshold(productId);
    
    if (stock.total < threshold) {
      await triggerReorder(productId, stock.total, threshold);
    }
    
    return stock.total < threshold;
  },
  
  // Multi-location sync
  async transfer(productId, fromLocation, toLocation, quantity) {
    // Deduct from source
    await siteosBridge.updateStock(productId, fromLocation, -quantity);
    // Add to destination
    await nexhaBridge.updateStock(productId, toLocation, quantity);
  }
};
```

### Order Engine

```javascript
// order-engine/src/index.js

const OrderEngine = {
  // Create order
  async createOrder(orderData) {
    // Validate inventory
    for (const item of orderData.items) {
      const hasStock = await inventoryEngine.checkStock(item.productId, item.quantity);
      if (!hasStock) {
        throw new Error(`Insufficient stock for ${item.productId}`);
      }
    }
    
    // Create order
    const order = await siteosBridge.createOrder(orderData);
    
    // Reserve inventory
    for (const item of orderData.items) {
      await inventoryEngine.reserve(item.productId, item.quantity);
    }
    
    // Sync to Nexha for cross-marketplace visibility
    await nexhaBridge.createOrder(order);
    
    return order;
  },
  
  // Update order status
  async updateStatus(orderId, status) {
    await siteosBridge.updateOrderStatus(orderId, status);
    await nexhaBridge.updateOrderStatus(orderId, status);
    
    // Handle fulfillment
    if (status === 'delivered') {
      // Deduct reserved inventory
      const order = await this.getOrder(orderId);
      for (const item of order.items) {
        await inventoryEngine.confirmReservation(item.productId, item.quantity);
      }
    }
  }
};
```

---

## Week 11-12: Commerce Twins + Product Graph

### Commerce Twins Integration

```javascript
// shared/integrations/twins-bridge.js

const twinsBridge = {
  // Customer twin
  async updateCustomerTwin(customerId, data) {
    // Update customer behavior profile
    await twinOS.update('commerce.customer', customerId, {
      ...data,
      lastPurchase: new Date(),
      preferences: data.preferences
    });
  },
  
  // Order twin
  async createOrderTwin(orderId, data) {
    await twinOS.create('commerce.order', orderId, {
      ...data,
      status: 'created',
      timeline: [{ status: 'created', timestamp: Date.now() }]
    });
  },
  
  // Product twin
  async updateProductTwin(productId, data) {
    await twinOS.update('commerce.product', productId, {
      ...data,
      lastUpdated: new Date()
    });
  },
  
  // Inventory twin
  async updateInventoryTwin(productId, locationId, quantity) {
    await twinOS.update('commerce.inventory', `${productId}:${locationId}`, {
      quantity,
      lastUpdated: new Date()
    });
  }
};
```

### Universal Product ID System

```javascript
// product-graph/src/index.js

const ProductGraph = {
  // Generate Universal Product ID
  generateUPID(product) {
    const hash = crypto
      .createHash('sha256')
      .update(`${product.brand}|${product.name}|${product.category}|${JSON.stringify(product.specs)}`)
      .digest('hex')
      .substring(0, 12)
      .toUpperCase();
    
    return `NX-${hash}`;
  },
  
  // Link products across marketplaces
  async linkProducts(canonicalId, marketplaceIds) {
    // Store mapping in product graph
    await this.saveMapping(canonicalId, marketplaceIds);
    
    // Create relationships
    for (const mpId of marketplaceIds) {
      await twinOS.link('commerce.product', canonicalId, 'listed_on', mpId);
    }
  },
  
  // Get all marketplace listings for a product
  async getListings(canonicalId) {
    const mapping = await this.getMapping(canonicalId);
    return mapping.marketplaceIds.map(mpId => ({
      marketplace: mpId.marketplace,
      listing: mpId.listing,
      price: mpId.price,
      inventory: mpId.inventory
    }));
  },
  
  // Sync price across marketplaces
  async syncPrice(canonicalId, price) {
    const listings = await this.getListings(canonicalId);
    
    for (const listing of listings) {
      await updateMarketplacePrice(listing.marketplace, listing.id, price);
    }
  }
};
```

---

## API Reference

### Catalog Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/catalog/products` | GET | List all products |
| `/catalog/products/:id` | GET | Get product |
| `/catalog/products` | POST | Create product |
| `/catalog/products/:id` | PUT | Update product |
| `/catalog/products/:id` | DELETE | Delete product |
| `/catalog/categories` | GET | List categories |
| `/catalog/search` | POST | Search products |
| `/catalog/upid/:id` | GET | Get Universal Product ID |

### Inventory Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/inventory/stock/:productId` | GET | Get stock levels |
| `/inventory/stock/:productId/:locationId` | GET | Get stock at location |
| `/inventory/reorder/:productId` | POST | Trigger reorder |
| `/inventory/transfer` | POST | Transfer between locations |

### Order Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/order` | POST | Create order |
| `/order/:id` | GET | Get order |
| `/order/:id/status` | PUT | Update status |
| `/order/:id/cancel` | POST | Cancel order |
| `/order/:id/return` | POST | Initiate return |

### Checkout Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/checkout/initiate` | POST | Start checkout |
| `/checkout/:sessionId/cart` | PUT | Update cart |
| `/checkout/:sessionId/address` | PUT | Set address |
| `/checkout/:sessionId/payment` | POST | Process payment |
| `/checkout/:sessionId/confirm` | POST | Confirm order |

---

## Testing

```bash
# Test catalog
curl http://localhost:4399/api/catalog/products
curl http://localhost:4399/api/catalog/search -X POST -d '{"query": "phone"}'

# Test inventory
curl http://localhost:4399/api/inventory/stock/PROD001
curl -X POST http://localhost:4399/api/inventory/reorder -d '{"productId": "PROD001"}'

# Test order
curl -X POST http://localhost:4399/api/order -d '{"items": [{"productId": "PROD001", "quantity": 2}]}'
```

---

## Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| CommerceOS Gateway | 6 | ⏳ |
| Catalog Engine (merged) | 8 | ⏳ |
| Inventory Engine (merged) | 8 | ⏳ |
| Order Engine (merged) | 8 | ⏳ |
| Checkout Engine (merged) | 8 | ⏳ |
| Commerce Twins wired | 12 | ⏳ |
| Universal Product ID | 12 | ⏳ |

---

## Next Steps

After Phase 1:
- **Phase 2:** Build Real BAM Workers
- All commerce services unified and discoverable

---

*Phase 1 Status: Ready to start after Phase 0*
*Estimated Completion: Week 12*
