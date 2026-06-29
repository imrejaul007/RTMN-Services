# Loyalty Intelligence Service

**Port:** 4904  
**Purpose:** Calculates customer lifetime value (LTV), loyalty tiers, and churn probability to optimize retention strategies.

## API

```
POST /api/loyalty/profile
```

### Input

```javascript
{
  purchaseHistory: {
    totalSpend: 125000,
    orderCount: 50,
    avgOrderValue: 2500
  },
  engagementHistory: {
    logins: 120,
    referrals: 8
  },
  loyaltyPoints: {
    earned: 5000,
    redeemed: 2000
  }
}
```

### Output

```javascript
{
  ltv_tier: "platinum",
  churn_probability: 0.08,
  loyalty_score: 92,
  lifetime_value: 125000,
  engagement_score: 85,
  referral_potential: "high",
  next_reward: "Free delivery + 500 points",
  renewal_probability: 0.95
}
```

## LTV Tiers

| Tier | Lifetime Value | Score Range |
|------|---------------|-------------|
| Platinum | > 100,000 | 90+ |
| Gold | 50,000-100,000 | 75-89 |
| Silver | 20,000-50,000 | 60-74 |
| Bronze | 5,000-20,000 | 40-59 |
| Basic | < 5,000 | 0-39 |

## Start

```bash
npm install
npm start
# http://localhost:4904/health
```

## Tests

```bash
npm test
```

## Related

- Gateway: `services/customer-intelligence-gateway` (4896)
- Customer Twin: `platform/twins/customer-twin` (4895)
- REZ Wallet: `services/REZ-Wallet` (4004)
