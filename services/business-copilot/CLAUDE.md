# Business Copilot - 24 Industry Skill Packs

**Version:** 1.0.0  
**Port:** 4600  
**Status:** ✅ BUILT | **June 18, 2026**

---

## Overview

Business Copilot is an AI-powered business intelligence service with **24 industry skill packs** containing **120+ specialized skills**. It helps businesses across all verticals with industry-specific insights, recommendations, and automation.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BUSINESS COPILOT                                        │
│                            (Port 4600)                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      24 INDUSTRY SKILL PACKS                         │       │
│  │                                                                       │       │
│  │   Restaurant │ Hotel │ Healthcare │ Retail │ Legal │ Education     │       │
│  │   Agriculture │ Automotive │ Beauty │ Fashion │ Fitness │ Gaming    │       │
│  │   Government │ Home Services │ Manufacturing │ Non-Profit │ Prof    │       │
│  │   Sports │ Travel │ Entertainment │ Construction │ Financial │ RE     │       │
│  │   Transport                                                        │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      120+ SPECIALIZED SKILLS                         │       │
│  │                                                                       │       │
│  │   Analysis │ Optimization │ Scheduling │ Management │ Financial     │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 24 Industries

| # | Industry | Port | Skills |
|---|----------|------|--------|
| 1 | Restaurant | 5010 | 12 |
| 2 | Hotel | 5025 | 12 |
| 3 | Healthcare | 5020 | 12 |
| 4 | Retail | 5030 | 12 |
| 5 | Legal | 5035 | 12 |
| 6 | Education | 5060 | 12 |
| 7 | Agriculture | 5070 | 12 |
| 8 | Automotive | 5080 | 12 |
| 9 | Beauty | 5090 | 12 |
| 10 | Fashion | 5095 | 12 |
| 11 | Fitness | 5110 | 12 |
| 12 | Gaming | 5120 | 12 |
| 13 | Government | 5130 | 12 |
| 14 | Home Services | 5140 | 12 |
| 15 | Manufacturing | 5150 | 12 |
| 16 | Non-Profit | 5160 | 12 |
| 17 | Professional | 5170 | 12 |
| 18 | Sports | 5180 | 12 |
| 19 | Travel | 5190 | 12 |
| 20 | Entertainment | 5200 | 12 |
| 21 | Construction | 5210 | 12 |
| 22 | Financial | 5220 | 12 |
| 23 | Real Estate | 5230 | 12 |
| 24 | Transport | 5240 | 12 |

---

## Sample Skills by Industry

### Restaurant (5010)
- menu_optimization, inventory_management, staff_scheduling, table_reservations
- customer_feedback, food_cost_analysis, peak_hour_planning, supplier_management

### Hotel (5025)
- room_pricing, occupancy_optimization, guest_checkin, housekeeping_scheduling
- concierge_services, revenue_forecasting, loyalty_program, upselling_techniques

### Healthcare (5020)
- patient_intake, appointment_scheduling, billing_coding, insurance_claims
- medical_records, treatment_plans, bed_management, compliance_tracking

### Retail (5030)
- inventory_control, visual_merchandising, customer_segmentation, loyalty_programs
- pricing_strategy, supplier_negotiation, loss_prevention, POS_operations

---

## API Endpoints

### Core
```
GET  /health                    # Health check
GET  /ready                     # Readiness
GET  /api/stats                 # Statistics
```

### Industries
```
GET  /api/industries            # List all industries
GET  /api/industries/:id        # Get industry details
GET  /api/industries/:id/skills # Get skills for industry
```

### Skills
```
GET  /api/skills/search         # Search skills
   Query: ?q=keyword&industry=restaurant
POST /api/skills/execute        # Execute a skill
   Body: { industry, skill, params }
```

### Chat
```
POST /api/chat                  # Main chat endpoint
   Body: { query, industry?, userId?, context? }
```

---

## Example Usage

### List Industries
```bash
curl http://localhost:4600/api/industries
```

### Search Skills
```bash
curl "http://localhost:4600/api/skills/search?q=pricing&industry=restaurant"
```

### Chat Query
```bash
curl -X POST http://localhost:4600/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How can I optimize my menu for better profits?",
    "industry": "restaurant"
  }'
```

### Execute Skill
```bash
curl -X POST http://localhost:4600/api/skills/execute \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "restaurant",
    "skill": "menu_optimization",
    "params": {}
  }'
```

---

## Environment Variables

```env
PORT=4600
```

---

## Quick Start

```bash
cd services/business-copilot
npm install
npm start

# Health check
curl http://localhost:4600/health
```

---

*Last Updated: June 18, 2026*
