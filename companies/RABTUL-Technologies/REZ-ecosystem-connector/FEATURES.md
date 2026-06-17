# REZ-ecosystem-connector - Features

**Version:** 1.0.0  
**Last Updated:** June 15, 2026  
**Port:** 4399  
**Status:** ✅ RUNNING

---

## Core Features

### 1. Service Registry

| Feature | Description | Status |
|---------|-------------|--------|
| Service Registration | Register services with metadata | ✅ |
| Service Discovery | Find services by ID, name, type | ✅ |
| Service Listing | List all registered services | ✅ |
| Status Updates | Update service status (healthy/degraded/down) | ✅ |
| Heartbeat | Monitor service health via heartbeats | ✅ |
| Auto-unregister | Remove stale services | ✅ |

### 2. Service Metadata

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique service ID |
| name | string | Service name |
| version | string | Service version |
| type | string | Service type (industry-os, foundation, etc.) |
| industry | string | Industry vertical |
| port | number | Service port |
| healthUrl | string | Health check URL |
| apiUrl | string | API base URL |
| capabilities | string[] | Service capabilities |
| digitalTwins | string[] | Associated digital twins |
| status | string | Current status |
| registeredAt | timestamp | Registration time |
| lastHeartbeat | timestamp | Last heartbeat time |

### 3. Messaging

| Feature | Description | Status |
|---------|-------------|--------|
| Message Send | Send messages between services | ✅ |
| Message Retrieval | Get message by ID | ✅ |
| Correlation ID | Track related messages | ✅ |
| Service Filtering | Filter by source/destination | ✅ |
| Message Queue | In-memory message queue | ✅ |

### 4. Event Subscriptions

| Feature | Description | Status |
|---------|-------------|--------|
| Subscribe | Subscribe to event patterns | ✅ |
| List Subscriptions | View all subscriptions | ✅ |
| Unsubscribe | Remove subscription | ✅ |
| Pattern Matching | Wildcard pattern support | ✅ |
| Multiple Subscribers | Multiple subscribers per event | ✅ |

### 5. Transaction Management

| Feature | Description | Status |
|---------|-------------|--------|
| Start Transaction | Begin multi-service transaction | ✅ |
| Update Step | Mark transaction step complete | ✅ |
| Rollback | Rollback entire transaction | ✅ |
| Track Progress | Track transaction progress | ✅ |

### 6. Health Monitoring

| Feature | Description | Status |
|---------|-------------|--------|
| Health Check | Basic health endpoint | ✅ |
| Service Health | Detailed service health | ✅ |
| Heartbeat | Service heartbeat tracking | ✅ |
| Statistics | Service registry statistics | ✅ |

---

## API Endpoints

### Service Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/services` | Register service |
| GET | `/api/services` | List services |
| GET | `/api/services/:id` | Get by ID |
| GET | `/api/services/name/:name` | Get by name |
| PATCH | `/api/services/:id/status` | Update status |
| POST | `/api/services/:id/heartbeat` | Send heartbeat |
| DELETE | `/api/services/:id` | Unregister |

### Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages` | Send message |
| GET | `/api/messages/:id` | Get message |
| GET | `/api/messages/correlation/:id` | By correlation |
| GET | `/api/messages/service/:name` | By service |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscriptions` | Create subscription |
| GET | `/api/subscriptions` | List subscriptions |
| DELETE | `/api/subscriptions/:id` | Delete subscription |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions` | Start transaction |
| PATCH | `/api/transactions/:id/step` | Update step |
| POST | `/api/transactions/:id/rollback` | Rollback |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health |
| GET | `/api/health/services` | Service health |
| GET | `/api/stats` | Statistics |

---

## Integration

### Connected Industry OS

| Industry | Service | Port | Digital Twins |
|----------|---------|------|---------------|
| Hospitality | restaurant-os | 5010 | Menu, Order, Kitchen, Table, Customer |
| Healthcare | healthcare-os | 5020 | Patient, Doctor, Appointment, Prescription |
| Hospitality | hotel-os | 5025 | Room, Booking, Guest, Service, Revenue |
| Retail | retail-os | 5030 | Product, Inventory, Customer, Cart, Supplier |
| Legal | legal-os | 5035 | Client, Case, Lawyer, Document, Invoice |
| Hospitality | hospitality-os | 5050 | Establishment, Staff, Customer, Transaction, Event |
| Education | education-os | 5060 | Course, Student, Instructor, Enrollment |
| Automotive | automotive-os | 5080 | Vehicle, Customer, Service, Appointment |
| Beauty | beauty-os | 5090 | Client, Service, Staff, Appointment, Product |
| Energy | energy-os | 5100 | Meter, Reading, Consumption, Billing |
| Fitness | fitness-os | 5110 | Member, Trainer, Class, Membership, Attendance |
| Manufacturing | manufacturing-os | 5150 | Product, Order, Machine, Material, Worker, Quality |
| Real Estate | realestate-os | 5230 | Property, Listing, Lead, Agent, Viewing, Offer |
| Media | media-os | 5600 | Content, Creator, Analytics, Subscription |

### Integration Hub

| Service | Port | Role |
|---------|------|------|
| REZ-event-bus | 4510 | Pub/Sub event messaging |
| REZ-graphql-federation | 4000 | Unified GraphQL API |

---

## Statistics

| Metric | Value |
|--------|-------|
| Registered Services | 19 |
| Active Services | 19 |
| Total Messages | 0 |
| Active Subscriptions | 0 |

---

*Last Updated: June 15, 2026*
*REZ-ecosystem-connector - Service Registry & Discovery*