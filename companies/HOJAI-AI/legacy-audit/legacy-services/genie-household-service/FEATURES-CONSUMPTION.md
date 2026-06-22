# FreshMart Consumption Tracking Feature

## Overview

**FreshMart Story:** 7AM - "Genie notices Karim's household is low on milk, eggs, vegetables"

**Purpose:** Track household grocery consumption and generate reorder suggestions

---

## Models Added

### 1. HouseholdInventoryItem
Tracks current stock levels of grocery items in a household.

```typescript
{
  household_id: string,
  sku: string,
  name: string,
  category: 'dairy' | 'produce' | 'bakery' | ...,
  current_quantity: number,
  unit: 'liters' | 'kg' | 'packets' | ...,
  reorder_threshold: number,  // days of supply
  typical_consumption_rate: number,  // per day
  days_until_empty: number,  // calculated
  status: 'well_stocked' | 'running_low' | 'critical' | 'out_of_stock'
}
```

### 2. ConsumptionLog
Tracks each consumption event for pattern analysis.

```typescript
{
  household_id: string,
  sku: string,
  quantity_consumed: number,
  source: 'manual' | 'smart_device' | 'order',
  context: { meal, occasion, weather }
}
```

### 3. ReorderSuggestion
Generated suggestions for reordering items.

```typescript
{
  household_id: string,
  sku: string,
  days_until_empty: number,
  message: "Milk running low (2 days left). Shall I reorder?",
  status: 'pending' | 'approved' | 'dismissed' | 'ordered'
}
```

### 4. ConsumptionPattern
Analyzes consumption patterns for forecasting.

```typescript
{
  household_id: string,
  sku: string,
  daily_average: number,
  weekend_average: number,  // Sat-Sun
  weekday_average: number,   // Mon-Fri
  weather_impact: { rain, hot, cold },
  festival_impact: { Diwali: 1.5, Eid: 1.3 }
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/consumption/inventory/:householdId` | Get household inventory |
| POST | `/api/consumption/inventory` | Add item to inventory |
| PATCH | `/api/consumption/inventory/:itemId` | Update item |
| DELETE | `/api/consumption/inventory/:itemId` | Remove item |
| GET | `/api/consumption/low-stock/:householdId` | Get items needing reorder |
| POST | `/api/consumption/suggestions/generate` | Generate reorder suggestions |
| GET | `/api/consumption/suggestions/:userId` | Get pending suggestions |
| POST | `/api/consumption/suggestions/:id/approve` | Approve reorder |
| POST | `/api/consumption/suggestions/:id/dismiss` | Dismiss suggestion |
| POST | `/api/consumption/log` | Log consumption event |
| GET | `/api/consumption/log/:householdId` | Get consumption history |

---

## FreshMart 7AM Flow

```
7:00 AM - Genie Morning Briefing
    ↓
GET /api/consumption/low-stock/karim-household
    ↓
Response: [
  { name: "Milk", status: "running_low", days_until_empty: 2 },
  { name: "Eggs", status: "running_low", days_until_empty: 3 },
  { name: "Vegetables", status: "critical", days_until_empty: 1 }
]
    ↓
Genie asks: "Milk running low (2 days left), Eggs running low, Vegetables critical.
            Shall I reorder weekly groceries?"
    ↓
Karim clicks: YES
    ↓
POST /api/consumption/suggestions/:id/approve
    ↓
Order created → REZ-Mart → Delivery scheduled ✅
```

---

## Integration

### With genie-briefing-service (7AM)
- genie-briefing-service calls `/api/consumption/low-stock/:householdId`
- Results included in morning briefing

### With REZ-Mart
- After approval, order sent to REZ-Mart for fulfillment
- Delivery via Do App

### With ConsumptionLog
- After consumption, log sent to `/api/consumption/log`
- Updates inventory and calculates new days_until_empty

---

**Last Updated:** June 13, 2026
