# CLAUDE.md - HOJAI Grocery Briefing Service

## Project Overview

**Name:** HOJAI Grocery Briefing Service  
**Purpose:** Generate daily briefings for grocery store owners  
**FreshMart Story:** 8AM - "Good Morning Ramesh. Revenue Yesterday: ₹3.4 Lakhs"  
**Location:** `companies/hojai-ai/hojai-grocery-briefing-service/`  
**Port:** 4708

---

## FreshMart Story Context

### 8 AM - Owner Briefing

**Story:** Every morning, Ramesh receives a personalized briefing:
- Revenue yesterday: ₹3.4 Lakhs
- Top category: Dairy
- Customer Satisfaction: 4.8
- Inventory Health: 94%
- Recommended Actions: 4

---

## Features

### Briefing Metrics
- **Financial:** Revenue (daily/weekly/monthly), orders, AOV, margins
- **Customer:** Satisfaction score, new vs returning, ratings
- **Inventory:** Health %, low stock, expiring, waste
- **Delivery:** Orders, on-time rate, failed deliveries

### AI-Generated Content
- **Insights:** Positive, negative, opportunities, alerts
- **Recommendations:** Priority actions with estimated impact
- **Natural Language:** Personalized text generation

---

## Architecture

```
hojai-grocery-briefing-service/
├── src/
│   ├── index.js              # Main entry (Port 4708)
│   ├── models/
│   │   └── briefing.model.js  # GroceryBriefing model
│   ├── services/
│   │   └── briefing.service.js  # Briefing generation logic
│   └── routes/
│       └── briefing.routes.js    # API routes
└── package.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/briefing/generate` | Generate morning briefing |
| GET | `/api/briefing/:ownerId` | Get today's briefing |
| GET | `/api/briefing/:ownerId/history` | Get briefing history |
| POST | `/api/briefing/:id/delivered` | Mark as delivered |
| POST | `/api/briefing/:id/read` | Mark as read |

---

## Data Model

### GroceryBriefing
```javascript
{
  briefing_id: String,           // "BRIEF-20260613-freshmart-hsr"
  store_id: String,
  owner_id: String,
  date: Date,
  financial: {
    revenue: { yesterday, today_target, week_to_date, month_to_date, trend },
    orders: { yesterday, today, average },
    average_order_value: { yesterday, trend },
    margin: { gross, net }
  },
  customers: {
    total, new, returning,
    satisfaction_score: { value, trend },
    complaints, ratings
  },
  inventory: {
    health_percentage,
    low_stock_items, out_of_stock, expiring_soon,
    waste_value, reorder_needed
  },
  delivery: { orders, on_time_rate, average_time, failed_deliveries },
  insights: [{ type, title, description, metric, value }],
  recommendations: [{ priority, category, title, description, action }],
  generated_text: String
}
```

---

## Sample Briefing Output

```
Good Morning Ramesh.

Revenue Yesterday: ₹3.4 Lakhs
Top Category: Dairy
Customer Satisfaction: 4.8
Inventory Health: 94%
Delivery Demand: Increasing

✅ Revenue is trending up!

⚠️ 5 items expiring soon - Quick Sale recommended

Recommended Actions: 4
```

---

## Integration

### With REZ-Grocery
- Fetches revenue data
- Gets inventory metrics
- Connects to store operations

### With RIDZA
- Pulls financial data
- Gets margin calculations

### With Genie
- Schedules 8AM delivery
- Sends to owner via notification

---

## Development

```bash
cd hojai-grocery-briefing-service
npm install
npm start  # Port 4708
npm run dev  # Development mode
```

---

**Last Updated:** June 13, 2026
