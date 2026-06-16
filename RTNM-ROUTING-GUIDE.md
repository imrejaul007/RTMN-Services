# RTMN Routing & Request Flow Guide

**Date:** June 16, 2026  
**Version:** 1.0.0

---

## 🗺️ Architecture Overview

### Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                          │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐                 │
│   │  Web    │     │ Mobile  │     │WhatsApp│     │  API   │                 │
│   │  App    │     │  App    │     │  Bot    │     │Clients  │                 │
│   └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘                 │
└────────┼───────────────┼───────────────┼───────────────┼────────────────────────┘
         │               │               │               │
         └───────────────┴───────────────┴───────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend + API Gateway)                         │
│                              rtmn-pilot-portal                                   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    Main API Router (api/index.js)                        │   │
│   │                                                                          │   │
│   │   /api/:service/:path  →  Routes to appropriate backend host           │   │
│   │                                                                          │   │
│   │   Service Registry:                                                      │   │
│   │   • corp       → rtmn-corpid-service.onrender.com                       │   │
│   │   • memory     → rtmn-memory-os.onrender.com                             │   │
│   │   • twins      → rtmn-twinos-hub.onrender.com                            │   │
│   │   • restaurant → rtmn-restaurant-os.onrender.com                         │   │
│   │   • hotel      → rtmn-hotel-os.onrender.com                              │   │
│   │   • healthcare → rtmn-healthcare-os.onrender.com                         │   │
│   │   • ... (24 industry services)                                           │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RENDER (Backend)                                     │
│                         rtmn-pilot-onboarding                                   │
│                              Port: 4399                                          │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    Express API Server                                     │   │
│   │                                                                          │   │
│   │   Authentication (JWT) → Rate Limiting → Security Headers               │   │
│   │         ↓                    ↓                    ↓                     │   │
│   │   ┌─────────┐          ┌─────────┐          ┌─────────┐               │   │
│   │   │ Auth    │          │  Auth   │          │ Helmet  │               │   │
│   │   │ Routes  │          │Middleware│          │ Headers │               │   │
│   │   └────┬────┘          └────┬────┘          └─────────┘               │   │
│   │        │                    │                                           │   │
│   │        └──────────┬─────────┘                                            │   │
│   │                   │                                                      │   │
│   │                   ▼                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│   │   │                      Business Routes                               │   │   │
│   │   │   /v1/auth/*  /v1/services/*  /v1/billing/*  /v1/payments/*    │   │   │
│   │   └─────────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   MongoDB      │  │    Redis       │  │  External APIs  │
│   (Database)   │  │   (Cache)      │  │  (Stripe, etc)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 🔀 Service Routing

### 1. Vercel API Gateway

**Location:** `/Users/rejaulkarim/Documents/RTMN/api/index.js`

```javascript
// Service registry maps service names to Render backend hosts
const SERVICES = {
  // Foundation Services
  corp:        'rtmn-corpid-service.onrender.com',
  memory:      'rtmn-memory-os.onrender.com',
  twins:       'rtmn-twinos-hub.onrender.com',
  goal:        'rtmn-goal-os.onrender.com',
  
  // Industry OS (24 services)
  restaurant:  'rtmn-restaurant-os.onrender.com',
  hotel:       'rtmn-hotel-os.onrender.com',
  healthcare:  'rtmn-healthcare-os.onrender.com',
  retail:      'rtmn-retail-os.onrender.com',
  legal:       'rtmn-legal-os.onrender.com',
  // ... 19 more
  
  // HOJAI AI Services
  genie:       'rtmn-genie.onrender.com',
  copilot:     'rtmn-business-copilot.onrender.com',
  intent:      'rtmn-intent-graph.onrender.com',
  
  // RABTUL Financial
  auth:        'rtmn-auth-service.onrender.com',
  wallet:      'rtmn-wallet-service.onrender.com',
};

// Route handler
app.get('/api/:service/:path', async (req, res) => {
  const { service, path } = req.params;
  const targetHost = SERVICES[service];
  
  if (!targetHost) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  // Forward request to backend
  const url = `https://${targetHost}/api/${path}`;
  const response = await fetch(url, {
    headers: {
      ...req.headers,
      'x-forwarded-for': req.ip,
    },
  });
  
  res.json(await response.json());
});
```

### 2. CorpPerks API Gateway

**Location:** `/companies/CorpPerks/api-gateway/`

```javascript
// routes.js - Route configuration
exports.routes = [
  // Core HR Services
  {
    path: '/api/employees',
    target: 'http://localhost:4006',
    timeout: 30000,
    retries: 2,
    authRequired: true,
    rateLimit: { windowMs: 60000, max: 100 },
  },
  {
    path: '/api/attendance',
    target: 'http://localhost:4006',
    timeout: 30000,
    retries: 2,
    authRequired: true,
    rateLimit: { windowMs: 60000, max: 200 },
  },
  {
    path: '/api/leave',
    target: 'http://localhost:4006',
    timeout: 30000,
    retries: 2,
    authRequired: true,
    rateLimit: { windowMs: 60000, max: 50 },
  },
  {
    path: '/api/payroll',
    target: 'http://localhost:4738',
    timeout: 60000,
    retries: 3,
    authRequired: true,
    rateLimit: { windowMs: 60000, max: 20 },
  },
];
```

### 3. Industry OS Routing

**Location:** `/industry-os/services/restaurant-os/src/index.js`

Each industry OS follows the same routing pattern:

```javascript
// Restaurant OS routing example
const INDUSTRY = 'restaurant';
const PORT = process.env.PORT || 5010;

// ============================================
// AUTHENTICATION ROUTES (Public)
// ============================================
app.post('/auth/register', ...);  // Register business
app.post('/auth/login', ...);     // Business login
app.get('/auth/verify', ...);    // Verify email
app.post('/auth/logout', ...);    // End session

// ============================================
// BUSINESS ROUTES (Auth Required)
// ============================================
app.get('/api/menu', requireAuth, ...);
app.post('/api/menu', requireAuth, ...);
app.put('/api/menu/:id', requireAuth, ...);
app.delete('/api/menu/:id', requireAuth, ...);

app.get('/api/orders', requireAuth, ...);
app.post('/api/orders', requireAuth, ...);
app.patch('/api/orders/:id', requireAuth, ...);

app.get('/api/tables', requireAuth, ...);
app.post('/api/tables', requireAuth, ...);

// ============================================
// LAYER INTEGRATION ROUTES
// ============================================

// Layer 1: Intelligence (HOJAI AI)
app.get('/api/layer/intelligence', requireAuth, ...);
app.post('/api/ai/chat', requireAuth, ...);
app.get('/api/ai/agents', requireAuth, ...);

// Layer 2: Customer Growth
app.get('/api/layer/customer-growth', requireAuth, ...);
app.get('/api/layer/loyalty', requireAuth, ...);

// Layer 3: Commerce
app.get('/api/merchant/menu', requireAuth, ...);
app.post('/api/merchant/orders', requireAuth, ...);

// Layer 4: Financial
app.get('/api/layer/finance', requireAuth, ...);
app.get('/api/wallet/balance', requireAuth, ...);
app.post('/api/payments/process', requireAuth, ...);

// Layer 5: Workforce
app.get('/api/layer/workforce', requireAuth, ...);

// All Layers Status
app.get('/api/layers', requireAuth, ...);
```

---

## 🔄 Inter-Service Communication

### 1. Direct REST Calls

```javascript
// Industry services call each other via HTTP
const RTMN_SERVICES = {
  genie: process.env.GENIE_URL || 'http://localhost:4701',
  copilot: process.env.COPILOT_URL || 'http://localhost:4600',
  crmHub: process.env.CRM_HUB_URL || 'http://localhost:4056',
  auth: process.env.AUTH_URL || 'http://localhost:4002',
  wallet: process.env.WALLET_URL || 'http://localhost:4004',
};

// Example: Restaurant calls Auth service
app.post('/api/orders', requireAuth, async (req, res) => {
  // Verify user with auth service
  const authResponse = await fetch(`${RTMN_SERVICES.auth}/verify`, {
    method: 'POST',
    headers: {
      'Authorization': req.headers.authorization,
    },
  });
  
  if (!authResponse.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Process order...
});
```

### 2. Event Bus (Pub/Sub)

**Location:** `/companies/RABTUL-Technologies/REZ-event-bus/`  
**Port:** 4510

```javascript
// Event publishing
eventBus.publish('restaurant.order.created', {
  orderId: 'ORD-123',
  businessId: req.session.businessId,
  total: 450,
  timestamp: new Date().toISOString(),
});

// Event subscription
eventBus.subscribe('restaurant.order.*', async (event) => {
  const { orderId, businessId } = event.data;
  
  // Update inventory
  await inventoryService.update(orderId);
  
  // Send to analytics
  await analyticsService.track(orderId);
  
  // Trigger notifications
  await notificationService.send(orderId);
});
```

### 3. GraphQL Federation

**Location:** `/companies/RABTUL-Technologies/REZ-graphql-federation/`  
**Port:** 4000

```javascript
// Single GraphQL endpoint federating all services
app.use('/graphql', graphqlHTTP({
  schema: buildSchema(`
    type Service {
      id: String!
      name: String!
      status: String!
      industry: String!
      capabilities: [String!]!
    }
    
    type Query {
      services(status: String, industry: String): [Service!]!
      service(id: String!): Service
      health: String!
    }
  `),
  rootValue: {
    services: () => fetchFromEcosystemConnector(),
    service: (args) => fetchService(args.id),
    health: () => 'OK',
  },
  graphiql: true,
}));
```

---

## 🛡️ Security Layer

### Request Pipeline

```
Request
  │
  ▼
┌─────────────────────────────────────────────┐
│  1. CORS Check                             │
│     - Validate Origin                       │
│     - Set CORS headers                      │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  2. Security Headers (Helmet)               │
│     - HSTS                                  │
│     - CSP                                   │
│     - X-Frame-Options                       │
│     - etc.                                  │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  3. Rate Limiting                           │
│     - Global: 100 req/15min                 │
│     - Auth: 10 req/15min                    │
│     - Write: 30 req/min                      │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  4. Authentication                          │
│     - Extract JWT from header               │
│     - Verify token                          │
│     - Attach user to request                 │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  5. Authorization                           │
│     - Check roles                           │
│     - Check permissions                      │
│     - Verify tenant access                   │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  6. Request Validation                       │
│     - Zod schema validation                 │
│     - Sanitize input                        │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│  7. Business Logic                         │
│     - Process request                       │
│     - Log action                            │
└─────────────────────────────────────────────┘
  │
  ▼
Response
```

---

## 📊 Port Registry

| Range | Category | Services |
|-------|----------|----------|
| **3000-3099** | Core | API Gateway, Business Copilot, AgentOS |
| **4000** | GraphQL | REZ-graphql-federation |
| **4001-4055** | RABTUL | Auth, Wallet, Manufacturing, HR |
| **4056** | AdBazaar | REZ-crm-hub |
| **4100-4119** | REZ-Mart | E-commerce |
| **4140-4256** | SUTAR | GoalOS, Decision Engine, Economy |
| **4300-4399** | Axom | BuzzLocal, Community Intelligence |
| **4399** | Integration | REZ-ecosystem-connector |
| **4510** | Events | REZ-event-bus |
| **4600-4711** | HOJAI | Intelligence, Memory, Twins, Genie |
| **4701-4702** | CorpID | Universal Identity |
| **4703** | Memory | MemoryOS |
| **4705** | Twins | TwinOS Hub |
| **4708** | Personal | Personal Twin |
| **4761-4765** | Leverge | Intelligence Suite |
| **4800-4899** | Merchant | POS, Orders, Menu, Payments |
| **5010-5240** | Industry OS | 24 Industry Services |

---

## 🔧 Adding a New Service

### Step 1: Register in Vercel Gateway

```javascript
// api/index.js
const SERVICES = {
  // ... existing services ...
  myservice: 'rtmn-myservice.onrender.com',
};
```

### Step 2: Add Routes

```javascript
// myservice/src/index.js
const express = require('express');
const app = express();

// Security middleware
const { createCorsMiddleware, createHelmetMiddleware } = require('@rtmn/shared-sdk');
app.use(createCorsMiddleware());
app.use(createHelmetMiddleware());

// Auth middleware
const { createAuthMiddleware } = require('@rtmn/shared-sdk');
const auth = createAuthMiddleware();
app.use('/api', auth.authenticate());

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/resource', (req, res) => res.json({ data: [] }));

// Start server
app.listen(process.env.PORT || 5000);
```

### Step 3: Deploy to Render

```yaml
# render.yaml
services:
  - type: web
    name: rtmn-myservice
    env: node
    region: singapore
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        sync: false
      - key: MONGODB_URI
        sync: false
```

---

## 🧪 Testing Routes

### Manual Testing

```bash
# Test authentication
curl -X POST http://localhost:5010/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test authenticated endpoint
curl http://localhost:5010/api/orders \
  -H "Authorization: Bearer <token>"

# Test health check
curl http://localhost:5010/health

# Test service discovery
curl http://localhost:4399/api/services
```

### Automated Testing

```javascript
// test/routes.test.js
const request = require('supertest');

describe('Order Routes', () => {
  let authToken;
  
  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = res.body.token;
  });
  
  it('should create order with valid auth', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ items: [...], total: 450 });
    
    expect(res.status).toBe(201);
    expect(res.body.orderId).toBeDefined();
  });
  
  it('should reject order without auth', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [...] });
    
    expect(res.status).toBe(401);
  });
});
```

---

## 📈 Monitoring Routes

### Health Check Endpoints

```javascript
// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    external: await checkExternalServices(),
  };
  
  const allHealthy = Object.values(checks).every(c => c.status === 'up');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

### Metrics Endpoint

```javascript
app.get('/metrics', (req, res) => {
  const metrics = {
    requests: requestCount,
    latency: averageLatency,
    errors: errorRate,
    byEndpoint: endpointMetrics,
  };
  
  res.json(metrics);
});
```

---

## 🚀 Performance Optimization

### Response Caching

```javascript
// Cache responses with Redis
const cache = require('redis').createClient();

app.get('/api/menu', async (req, res) => {
  const cacheKey = `menu:${req.session.businessId}`;
  
  // Check cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // Fetch from database
  const menu = await MenuModel.find({ businessId: req.session.businessId });
  
  // Cache for 5 minutes
  await cache.setEx(cacheKey, 300, JSON.stringify(menu));
  
  res.json(menu);
});
```

### Connection Pooling

```javascript
// MongoDB connection pooling
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

---

## 🔒 Security Checklist

Before going live:

- [ ] CORS configured with specific origins
- [ ] Helmet security headers enabled
- [ ] Rate limiting configured
- [ ] JWT authentication on all protected routes
- [ ] Role-based authorization implemented
- [ ] Input validation with Zod
- [ ] SQL/NoSQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens for state-changing operations
- [ ] HTTPS enforced
- [ ] Sensitive data encrypted
- [ ] Audit logging enabled
- [ ] Error messages don't leak internals

---

**Questions?** Check the audit reports or contact the HOJAI AI team.
