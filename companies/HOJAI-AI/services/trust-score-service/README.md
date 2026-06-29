# Trust Score Service

**Port:** 4897  
**Purpose:** Customer trust scoring for commerce

## API

```
POST /api/trust/score
  Input: { orderHistory, accountAge, paymentHistory }
  Output: { score: 0-100, level: 'low'|'medium'|'high'|'trusted', badge }

GET /api/trust/history/:customerId
```

## Algorithm

```
trust_score = 
  (order_completion_rate * 0.3) +
  (return_rate * -0.2) +
  (account_age_factor * 0.15) +
  (payment_history * 0.2)
```
