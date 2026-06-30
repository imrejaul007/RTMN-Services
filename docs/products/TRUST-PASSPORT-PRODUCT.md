# Trust Passport - Product Package

> **Product Name:** HOJAI Trust Passport
> **Category:** Trust Infrastructure / Commerce
> **Pricing:** ₹10,000/month (Basic), ₹35,000/month (Business), ₹1L/month (Enterprise)
> **Status:** ✅ READY TO SELL

---

## Product Overview

**Trust Passport** is portable trust credentials for merchants, customers, and AI agents. It creates verifiable trust scores across dimensions (reliability, competence, integrity, responsiveness) and unlocks economic benefits.

---

## What You Get

### Trust Scoring
- 4-dimensional trust score (0-100)
- Trust levels: Platinum, Gold, Silver, Bronze, Iron, Restricted
- Real-time updates based on interactions

### Trust Badges
- Verifiable credentials
- Cross-network portability
- Industry-specific badges

### Economic Benefits
- Fee reductions (up to 50% for Platinum)
- Faster payouts
- Priority support
- Trust multipliers

### Verification API
- Instant trust verification
- Webhook notifications
- Audit trail

---

## Trust Levels

| Level | Score | Badge | Fee Reduction | Payout Speed |
|-------|-------|-------|---------------|---------------|
| Platinum | 90-100 | 🏆 | 50% | Instant |
| Gold | 80-89 | ⭐ | 30% | Same-day |
| Silver | 70-79 | 🥈 | 15% | 24h |
| Bronze | 50-69 | 🥉 | 0% | 48h |
| Iron | 30-49 | ⚙️ | +10% fee | 72h |
| Restricted | 0-29 | ⚠️ | +25% fee | Manual |

---

## Target Customers

### Primary
1. **Marketplace sellers** - Build trust with buyers
2. **Service providers** - Differentiate from competitors
3. **Gig economy platforms** - Trust-based matching

### Secondary
1. **B2B marketplaces** - Supplier verification
2. **P2P platforms** - Couchsurfing, car sharing
3. **Freelance platforms** - Client trust

---

## Competitors & Positioning

| Competitor | Weakness | Our Advantage |
|------------|----------|---------------|
| eBay Feedback | Basic 1-5 stars | Multi-dimensional trust |
| Airbnb Trust | Platform-specific | Portable across networks |
| Upwork Rising Talent | Manual | Real-time, automated |
| LinkedIn Endorsements | Social pressure | Behavioral verification |

**Positioning:** "The trust score that travels with you across every marketplace."

---

## Sales Deck (10 slides)

### Slide 1: Hook
**"What if a 5-star seller on Amazon was also trusted on Flipkart, Airbnb, and Uber?"**

### Slide 2: Problem
- Trust doesn't transfer between platforms
- Bad actors move between marketplaces
- New sellers start with zero credibility
- Verification is slow and expensive

### Slide 3: Solution
Trust Passport = Portable trust credentials that follow merchants, customers, and agents across networks.

### Slide 4: How It Works
```
Interaction → Trust Update → Passport Score → Economic Benefits
    ↓              ↓                ↓              ↓
  Transaction   Real-time       Verifiable      Lower fees
               scoring         credential      Faster payouts
```

### Slide 5: Trust Dimensions
- **Reliability** (30% weight) - On-time delivery, commitments
- **Competence** (25% weight) - Quality, expertise
- **Integrity** (25% weight) - Honesty, transparency
- **Responsiveness** (20% weight) - Communication speed

### Slide 6: Benefits by Level
| Level | Fees | Payout | Support |
|-------|------|--------|---------|
| Platinum | -50% | Instant | Priority |
| Gold | -30% | Same-day | Priority |
| Silver | -15% | 24h | Standard |
| Bronze | 0% | 48h | Standard |

### Slide 7: Integration
```javascript
// Before transaction
const trust = await trustPassport.verify(sellerId);

if (trust.trustLevel === 'restricted') {
  return { action: 'hold_escrow', reason: 'Trust verification failed' };
}

const adjustedPrice = basePrice * trust.multiplier;
```

### Slide 8: Pricing
| Tier | Price | Verifications | Badge Display |
|------|--------|---------------|---------------|
| Basic | ₹10K/mo | 1K/month | Platform badge |
| Business | ₹35K/mo | 10K/month | Profile + API |
| Enterprise | ₹1L/mo | Unlimited | Full passport |

### Slide 9: Case Study
**Platform:** Craft marketplace in Mumbai
**Problem:** 30% new seller drop-off
**Solution:** Trust Passport onboarding bonus
**Result:** 50% improvement in seller activation

### Slide 10: CTA
**Get Trust Passport**
*"Build trust that travels with you."*

---

## Demo Script

### 1. Create Passport
```bash
curl -X POST http://localhost:4980/passport \
  -d '{
    "entityId": "seller_123",
    "entityType": "merchant",
    "dimensions": {
      "reliability": 95,
      "competence": 88,
      "integrity": 92,
      "responsiveness": 85
    }
  }'
```

### Response
```json
{
  "passport": {
    "id": "hojai:seller_123",
    "overallTrust": 90,
    "trustLevel": "platinum",
    "badge": "🏆",
    "multiplier": 1.5,
    "benefits": [
      { "type": "fee_reduction", "value": "50%" },
      { "type": "payout_speed", "value": "instant" }
    ]
  }
}
```

### 2. Verify Trust
```bash
curl -X POST http://localhost:4980/verify \
  -d '{
    "passportId": "hojai:seller_123",
    "verifierId": "buyer_456",
    "purpose": "transaction"
  }'
```

---

## Objection Handling

| Objection | Response |
|-----------|----------|
| "We have our own trust system" | "Great! You could be our first verified seller." |
| "Privacy concerns" | "Only public trust scores. Private data stays with you." |
| "How do you prevent gaming?" | "Multi-source verification + AI anomaly detection." |
| "Why pay for trust?" | "50% fee reduction pays for itself in one transaction." |

---

## Go-to-Market

### Month 1: Seed
- Partner with 3 niche marketplaces
- Free tier for marketplace operators
- Integration with 1 major platform

### Month 2-3: Grow
- API launch for developers
- Trust badge program
- Partnership with logistics providers

### Month 4-6: Scale
- Enterprise sales team
- Cross-border trust network
- $50K ARR target

---

## Files

| File | Purpose |
|------|---------|
| This doc | Product strategy |
| SALES-DECK.pptx | Investor/sales deck |
| API-REFERENCE.md | Technical docs |
| PARTNER-TERMS.md | Marketplace partnership |
