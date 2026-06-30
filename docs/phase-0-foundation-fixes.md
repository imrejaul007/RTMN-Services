# Phase 0: Foundation Fixes
> **Duration:** Weeks 1-4
> **Purpose:** Wire existing services to RTMN Hub, fix fragmentation
> **Depends on:** Nothing (can start immediately)

---

## Overview

Phase 0 fixes the foundation. Currently:
- RABTUL services exist but aren't wired to Hub
- CommerceOS services exist but aren't wired to Hub
- Discovery/ACP services exist but aren't wired to Hub
- No unified service registry

**Goal:** Make all services discoverable through RTMN Hub.

---

## RTMN Hub Current State

```
services/rtmn-unified-hub/
├── routes/
│   ├── index.js (route registry)
│   ├── genie.js (14 Genie services) ✅
│   ├── foundation.js (Memory, Twin, CorpID) ✅
│   ├── industry-os.js (26 Industry OS) ✅
│   ├── department-os.js (8 Department OS) ✅
│   ├── nexha.js (Federation services) ⚠️ PARTIAL
│   ├── sutar.js (SUTAR services) ⚠️ PARTIAL
│   └── rez.js (REZ services) ⚠️ PARTIAL
│
└── src/
    └── proxy.js (request forwarding)
```

---

## Week 1: Wire RABTUL to Hub

### Services to Wire

| Service | Port | Routes to Add |
|--------|------|---------------|
| REZ-wallet-service | 4004 | `/api/wallet/*` |
| REZ-payment-service | 4001 | `/api/payment/*` |
| REZ-escrow-service | 4051 | `/api/escrow/*` |
| rabtul-trust-engine | 4180 | `/api/trust/*`, `/api/trust/score/*` |
| REZ-treasury-os | 4055 | `/api/treasury/*` |
| REZ-bnpl-service | 4052 | `/api/bnpl/*` |
| REZ-capital-service | 4053 | `/api/capital/*` |

### Implementation

```javascript
// services/rtmn-unified-hub/routes/rabtul.js

const express = require('express');
const router = express.Router();

// Wallet routes
router.use('/wallet/*', proxyTo('http://localhost:4004'));

// Payment routes
router.use('/payment/*', proxyTo('http://localhost:4001'));

// Escrow routes
router.use('/escrow/*', proxyTo('http://localhost:4051'));

// Trust routes
router.use('/trust/*', proxyTo('http://localhost:4180'));

// Treasury routes
router.use('/treasury/*', proxyTo('http://localhost:4055'));

// BNPL routes
router.use('/bnpl/*', proxyTo('http://localhost:4052'));

// Capital/Trade Finance routes
router.use('/capital/*', proxyTo('http://localhost:4053'));

module.exports = router;
```

### Update Hub Index

```javascript
// services/rtmn-unified-hub/routes/index.js

const rabtul = require('./rabtul');

router.use('/api/rabtul', rabtul);
router.use('/api/wallet', rabtul);
router.use('/api/payment', rabtul);
router.use('/api/escrow', rabtul);
router.use('/api/trust', rabtul);
router.use('/api/treasury', rabtul);
router.use('/api/bnpl', rabtul);
router.use('/api/capital', rabtul);
```

### API Endpoints Added

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/wallet/balance/:id` | GET | Get wallet balance |
| `/api/wallet/transactions/:id` | GET | Get transactions |
| `/api/payment/initiate` | POST | Initiate payment |
| `/api/payment/verify` | POST | Verify payment |
| `/api/escrow/create` | POST | Create escrow |
| `/api/escrow/release/:id` | POST | Release escrow |
| `/api/trust/score/:entityId` | GET | Get trust score |
| `/api/trust/verify/:entityId` | POST | Verify trust |
| `/api/treasury/forecast` | GET | Cash forecast |
| `/api/bnpl/checkout` | POST | BNPL checkout |
| `/api/capital/apply` | POST | Apply for capital |

### Tests

```bash
# Test wallet
curl http://localhost:4399/api/wallet/balance/user123

# Test payment
curl -X POST http://localhost:4399/api/payment/initiate \
  -H 'Content-Type: application/json' \
  -d '{"amount": 1000, "currency": "INR"}'

# Test trust score
curl http://localhost:4399/api/trust/score/vendor456

# Test escrow
curl -X POST http://localhost:4399/api/escrow/create \
  -H 'Content-Type: application/json' \
  -d '{"amount": 50000, "buyer": "user1", "seller": "vendor1"}'
```

---

## Week 2: Wire CommerceOS to Hub

### Services to Wire

| Service | Port | Routes to Add |
|--------|------|---------------|
| product-catalog | 5476 | `/api/catalog/*`, `/api/products/*` |
| cart-service | 5477 | `/api/cart/*` |
| checkout-service | 5478 | `/api/checkout/*`, `/api/orders/*` |
| payment-gateway | 5479 | `/api/gateway/*` |
| loyalty-connector | 5481 | `/api/loyalty/*` |
| subscription-billing | 5494 | `/api/subscription/*` |
| review-collection | 5480 | `/api/reviews/*` |

### Implementation

```javascript
// services/rtmn-unified-hub/routes/commerce.js

const express = require('express');
const router = express.Router();

// Catalog routes
router.use('/catalog/*', proxyTo('http://localhost:5476'));
router.use('/products/*', proxyTo('http://localhost:5476'));

// Cart routes
router.use('/cart/*', proxyTo('http://localhost:5477'));

// Checkout/Order routes
router.use('/checkout/*', proxyTo('http://localhost:5478'));
router.use('/orders/*', proxyTo('http://localhost:5478'));

// Payment gateway routes
router.use('/gateway/*', proxyTo('http://localhost:5479'));

// Loyalty routes
router.use('/loyalty/*', proxyTo('http://localhost:5481'));

// Subscription routes
router.use('/subscription/*', proxyTo('http://localhost:5494'));

// Review routes
router.use('/reviews/*', proxyTo('http://localhost:5480'));

module.exports = router;
```

### API Endpoints Added

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/catalog/products` | GET | List products |
| `/api/catalog/products/:id` | GET | Get product |
| `/api/cart/add` | POST | Add to cart |
| `/api/cart/:userId` | GET | Get cart |
| `/api/checkout/initiate` | POST | Start checkout |
| `/api/orders` | GET | List orders |
| `/api/orders/:id` | GET | Get order |
| `/api/loyalty/points/:userId` | GET | Get loyalty points |
| `/api/reviews/product/:id` | GET | Get product reviews |
| `/api/subscription/plans` | GET | List subscription plans |

---

## Week 3: Wire Discovery + ACP to Hub

### Services to Wire

| Service | Port | Routes to Add |
|--------|------|---------------|
| nexha-discovery-os | 4272 | `/api/discovery/*`, `/api/search/*` |
| nexha-capability-os | 4270 | `/api/capability/*` |
| nexha-reputation-os | 4271 | `/api/reputation/*`, `/api/aci/*` |
| nexha-acp-messaging | 4340 | `/api/acp/*`, `/api/negotiate/*` |
| sutar-negotiation-engine | 4293 | `/api/negotiation/*` |
| sutar-contract-os | 4292 | `/api/contract/*` |

### Implementation

```javascript
// services/rtmn-unified-hub/routes/federation.js

const express = require('express');
const router = express.Router();

// Discovery routes
router.use('/discovery/*', proxyTo('http://localhost:4272'));
router.use('/search/*', proxyTo('http://localhost:4272'));

// Capability routes
router.use('/capability/*', proxyTo('http://localhost:4270'));

// Reputation/ACI routes
router.use('/reputation/*', proxyTo('http://localhost:4271'));
router.use('/aci/*', proxyTo('http://localhost:4271'));

// ACP negotiation routes
router.use('/acp/*', proxyTo('http://localhost:4340'));
router.use('/negotiate/*', proxyTo('http://localhost:4340'));

// SUTAR negotiation routes
router.use('/negotiation/*', proxyTo('http://localhost:4293'));

// Contract routes
router.use('/contract/*', proxyTo('http://localhost:4292'));

module.exports = router;
```

### API Endpoints Added

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/discovery/search` | POST | Search capabilities |
| `/api/discovery/match` | POST | Match buyer to seller |
| `/api/capability/register` | POST | Register capability |
| `/api/capability/:id` | GET | Get capability |
| `/api/reputation/:entityId` | GET | Get reputation/ACI |
| `/api/reputation/update` | POST | Update reputation |
| `/api/acp/negotiations` | GET/POST | ACP negotiations |
| `/api/acp/negotiations/:id/messages` | GET/POST | ACP messages |
| `/api/negotiation/start` | POST | Start negotiation |
| `/api/contract/create` | POST | Create contract |
| `/api/contract/:id` | GET | Get contract |

---

## Week 4: Wire Industry + Company + Unified Registry

### Services to Wire

| Service | Port | Routes to Add |
|--------|------|---------------|
| All 26 Industry OS | 4751-5240 | `/api/industry/:name/*` |
| company-os | 4010 | `/api/company/*` |
| company-factory | TBD | `/api/factory/*` |
| sutar-gateway | 4140 | `/api/sutar/*` |

### Unified Service Registry

```javascript
// services/rtmn-unified-hub/src/registry.js

const serviceRegistry = {
  // Foundation
  'corpid': { url: 'http://localhost:4702', type: 'foundation' },
  'memory-os': { url: 'http://localhost:4703', type: 'foundation' },
  'twinos-hub': { url: 'http://localhost:4705', type: 'foundation' },
  
  // RABTUL
  'wallet': { url: 'http://localhost:4004', type: 'rabtul' },
  'payment': { url: 'http://localhost:4001', type: 'rabtul' },
  'trust': { url: 'http://localhost:4180', type: 'rabtul' },
  'treasury': { url: 'http://localhost:4055', type: 'rabtul' },
  'escrow': { url: 'http://localhost:4051', type: 'rabtul' },
  
  // Commerce
  'catalog': { url: 'http://localhost:5476', type: 'commerce' },
  'cart': { url: 'http://localhost:5477', type: 'commerce' },
  'checkout': { url: 'http://localhost:5478', type: 'commerce' },
  'loyalty': { url: 'http://localhost:5481', type: 'commerce' },
  
  // Federation
  'discovery': { url: 'http://localhost:4272', type: 'federation' },
  'capability': { url: 'http://localhost:4270', type: 'federation' },
  'reputation': { url: 'http://localhost:4271', type: 'federation' },
  'acp': { url: 'http://localhost:4340', type: 'federation' },
  
  // Company
  'company-os': { url: 'http://localhost:4010', type: 'company' },
  'sutar-gateway': { url: 'http://localhost:4140', type: 'sutar' },
  
  // Industry OS (dynamic)
  'restaurant-os': { url: 'http://localhost:5010', type: 'industry' },
  'hotel-os': { url: 'http://localhost:5025', type: 'industry' },
  'healthcare-os': { url: 'http://localhost:5020', type: 'industry' },
  // ... all 26
};

module.exports = serviceRegistry;
```

### Hub Health Endpoint

```javascript
// services/rtmn-unified-hub/src/health.js

router.get('/api/health', async (req, res) => {
  const services = Object.keys(serviceRegistry);
  const results = await Promise.all(
    services.map(async (name) => {
      try {
        const service = serviceRegistry[name];
        const response = await fetch(`${service.url}/health`);
        return { name, status: 'up', type: service.type };
      } catch {
        return { name, status: 'down', type: service.type };
      }
    })
  );
  
  const healthy = results.filter(r => r.status === 'up').length;
  res.json({
    hub: 'up',
    services: results,
    summary: {
      total: services.length,
      healthy,
      unhealthy: services.length - healthy
    }
  });
});
```

---

## Testing Checklist

### Week 1: RABTUL Tests
- [ ] `curl http://localhost:4399/api/wallet/balance/test`
- [ ] `curl -X POST http://localhost:4399/api/payment/initiate`
- [ ] `curl http://localhost:4399/api/trust/score/test`
- [ ] `curl http://localhost:4399/api/treasury/forecast`

### Week 2: Commerce Tests
- [ ] `curl http://localhost:4399/api/catalog/products`
- [ ] `curl -X POST http://localhost:4399/api/cart/add`
- [ ] `curl http://localhost:4399/api/orders`
- [ ] `curl http://localhost:4399/api/loyalty/points/test`

### Week 3: Federation Tests
- [ ] `curl -X POST http://localhost:4399/api/discovery/search`
- [ ] `curl http://localhost:4399/api/capability/test`
- [ ] `curl http://localhost:4399/api/reputation/test`
- [ ] `curl -X POST http://localhost:4399/api/acp/negotiations`

### Week 4: Integration Tests
- [ ] `curl http://localhost:4399/api/health`
- [ ] `curl http://localhost:4399/api/services`
- [ ] Industry OS endpoints

---

## Deliverables

| Deliverable | Week | Status |
|------------|------|--------|
| RABTUL routes wired | 1 | ⏳ |
| Commerce routes wired | 2 | ⏳ |
| Federation routes wired | 3 | ⏳ |
| Industry + Company wired | 4 | ⏳ |
| Unified service registry | 4 | ⏳ |
| Hub health endpoint | 4 | ⏳ |
| All tests passing | 4 | ⏳ |

---

## Documentation Files

- [phase-0-rabtul-routes.md](phase-0-rabtul-routes.md) — RABTUL API reference
- [phase-0-commerce-routes.md](phase-0-commerce-routes.md) — Commerce API reference
- [phase-0-federation-routes.md](phase-0-federation-routes.md) — Federation API reference
- [phase-0-service-registry.md](phase-0-service-registry.md) — Service registry

---

## Next Steps

After Phase 0:
- **Phase 1:** Build Unified CommerceOS (merge fragmented services)
- All services will be wired and discoverable through Hub

---

*Phase 0 Status: Ready to start*
*Estimated Completion: Week 4*
