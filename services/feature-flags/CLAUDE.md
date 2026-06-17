# Feature Flags Service

**Port:** 4990
**Status:** Ready for Development
**Purpose:** Feature flag system for gradual rollouts in RTMN ecosystem

---

## Overview

The Feature Flags Service provides a centralized system for managing feature toggles across the RTMN ecosystem. It supports:

- Boolean and multi-variant feature flags
- Percentage-based gradual rollouts
- User targeting rules
- Consistent bucketing for stable evaluation
- Usage analytics and tracking

---

## API Endpoints

### Health Check
```
GET /health
```

### Feature Flags (CRUD)
```
GET    /api/flags              # List all flags
GET    /api/flags/stats        # Flag statistics
GET    /api/flags/:key         # Get flag by key
POST   /api/flags              # Create flag
PUT    /api/flags/:id          # Update flag
DELETE /api/flags/:id          # Delete flag
POST   /api/flags/:id/toggle   # Toggle enabled status
POST   /api/flags/:id/rules    # Add targeting rule
DELETE /api/flags/:id/rules/:ruleId  # Remove targeting rule
PATCH  /api/flags/:id/rollout  # Update rollout percentage
POST   /api/flags/:id/clone    # Clone to another environment
```

### Flag Evaluation
```
POST   /api/evaluate           # Evaluate single flag
POST   /api/evaluate/batch     # Evaluate multiple flags
POST   /api/evaluate/all       # Evaluate all flags
POST   /api/evaluate/variant   # Evaluate multi-variant flag
GET    /api/evaluate/sdk-keys  # Get all flag keys for SDK
```

### Analytics
```
GET    /api/analytics/overview     # Overview statistics
GET    /api/analytics/flag/:key    # Flag-specific analytics
GET    /api/analytics/comparison  # Compare multiple flags
GET    /api/analytics/recent       # Recent evaluation logs
DELETE /api/analytics/clear        # Clear evaluation logs
```

---

## Data Models

### Feature Flag
```typescript
interface Flag {
  id: string;
  key: string;                    // Unique identifier (kebab-case)
  name: string;
  description: string;
  enabled: boolean;
  defaultValue: boolean | string | number | object;
  variantType: 'boolean' | 'string' | 'number' | 'json';
  variants?: Record<string, boolean | string | number | object>;
  targetingRules: TargetingRule[];
  rollouts: {
    percentage: number;          // 0-100
    startDate?: string;          // ISO date
    endDate?: string;            // ISO date
  };
  tags: string[];
  environment: 'development' | 'staging' | 'production';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

### Targeting Rule
```typescript
interface TargetingRule {
  id: string;
  attribute: string;             // Context attribute to check
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: string | number | string[] | number[];
}
```

### Evaluation Context
```typescript
interface EvaluationContext {
  userId?: string;
  anonymousId?: string;
  attributes: Record<string, string | number | boolean | string[]>;
  environment: 'development' | 'staging' | 'production';
}
```

---

## Usage Examples

### Create a Boolean Flag
```bash
curl -X POST http://localhost:4990/api/flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-checkout-flow",
    "name": "New Checkout Flow",
    "description": "Enables the redesigned checkout experience",
    "enabled": true,
    "defaultValue": false,
    "variantType": "boolean",
    "environment": "production",
    "tags": ["checkout", "ux"]
  }'
```

### Create a Multi-Variant Flag
```bash
curl -X POST http://localhost:4990/api/flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "pricing-strategy",
    "name": "Pricing Strategy",
    "description": "A/B test different pricing approaches",
    "enabled": true,
    "defaultValue": "control",
    "variantType": "string",
    "variants": {
      "control": 0,
      "variant-a": 10,
      "variant-b": 10
    },
    "environment": "production"
  }'
```

### Evaluate a Flag
```bash
curl -X POST http://localhost:4990/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "new-checkout-flow",
    "context": {
      "userId": "user-123",
      "attributes": {
        "plan": "premium",
        "country": "US"
      },
      "environment": "production"
    }
  }'
```

### Batch Evaluation
```bash
curl -X POST http://localhost:4990/api/evaluate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "flagKeys": ["new-checkout-flow", "pricing-strategy"],
    "context": {
      "userId": "user-123",
      "attributes": {"plan": "premium"},
      "environment": "production"
    }
  }'
```

### Gradual Rollout (10%)
```bash
curl -X PATCH http://localhost:4990/api/flags/{id}/rollout \
  -H "Content-Type: application/json" \
  -d '{
    "percentage": 10,
    "startDate": "2026-06-01T00:00:00Z"
  }'
```

### Add Targeting Rule
```bash
curl -X POST http://localhost:4990/api/flags/{id}/rules \
  -H "Content-Type: application/json" \
  -d '{
    "attribute": "plan",
    "operator": "eq",
    "value": "premium"
  }'
```

---

## Evaluation Reasons

| Reason | Description |
|--------|-------------|
| `FLAG_DISABLED` | Flag is globally disabled |
| `ROLLOUT_NOT_STARTED` | Rollout hasn't started yet |
| `ROLLOUT_ENDED` | Rollout has ended |
| `ROLLOUT_EXCLUDED` | User not in rollout percentage |
| `ROLLOUT_MATCH` | User in rollout, flag enabled |
| `RULE_MATCH: {id}` | Targeting rule matched |
| `VARIANT: {key}` | Multi-variant flag, returned variant |
| `FLAG_NOT_FOUND` | Flag doesn't exist |

---

## Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `plan eq "premium"` |
| `neq` | Not equals | `country neq "US"` |
| `gt` | Greater than | `age gt 18` |
| `lt` | Less than | `orders lt 5` |
| `gte` | Greater than or equal | `score gte 100` |
| `lte` | Less than or equal | `balance lte 0` |
| `in` | In array | `country in ["US", "UK"]` |
| `nin` | Not in array | `plan nin ["trial"]` |
| `contains` | String contains | `email contains "@company"` |
| `regex` | Regex match | `userAgent regex "Chrome/.*"` |

---

## Environment Variables

```
PORT=4990
NODE_ENV=development
LOG_LEVEL=info
# SERVICE_REGISTRY_URL=http://localhost:4399
```

---

## Service Integration

Register with service registry at startup for discovery:
- Service Registry: `http://localhost:4399`
- Event Bus: `http://localhost:4510`

---

## Local Development

```bash
cd services/feature-flags
npm install
npm run dev
```

---

*Last Updated: June 16, 2026*
