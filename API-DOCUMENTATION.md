# RTMN Ecosystem API Documentation

**Version:** 1.0.0  
**Last Updated:** June 15, 2026  
**Status:** ✅ All Services Running

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    RTMN ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Integration │  │  Event Bus  │  │   GraphQL   │             │
│  │  Connector  │  │   (4510)    │  │ Federation  │             │
│  │   (4399)    │  │             │  │   (4000)    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│  ┌──────▼────────────────▼────────────────▼──────┐             │
│  │              Industry OS Layer (15 services)   │             │
│  │  Restaurant │ Hotel │ Healthcare │ Retail │ ... │         │
│  └───────────────────────────────────────────────┘             │
│                                                                 │
│  ┌───────────────────────────────────────────────┐             │
│  │           Foundation Services (4 services)    │             │
│  │  GoalOS │ MemoryOS │ CorpID │ Agent Economy  │             │
│  └───────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Registry (Port 4399)

### Health Check
```bash
GET http://localhost:4399/health
```

### Register Service
```bash
POST http://localhost:4399/api/services
Content-Type: application/json

{
  "name": "service-name",
  "version": "1.0.0",
  "type": "industry-os",
  "industry": "hospitality",
  "port": 5010,
  "healthUrl": "http://localhost:5010/health",
  "apiUrl": "http://localhost:5010/api",
  "capabilities": ["menu", "orders", "kitchen"],
  "digitalTwins": ["menu-twin", "order-twin"]
}
```

### List All Services
```bash
GET http://localhost:4399/api/services
GET http://localhost:4399/api/services?status=active
GET http://localhost:4399/api/services?type=industry-os
```

### Get Service by ID
```bash
GET http://localhost:4399/api/services/:id
```

### Get Service by Name
```bash
GET http://localhost:4399/api/services/name/:name
```

### Update Service Status
```bash
PATCH http://localhost:4399/api/services/:id/status
Content-Type: application/json

{ "status": "degraded" }
```

### Send Heartbeat
```bash
POST http://localhost:4399/api/services/:id/heartbeat
```

### Service Health
```bash
GET http://localhost:4399/api/health/services
```

### Stats
```bash
GET http://localhost:4399/api/stats
```

---

## Event Bus (Port 4510)

### Health Check
```bash
GET http://localhost:4510/health
GET http://localhost:4510/health/ready
GET http://localhost:4510/health/live
```

### Publish Event
```bash
POST http://localhost:4510/events
Content-Type: application/json

{
  "type": "order.created",
  "payload": {
    "orderId": "ORD-123",
    "customerId": "CUST-456",
    "total": 99.99
  },
  "metadata": {
    "source": "restaurant-os",
    "correlationId": "corr-789"
  }
}
```

### Subscribe to Events
```bash
POST http://localhost:4510/subscriptions
Content-Type: application/json

{
  "subscriberId": "inventory-service",
  "eventType": "order.created",
  "callbackUrl": "http://localhost:5030/api/webhooks/order"
}
```

### List Subscriptions
```bash
GET http://localhost:4510/subscriptions
GET http://localhost:4510/subscriptions?subscriberId=inventory-service
```

### Get Event Types
```bash
GET http://localhost:4510/event-types
```

### Get Schemas
```bash
GET http://localhost:4510/schemas
```

---

## GraphQL Federation (Port 4000)

### GraphiQL IDE
```
http://localhost:4000/graphql
```

### Health Check
```bash
GET http://localhost:4000/health
```

### GraphQL Query Examples

**List all services:**
```graphql
query {
  services {
    id
    name
    status
    industry
    capabilities
  }
}
```

**Get service by ID:**
```graphql
query {
  service(id: "service-id") {
    id
    name
    status
    capabilities
  }
}
```

**Register new service (mutation):**
```graphql
mutation {
  registerService(
    name: "new-service"
    industry: "retail"
    capabilities: ["inventory", "orders"]
  ) {
    id
    name
    status
  }
}
```

---

## Industry OS Services

### Restaurant OS (Port 5010)

**Health:** `GET http://localhost:5010/health`

**API Endpoints:**
```bash
# Menu
GET    /api/menu              # List menu items
POST   /api/menu              # Add menu item
GET    /api/menu/:id          # Get menu item
PUT    /api/menu/:id          # Update menu item
DELETE /api/menu/:id         # Delete menu item

# Orders
GET    /api/orders            # List orders
POST   /api/orders            # Create order
GET    /api/orders/:id        # Get order
PATCH  /api/orders/:id/status # Update order status

# Tables
GET    /api/tables            # List tables
POST   /api/tables            # Reserve table
GET    /api/tables/:id        # Get table

# Kitchen
GET    /api/kitchen/queue     # Kitchen queue
POST   /api/kitchen/complete  # Mark complete
```

### Healthcare OS (Port 5020)

**Health:** `GET http://localhost:5020/health`

**API Endpoints:**
```bash
# Patients
GET    /api/patients          # List patients
POST   /api/patients          # Add patient
GET    /api/patients/:id      # Get patient

# Appointments
GET    /api/appointments      # List appointments
POST   /api/appointments      # Book appointment
GET    /api/appointments/:id  # Get appointment
PATCH  /api/appointments/:id  # Update appointment

# Doctors
GET    /api/doctors           # List doctors
POST   /api/doctors           # Add doctor
GET    /api/doctors/:id       # Get doctor

# Prescriptions
GET    /api/prescriptions     # List prescriptions
POST   /api/prescriptions     # Create prescription
```

### Hotel OS (Port 5025)

**Health:** `GET http://localhost:5025/health`

**API Endpoints:**
```bash
# Rooms
GET    /api/rooms             # List rooms
POST   /api/rooms             # Add room
GET    /api/rooms/:id         # Get room
PATCH  /api/rooms/:id         # Update room

# Bookings
GET    /api/bookings          # List bookings
POST   /api/bookings          # Create booking
GET    /api/bookings/:id      # Get booking
PATCH  /api/bookings/:id      # Update booking

# Guests
GET    /api/guests            # List guests
POST   /api/guests            # Add guest
GET    /api/guests/:id        # Get guest
```

### Retail OS (Port 5030)

**Health:** `GET http://localhost:5030/health`

**API Endpoints:**
```bash
# Products
GET    /api/products          # List products
POST   /api/products          # Add product
GET    /api/products/:id      # Get product

# Inventory
GET    /api/inventory         # List inventory
PATCH  /api/inventory/:id      # Update inventory

# Customers
GET    /api/customers         # List customers
POST   /api/customers          # Add customer

# Cart
GET    /api/cart              # Get cart
POST   /api/cart/items         # Add to cart
DELETE /api/cart/items/:id     # Remove from cart
```

### Legal OS (Port 5035)

**Health:** `GET http://localhost:5035/health`

**API Endpoints:**
```bash
# Clients
GET    /api/clients           # List clients
POST   /api/clients           # Add client
GET    /api/clients/:id       # Get client

# Cases
GET    /api/cases             # List cases
POST   /api/cases             # Open case
GET    /api/cases/:id         # Get case
PATCH  /api/cases/:id          # Update case

# Documents
GET    /api/documents         # List documents
POST   /api/documents         # Upload document
GET    /api/documents/:id     # Get document
```

### Education OS (Port 5060)

**Health:** `GET http://localhost:5060/health`

**API Endpoints:**
```bash
# Courses
GET    /api/courses           # List courses
POST   /api/courses           # Create course
GET    /api/courses/:id       # Get course

# Students
GET    /api/students          # List students
POST   /api/students          # Add student
GET    /api/students/:id       # Get student

# Instructors
GET    /api/instructors       # List instructors
POST   /api/instructors       # Add instructor

# Enrollments
GET    /api/enrollments       # List enrollments
POST   /api/enrollments       # Enroll student
```

---

## Foundation Services

### Goal OS (Port 4242)

**Health:** `GET http://localhost:4242/health`

**API Endpoints:**
```bash
# Goals
GET    /api/goals             # List goals
POST   /api/goals             # Create goal
GET    /api/goals/:id         # Get goal
PATCH  /api/goals/:id          # Update goal
DELETE /api/goals/:id         # Delete goal

# Progress
GET    /api/goals/:id/progress  # Get progress
POST   /api/goals/:id/progress  # Log progress
```

### Memory OS (Port 4703)

**Health:** `GET http://localhost:4703/health`

**API Endpoints:**
```bash
# Memory
GET    /api/memory            # List memories
POST   /api/memory            # Store memory
GET    /api/memory/:id        # Get memory
DELETE /api/memory/:id        # Delete memory

# Search
GET    /api/memory/search     # Search memories
POST   /api/memory/search     # Advanced search
```

---

## Management Scripts

### Start All Services
```bash
./start-ecosystem.sh
```

### Stop All Services
```bash
./stop-ecosystem.sh
```

### Health Check
```bash
./health-check.sh
```

---

## Quick Test Commands

```bash
# Check all services
curl -s http://localhost:4399/api/services | jq '.services | length'

# Health check all ports
for port in 4399 4510 4000 4242 4703 5010 5020 5025 5030 5035 5050 5060 5080 5090 5100 5110 5150 5230 5600; do
  echo -n "Port $port: "
  curl -s "http://localhost:$port/health" | jq -r '.status // "down"'
done

# Test GraphQL
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ services { name status } }"}'
```

---

*Last Updated: June 15, 2026*
