# RTMN Technical Architecture

## System Design

### Overview

RTMN is a microservices-based ecosystem designed for horizontal scaling and independent service deployment.

```
                    ┌──────────────────────────────────────────────┐
                    │           Load Balancer (nginx)              │
                    └────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────▼───────────────────────┐
                    │           API Gateway (Express)                │
                    │           Port: 4399                          │
                    └────────────────────┬───────────────────────────┘
                                         │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                 │
┌──────▼──────┐                ┌───────▼──────┐              ┌───────▼──────┐
│Sales OS     │                │Media OS     │              │Marketing OS │
│Port: 5055   │                │Port: 5600   │              │Port: 5500  │
└──────┬──────┘                └───────┬──────┘              └───────┬──────┘
       │                           │                              │
       │                           │                              │
       └───────────────────────────┼──────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Service Mesh (Internal)   │
                    │   MongoDB Replica Set         │
                    └─────────────────────────────┘
```

---

## Technology Stack

### Core
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB (replica set)
- **Cache:** Redis
- **Queue:** RabbitMQ
- **Search:** Elasticsearch

### AI/ML
- **AI Platform:** HOJAI AI Suite
- **Digital Twins:** TwinOS
- **Memory:** MemoryOS
- **Agents:** Leverge Agents

### Infrastructure
- **Container:** Docker
- **Orchestration:** Docker Compose
- **Cloud:** AWS/GCP/Azure
- **CDN:** CloudFlare
- **Monitoring:** Prometheus + Grafana

---

## Database Schema

### MongoDB Collections

#### Sales OS
```javascript
// customers
{
  _id: ObjectId,
  customerId: String,        // CUST-xxxxx
  email: String,
  phone: String,
  name: String,
  company: String,
  type: String,              // individual | business
  status: String,              // lead | prospect | customer
  lifecycleStage: String,     // new | engaged | won | lost
  tags: [String],
  customFields: Mixed,
  createdAt: Date,
  updatedAt: Date
}

// leads
{
  _id: ObjectId,
  leadId: String,           // LEAD-xxxxx
  customerId: String,
  source: String,           // website | referral | ad
  score: Number,            // 0-100
  status: String,            // new | contacted | qualified | proposal | negotiation | won | lost
  owner: String,           // userId
  opportunities: [{
    title: String,
    value: Number,
    stage: String
  }],
  activities: [{
    type: String,
    description: String,
    userId: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}

// deals
{
  _id: ObjectId,
  dealId: String,         // DEAL-xxxxx
  title: String,
  value: Number,
  currency: String,
  stage: String,           // prospecting | proposal | negotiation | closed_won | closed_lost
  probability: Number,       // 0-100
  expectedClose: Date,
  customerId: String,
  contactId: String,
  owner: String,
  lineItems: [{
    product: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }],
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Media OS
```javascript
// viewers
{
  _id: ObjectId,
  viewerId: String,        // VIEW-xxxxx
  email: String,
  profile: {
    displayName: String,
    avatar: String
  },
  subscription: {
    plan: String,          // free | basic | premium | vip
    status: String,
    startDate: Date,
    endDate: Date
  },
  preferences: {
    language: String,
    notifications: Boolean,
    autoplay: Boolean
  },
  watchHistory: [{
    contentId: String,
    watched: Number,         // seconds
    completedAt: Date
  }],
  watchlist: [String],
  createdAt: Date
}

// content
{
  _id: ObjectId,
  contentId: String,       // CONTENT-xxxxx
  title: String,
  type: String,             // movie | series | live | podcast
  genres: [String],
  language: String,
  rating: String,           // U | UA | A | Adult
  duration: Number,          // seconds
  status: String,            // draft | processing | published | archived
  pricing: {
    subscription: [String],
    rent: Number,
    buy: Number
  },
  metadata: Mixed,
  createdAt: Date
}

// campaigns
{
  _id: ObjectId,
  campaignId: String,       // CAMP-xxxxx
  title: String,
  type: String,             // awareness | consideration | conversion
  channels: [String],
  targeting: {
    demographics: Mixed,
    geotargeting: [String]
  },
  budget: {
    total: Number,
    spent: Number
  },
  performance: {
    impressions: Number,
    clicks: Number,
    conversions: Number,
    ctr: Number,
    roas: Number
  },
  status: String,
  startDate: Date,
  endDate: Date
}
```

---

## API Design

### RESTful Endpoints

```
Base: /api/v1/{resource}

Resources:
├── /customers
├── /leads
├── /deals
├── /tasks
├── /activities
├── /reports
└── /settings

Methods:
GET    /customers           → List customers
POST   /customers           → Create customer
GET    /customers/:id       → Get customer
PATCH  /customers/:id       → Update customer
DELETE /customers/:id       → Delete customer

GET    /customers/:id/activity    → Customer activity
GET    /customers/:id/timeline    → Customer timeline
POST   /customers/:id/tags          → Add tags
DELETE /customers/:id/tags/:tagId   → Remove tag
```

### Response Format

```javascript
// Success
{
  success: true,
  data: {...},
  meta: {
    page: 1,
    limit: 20,
    total: 150
  }
}

// Error
{
  success: false,
  error: {
    code: "CUSTOMER_NOT_FOUND",
    message: "Customer with ID xxx not found"
  }
}
```

### Authentication

```bash
# JWT Token
Authorization: Bearer <token>

# Organization Context
X-Organization-ID: org_xxxxx
```

---

## Event-Driven Architecture

### Event Bus Topics

```
rtmn.events.customer.created
rtmn.events.customer.updated
rtmn.events.customer.deleted
rtmn.events.lead.created
rtmn.events.lead.stage_changed
rtmn.events.deal.created
rtmn.events.deal.stage_changed
rtmn.events.deal.won
rtmn.events.deal.lost
rtmn.events.payment.success
rtmn.events.payment.failed
rtmn.events.content.viewed
rtmn.events.content.completed
rtmn.events.campaign.started
rtmn.events.campaign.completed
```

### Event Schema

```javascript
{
  eventId: String,
  type: String,
  source: String,         // sales | media | marketing
  organizationId: String,
  timestamp: Date,
  data: {
    entity: String,       // customer | lead | deal
    entityId: String,
    changes: Mixed
  },
  metadata: {
    userId: String,
    ip: String
  }
}
```

---

## Deployment

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5055
CMD ["node", "src/index.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sales-os
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sales-os
  template:
    spec:
      containers:
      - name: sales-os
        image: rtmn/sales-os:latest
        ports:
        - containerPort: 5055
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Helm Chart

```bash
helm install sales-os ./charts/sales-os \
  --set image.tag=latest \
  --set replicaCount=3 \
  --set env.MONGODB_URI=mongodb://mongo:27017/sales
```

---

## Monitoring

### Prometheus Metrics

```javascript
// Custom metrics
http_requests_total{method, status, route}
http_request_duration_seconds{method, route}
db_operations_total{collection, operation}
queue_depth{queue}
active_connections_total
revenue_total{currency}
```

### Health Checks

```bash
# Liveness
GET /live

# Readiness
GET /ready

# Deep health
GET /health
```

---

## Security

### CORS

```javascript
const corsOptions = {
  origin: ['https://app.rtmn.in', 'https://admin.rtmn.in'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

### Rate Limiting

```javascript
// Per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})

// Per User
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
})
```

### Helmet

```javascript
app.use(helmet({
  contentSecurityPolicy: true,
  hsts: true,
  noSniff: true,
  frameguard: { action: 'deny' }
}))
```

---

## Scaling

### Horizontal Scaling

```
                     ┌─────────────────┐
                     │   Load Balancer  │
                     └────────┬────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ Sales OS │          │ Sales OS │          │ Sales OS │
   │ Instance│          │ Instance│          │ Instance│
   │    1    │          │    2    │          │    3    │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                     ┌────────▼────────┐
                     │  MongoDB       │
                     │  Replica Set   │
                     └────────────────┘
```

### Auto-scaling

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sales-os
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Disaster Recovery

### Backup Schedule

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full | Daily | 7 days |
| Incremental | Hourly | 24 hours |
| Logs | Real-time | 30 days |

### Failover

```
Primary Region: Mumbai
  └── MongoDB Replica Set (1 primary, 2 secondaries)

DR Region: Singapore
  └── MongoDB Replica Set (1 primary, 2 secondaries)

Sync: Real-time via change streams
```

---

## Performance

### Benchmarks

| Operation | Target | P95 | P99 |
|-----------|--------|-----|-----|
| Customer Create | < 100ms | 50ms | 80ms |
| Customer Lookup | < 50ms | 20ms | 40ms |
| Deal Update | < 100ms | 60ms | 100ms |
| Search | < 200ms | 150ms | 200ms |
| Bulk Import | < 5s per 1000 | - | - |

### Optimization

- Indexed queries
- Connection pooling
- Query caching (Redis)
- CDN for static assets
- Compression (gzip/brotli)
- Pagination (cursor-based)
