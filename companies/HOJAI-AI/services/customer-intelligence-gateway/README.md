# Customer Intelligence Gateway

**Port:** 4896  
**Purpose:** Unified API entry point for all customer intelligence modules. Provides a single endpoint for full customer analysis combining trust, COD, returns, support, sales, loyalty, communication, and recommendations.

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │   Customer Intelligence Gateway      │
                    │            (Port 4896)               │
                    └─────────────────────────────────────┘
                                         │
        ┌──────────────┬─────────────────┼─────────────────┬──────────────┐
        │              │                 │                 │              │
        ▼              ▼                 ▼                 ▼              ▼
   ┌─────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌────────────┐
   │  Trust  │  │   COD    │  │ Return Risk  │  │ Support   │  │   Sales    │
   │ Score   │  │ Intel.   │  │   Engine     │  │ Intelli.  │  │ Intelli.   │
   │ (4897)  │  │  (4898)  │  │   (4899)     │  │  (4900)   │  │  (4901)    │
   └─────────┘  └──────────┘  └──────────────┘  └───────────┘  └────────────┘
        │              │                 │                 │              │
        └──────────────┴─────────────────┼─────────────────┴──────────────┘
                                        ▼
                               ┌─────────────────┐
                               │  Customer Twin  │
                               │    (4895)       │
                               └─────────────────┘
```

## API Endpoints

### Full Customer Analysis
```
POST /api/customer/analyze
```
Returns complete customer intelligence in one call.

### Individual Modules

| Endpoint | Port | Purpose |
|----------|------|---------|
| `POST /api/trust/score` | 4897 | Trust score calculation |
| `POST /api/cod/recommend` | 4898 | COD allow/block decision |
| `POST /api/returns/risk` | 4899 | Return abuse detection |
| `POST /api/support/profile` | 4900 | Support priority & tone |
| `POST /api/sales/preferences` | 4901 | Selling recommendations |
| `POST /api/loyalty/profile` | 4904 | LTV tier & loyalty score |
| `POST /api/recommend` | 4902 | Personalized recommendations |
| `POST /api/graph/relationships` | 4903 | Customer relationship graph |
| `POST /api/communication/preferences` | 4905 | Channel preferences |

### Health Check
```
GET /health
```

## Example Request

```javascript
// Full customer analysis
const response = await fetch('http://localhost:4896/api/customer/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+919876543210',
    orderHistory: { total: 25, completed: 23, returned: 2 },
    supportHistory: { tickets: 2, escalations: 0 },
    accountAge: 180,
    paymentHistory: { successful: 23, failed: 2 },
    addressHistory: { changes90d: 1, verified: true }
  })
});

// Response
{
  customer_id: 'cust_abc123',
  trust_score: 85,
  cod_recommendation: { allowed: true, confidence: 94 },
  return_risk: { risk: 'low' },
  support_profile: { priority: 'normal' },
  selling_preferences: { premium_buyer: true },
  loyalty: { ltv_tier: 'gold' },
  communication: { preferred_channel: 'whatsapp' },
  segments: { value: 'vip' }
}
```

## Start

```bash
npm install
npm start
# http://localhost:4896/health
```

## Tests

```bash
npm test
```

## Related Services

| Service | Port | Description |
|---------|------|-------------|
| customer-twin | 4895 | Customer digital twin |
| trust-score-service | 4897 | Trust scoring engine |
| cod-intelligence | 4898 | COD recommendations |
| return-risk-engine | 4899 | Return abuse detection |
| support-intelligence | 4900 | Support profiling |
| sales-intelligence | 4901 | Sales recommendations |
| loyalty-intelligence | 4904 | LTV and loyalty |
| recommendation-engine | 4902 | Personalized recommendations |
| customer-graph | 4903 | Relationship graph |
| communication-preference | 4905 | Channel preferences |

## Privacy-First Design

This SDK follows the privacy-first principle:
- **Input:** Private customer data (stays with merchant)
- **Output:** Intelligence signals only (trust scores, recommendations)
- **No raw data leakage** between merchants
