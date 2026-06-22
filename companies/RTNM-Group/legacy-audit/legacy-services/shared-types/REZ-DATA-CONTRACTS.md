# REZ Data Contracts

## Version: 1.0.0
## Last Updated: 2026-05-01

---

## Event Schema

### Base Event
```typescript
interface BaseEvent {
  event_id: string;        // UUID
  event_type: string;      // 'inventory.low' | 'order.completed' | etc
  correlation_id: string;   // UUID - links entire flow
  source: string;          // Service that emitted event
  timestamp: string;       // ISO 8601
  version: string;         // Schema version
}
```

### Inventory Low Event
```typescript
interface InventoryLowEvent extends BaseEvent {
  data: {
    merchant_id: string;
    item_id: string;
    item_name?: string;
    current_stock: number;
    threshold: number;
    avg_daily_sales?: number;
    recent_orders_last_3_days?: number;
    unit_price?: number;
    last_reorder_date?: string;
  }
}
```

### Order Completed Event
```typescript
interface OrderCompletedEvent extends BaseEvent {
  data: {
    order_id: string;
    merchant_id: string;
    customer_id: string;
    items: Array<{
      item_id: string;
      quantity: number;
      price: number;
    }>;
    total_amount: number;
    payment_method: string;
  }
}
```

---

## Decision Schema

### Base Decision
```typescript
interface BaseDecision {
  decision_id: string;          // UUID
  correlation_id: string;        // Links to event
  event_type: string;
  decision: string;              // 'draft_po_suggested' | etc
  confidence: number;            // 0.0 - 1.0
  action_level: string;           // 'SAFE' | 'SEMI_SAFE' | 'RISKY'
  recommendation: string;        // 'auto_execute' | 'suggest' | 'block'
  timestamp: string;
}
```

### Inventory Decision
```typescript
interface InventoryDecision extends BaseDecision {
  data: {
    item_id: string;
    item_name?: string;
    merchant_id: string;
    current_stock: number;
    threshold: number;
    suggested_quantity: number;
    base_quantity: number;
    unit_price: number;
    estimated_value: number;
    final_quantity?: number;     // After safety caps
    safety_capped: boolean;
    cap_reason?: string;
  }
}
```

---

## Feedback Schema

### Base Feedback
```typescript
interface BaseFeedback {
  feedback_id: string;
  correlation_id: string;       // Links to decision
  decision_id?: string;
  outcome: 'approved' | 'rejected' | 'modified' | 'ignored' | 'pending';
  confidence: number;
  timestamp: string;
}
```

### Feedback with Modifications
```typescript
interface FeedbackWithModifications extends BaseFeedback {
  modifications?: {
    suggested: { quantity: number };
    final: { quantity: number };
  };
  delta_percent?: number;
  modification_direction?: 'up' | 'down' | 'neutral';
  reason_category?: 'high_demand' | 'low_trust' | 'constraint' | 'preference' | 'habit';
  reason_detail?: string;
}
```

---

## User Profile Schema

### UserProfile
```typescript
interface UserProfile {
  user_id: string;
  preferences: {
    cuisines: string[];
    price_range: 'budget' | 'medium' | 'premium';
    time_pattern: string;
    dietary_restrictions: string[];
  };
  intent_signals: {
    current_intent: string;
    intent_confidence: number;
    purchase_probability: number;
  };
  behavior: {
    frequency: string;
    avg_order_value: number;
    engagement_level: 'low' | 'medium' | 'high';
  };
  segments: string[];
  lifetime_value: number;
  churn_risk: 'low' | 'medium' | 'high';
  updated_at: string;
}
```

---

## Merchant Profile Schema

### MerchantProfile
```typescript
interface MerchantProfile {
  merchant_id: string;
  demand_pattern: string;
  customer_types: string[];
  pricing_behavior: string;
  insights: {
    health_score: number;       // 0-100
    growth_score: number;
    engagement_score: number;
  };
  recommendations: string[];
  segments: string[];
  updated_at: string;
}
```

---

## Service Contracts

### Event Platform → Action Engine
```
POST /webhook/events
Content-Type: application/json

{
  "event": InventoryLowEvent
}

Response: 200 OK
{ "received": true }
```

### Action Engine → Feedback Service
```
POST {FEEDBACK_SERVICE}/feedback
Content-Type: application/json

{
  "correlation_id": string,
  "decision": Decision,
  "confidence": number
}

Response: 201 Created
{ "feedback_id": string }
```

### Intelligence Hub ↔ All Services
```
GET /profile/user/:userId
POST /profile/user
GET /profile/merchant/:merchantId
POST /profile/merchant

All read/write through Intelligence Hub only.
```

---

## Feature Flags Contract

```typescript
interface FeatureFlags {
  // Core
  learning_enabled: boolean;        // Default: false
  adaptive_enabled: boolean;         // Default: false
  
  // Intelligence
  personalization_enabled: boolean; // Default: true
  recommendations_enabled: boolean; // Default: true
  intent_prediction_enabled: boolean; // Default: true
  
  // Delivery
  ads_enabled: boolean;             // Default: false
  push_enabled: boolean;            // Default: true
  email_enabled: boolean;           // Default: true
  
  // Safety
  auto_execute_safe: boolean;      // Default: true
  require_approval_risky: boolean;  // Default: true
  rollback_enabled: boolean;         // Default: true
}
```

---

## Safety Thresholds

```typescript
const SAFETY_THRESHOLDS = {
  RISKY: {
    max_new_item_decisions: 5,
    min_confidence: 0.7
  },
  SEMI_SAFE: {
    min_confidence: 0.7,
    min_decisions: 5
  },
  SAFE: {
    min_confidence: 0.9,
    min_approval_rate: 0.8,
    min_decisions: 10
  }
};

const SAFETY_CAPS = {
  max_quantity: 50,
  max_value_inr: 100000,
  max_delta_percent: 50
};
```

---

## Rollback Triggers

```typescript
const ROLLBACK_CONFIG = {
  check_window: 50,              // decisions
  min_decisions: 30,
  max_acceptable_drop: 0.05,     // 5%
  auto_disable: false             // Set to true for auto-rollback
};
```

---

## Observability Events

Every service must emit:

```typescript
interface ObservabilityEvent {
  timestamp: string;
  correlation_id: string;
  service: string;
  event: 'started' | 'received' | 'processed' | 'error' | 'warning';
  details: Record<string, any>;
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-05-01 | Initial contracts |
