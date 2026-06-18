# RTMN Customer Operations - Demo Environment

**Version:** 1.0  
**Date:** June 17, 2026

---

## Quick Start - Run Demo

```bash
# 1. Start demo environment
docker-compose -f demo/docker-compose.yml up -d

# 2. Open demo dashboard
open http://localhost:3000/demo

# 3. Test API
curl http://localhost:4000/api/health
```

---

## Demo Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DEMO ENVIRONMENT                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Next.js)                                         │
│  http://localhost:3000                                      │
│                                                             │
│  ├── /demo - Interactive demo                              │
│  ├── /dashboard - Agent dashboard                        │
│  └── /api - API documentation                              │
│                                                             │
│  Backend (Express)                                          │
│  http://localhost:4000                                      │
│                                                             │
│  ├── /api/customers - Customer API                        │
│  ├── /api/tickets - Ticket API                            │
│  ├── /api/ai - AI endpoints                               │
│  └── /health - Health check                               │
│                                                             │
│  MongoDB (In-Memory for Demo)                              │
│  Demo data pre-loaded                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Demo Scenarios

### Scenario 1: Customer Support Ticket

```bash
# 1. Create a customer
curl -X POST http://localhost:4000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "phone": "+919876543210"
  }'

# 2. Create a ticket
curl -X POST http://localhost:4000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_demo_001",
    "subject": "Order not delivered",
    "message": "I ordered 3 days ago but still not received"
  }'

# 3. AI processes ticket
curl http://localhost:4000/api/ai/process/ticket_id

# 4. Auto-resolve
curl http://localhost:4000/api/resolution/auto-resolve
```

### Scenario 2: Refund Request

```bash
# 1. Create refund request
curl -X POST http://localhost:4000/api/refunds \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust_demo_001",
    "orderId": "order_001",
    "amount": 1500,
    "reason": "Product damaged"
  }'

# 2. AI checks trust score
curl http://localhost:4000/api/trust/check?customerId=cust_demo_001

# 3. Auto-approve
curl http://localhost:4000/api/approve/auto
```

### Scenario 3: Lead Conversion

```bash
# 1. Create lead
curl -X POST http://localhost:4000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Patel",
    "email": "priya@company.com",
    "source": "website"
  }'

# 2. AI scores lead
curl http://localhost:4000/api/ai/score-lead?leadId=lead_001

# 3. Sales qualifies
curl -X PUT http://localhost:4000/api/leads/lead_001 \
  -H "Content-Type: application/json" \
  -d '{"status": "qualified"}'

# 4. Convert to customer
curl -X POST http://localhost:4000/api/customers/convert \
  -H "Content-Type: application/json" \
  -d '{"leadId": "lead_001"}'
```

---

## Demo Data

### Customers (10)
| ID | Name | Trust Score | VIP |
|----|------|-------------|-----|
| cust_001 | Rahul Sharma | 94 | Gold |
| cust_002 | Priya Patel | 78 | Silver |
| cust_003 | Amit Kumar | 65 | Standard |
| cust_004 | Sneha Singh | 88 | Gold |
| cust_005 | Vikram Reddy | 45 | New |

### Orders (50)
| Status | Count |
|--------|-------|
| Delivered | 35 |
| In Transit | 10 |
| Pending | 5 |

### Tickets (30)
| Priority | Count |
|----------|-------|
| High | 5 |
| Medium | 15 |
| Low | 10 |

---

## Test Credentials

### Admin Access
```
Email: admin@rtmn.io
Password: demo123
```

### Agent Access
```
Email: agent@rtmn.io
Password: demo123
```

### Customer Access
```
Email: rahul@example.com
Password: demo123
```

---

## Demo Flow

```
1. Customer contacts via chat/WhatsApp
       │
       ▼
2. AI detects intent (refund/complaint/question)
       │
       ▼
3. Customer Twin loaded (trust score, history)
       │
       ▼
4. Decision Engine decides (auto-approve or human)
       │
       ├──► AUTO: Refund processed
       │
       └──► HUMAN: Ticket created for agent
                    │
                    ▼
              Agent handles ticket
                    │
                    ▼
5. Customer notified (email/SMS/WhatsApp)
       │
       ▼
6. Outcome tracked (CSAT, revenue impact)
```

---

## Run Specific Scenarios

### Full Customer Journey
```bash
./demo/scenarios/customer-journey.sh
```

### Refund Flow
```bash
./demo/scenarios/refund-flow.sh
```

### Lead to Customer
```bash
./demo/scenarios/lead-conversion.sh
```

---

## Performance Metrics (Demo)

| Metric | Value |
|--------|-------|
| Avg Response Time | 120ms |
| Auto-Resolution Rate | 65% |
| Customer Satisfaction | 4.5/5 |
| Agent Productivity | +40% |

---

## Monitor Demo

```bash
# View logs
docker-compose -f demo/docker-compose.yml logs -f

# Check services
curl http://localhost:4000/health
curl http://localhost:4881/health  # AI
curl http://localhost:4872/health  # Tickets

# View metrics
open http://localhost:4000/metrics
```

---

## Reset Demo

```bash
# Reset all data
./demo/reset.sh

# Reload sample data
./demo/load-data.sh
```

---

**Demo environment ready!**
