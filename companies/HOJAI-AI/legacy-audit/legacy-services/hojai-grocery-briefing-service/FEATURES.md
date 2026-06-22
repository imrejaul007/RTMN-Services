# FEATURES.md - HOJAI Grocery Briefing Service

**Last Updated:** June 13, 2026  
**FreshMart Story:** 8AM - "Good Morning Ramesh. Revenue Yesterday: ₹3.4 Lakhs"

---

## Overview

The Grocery Briefing Service generates daily briefings for grocery store owners, providing actionable insights about revenue, customers, inventory, and delivery performance.

---

## Features

### 1. Financial Metrics

| Feature | Description | Data Source |
|---------|-------------|-------------|
| Revenue Yesterday | Daily revenue | RIDZA |
| Revenue Target | Today's target | Store settings |
| Week-to-Date | Weekly cumulative | RIDZA |
| Month-to-Date | Monthly cumulative | RIDZA |
| Revenue Trend | Up/Down/Stable | Calculation |
| Average Order Value | AOV trend | RIDZA |
| Gross Margin | Gross profit % | RIDZA |
| Net Margin | Net profit % | RIDZA |

### 2. Customer Metrics

| Feature | Description |
|---------|-------------|
| Total Customers | Unique customers today |
| New Customers | First-time visitors |
| Returning Customers | Repeat customers |
| Satisfaction Score | 1-5 scale |
| Satisfaction Trend | Up/Down |
| Complaints | Issue tickets |
| Ratings Average | Review score |
| Ratings Count | Total reviews |

### 3. Inventory Metrics

| Feature | Description |
|---------|-------------|
| Health Percentage | Stock freshness % |
| Low Stock Items | Below reorder point |
| Out of Stock | Zero inventory items |
| Expiring Soon | Items expiring < 72hrs |
| Waste Value | Spoilage cost |
| Reorder Needed | Items needing purchase |

### 4. Delivery Metrics

| Feature | Description |
|---------|-------------|
| Orders | Delivery orders today |
| On-Time Rate | % delivered on time |
| Average Time | Avg delivery minutes |
| Failed Deliveries | Cancelled/failed |

### 5. AI Insights

| Type | Description | Example |
|------|-------------|---------|
| Positive | Good performance | "Revenue up 15%" |
| Negative | Issues to address | "Stock out on 2 items" |
| Opportunity | Growth potential | "Bulk order opportunity" |
| Alert | Urgent action needed | "3 items expiring today" |

### 6. Recommendations

| Priority | Description | Action |
|----------|-------------|--------|
| HIGH | Urgent action | View and act now |
| MEDIUM | Important | Review soon |
| LOW | Nice to have | Consider when free |

---

## API Endpoints

### Generate Briefing
```bash
POST /api/briefing/generate
{
  "ownerId": "ramesh-001",
  "storeId": "freshmart-hsr",
  "date": "2026-06-13"
}
```

### Get Briefing
```bash
GET /api/briefing/:ownerId
GET /api/briefing/:ownerId?date=2026-06-13
```

### Get History
```bash
GET /api/briefing/:ownerId/history?days=7
```

### Mark Status
```bash
POST /api/briefing/:briefingId/delivered
POST /api/briefing/:briefingId/read
```

---

## Sample Briefing

```json
{
  "briefing_id": "BRIEF-20260613-freshmart-hsr",
  "owner_id": "ramesh-001",
  "store_id": "freshmart-hsr",
  "date": "2026-06-13T00:00:00.000Z",
  "financial": {
    "revenue": {
      "yesterday": 340000,
      "today_target": 350000,
      "week_to_date": 2400000,
      "month_to_date": 10200000,
      "trend": "up"
    },
    "orders": {
      "yesterday": 245,
      "today": 23,
      "average": 230
    },
    "average_order_value": {
      "yesterday": 1388,
      "trend": "up"
    },
    "margin": {
      "gross": 28.5,
      "net": 12.3
    }
  },
  "customers": {
    "total": 158,
    "new": 12,
    "returning": 146,
    "satisfaction_score": {
      "value": 4.8,
      "trend": "up"
    },
    "complaints": 2,
    "ratings": {
      "average": 4.6,
      "count": 892
    }
  },
  "inventory": {
    "health_percentage": 94,
    "low_stock_items": 8,
    "out_of_stock": 2,
    "expiring_soon": 5,
    "waste_value": 2500,
    "reorder_needed": 12
  },
  "delivery": {
    "orders": 87,
    "on_time_rate": 96.5,
    "average_time": 28,
    "failed_deliveries": 2
  },
  "insights": [
    {
      "type": "positive",
      "category": "financial",
      "title": "Revenue Up 📈",
      "description": "Revenue increased from yesterday",
      "metric": "Revenue",
      "value": "₹3.4L"
    },
    {
      "type": "opportunity",
      "category": "inventory",
      "title": "Quick Sale Opportunity 💰",
      "description": "5 items expiring soon",
      "metric": "Expiring",
      "value": "5"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "category": "inventory",
      "title": "Launch Quick Sale",
      "description": "Run markdown campaign for expiring items",
      "action": "Start quick sale",
      "estimated_impact": "Save ₹2,500"
    }
  ],
  "generated_text": "Good Morning Ramesh.\n\nRevenue Yesterday: ₹3.4 Lakhs\nTop Category: Dairy\nCustomer Satisfaction: 4.8\nInventory Health: 94%\nDelivery Demand: Increasing\n\n✅ Revenue is trending up!\n\n⚠️ 5 items expiring soon - Quick Sale recommended\n\nRecommended Actions: 4"
}
```

---

## Integration Points

### Data Sources
| Service | Data |
|---------|------|
| RIDZA | Revenue, margins, orders |
| REZ-Grocery | Inventory, stock levels |
| Customer Twin | Satisfaction, ratings |
| Delivery Service | On-time rates |

### Output Targets
| Service | Delivery |
|---------|---------|
| Genie | Owner notification |
| WhatsApp | Message |
| Push | Mobile notification |
| Email | Daily digest |

---

## FreshMart 8AM Flow

```
8:00 AM - Scheduled Briefing Generation
    ↓
Generate Briefing for Ramesh
    ↓
Fetch from RIDZA: Revenue ₹3.4L, Margin 28%
    ↓
Fetch from REZ-Grocery: Health 94%, 5 expiring
    ↓
Fetch from Customer Twin: Satisfaction 4.8
    ↓
Generate AI Insights
    ↓
Create Recommendations
    ↓
Generate Text
    ↓
Deliver via Genie → Ramesh's phone ✅
```

---

**Last Updated:** June 13, 2026
