# REZ Ecosystem — Revenue Model

**Document Version:** 1.0
**Date:** 2026-04-30
**Classification:** Confidential

---

## Executive Summary

REZ generates revenue through multiple streams across its super-app ecosystem:

| Revenue Stream | Description | Revenue Share |
|---------------|-------------|---------------|
| **Wallet Transfers** | Commission on P2P transfers | 0.5-1% |
| **Hotel Bookings** | Commission on OTA bookings | 10-15% |
| **Merchant Payments** | Transaction fees | 1.5-2% |
| **Subscription (NextaBiZ) | Monthly SaaS fees | Tiered |
| **White-label Licensing | Enterprise deals | Custom |
| **Coin Mining | Internal currency | N/A (cost center) |

---

## Revenue Streams

### 1. Wallet Transfers (RTMN Coin)

**Commission Rate:** 0.5% - 1% per transaction

**Model:**
```
Sender pays 1% fee
REZ keeps 0.5-1%
Recipient receives 99-99.5%
```

**Examples:**
| Transaction | Amount | REZ Fee | REZ Revenue |
|-------------|--------|----------|-------------|
| P2P Transfer | ₹1,000 | ₹10 | ₹5 |
| Merchant Payment | ₹10,000 | ₹100 | ₹50 |
| Settlement Payout | ₹1,00,000 | ₹1,000 | ₹500 |

### 2. Hotel OTA Bookings

**Commission Rate:** 10-15% of booking value

**Model:**
```
Hotel sets commission rate (default 12%)
REZ takes commission
Hotel receives 85-90%
```

**Examples:**
| Booking | Room Rate | Commission | REZ Revenue |
|---------|-----------|------------|-------------|
| Budget hotel | ₹2,000/night | ₹240 (12%) | ₹240 |
| Premium hotel | ₹10,000/night | ₹1,200 (12%) | ₹1,200 |

### 3. Merchant Payments (POS)

**Transaction Fee:** 1.5% - 2% per transaction

**Model:**
```
Merchant receives 98-98.5%
REZ takes 1.5-2%
Payment gateway takes ~2%
```

**UPI/QR Payments:**
| Transaction | Amount | REZ Share |
|-------------|--------|------------|
| Small merchant | ₹500 | ₹7.50 (1.5%) |
| Enterprise | ₹1,00,000 | ₹1,500 (1.5%) |

### 4. NextaBiZ Subscription

**Monthly SaaS Fees:**

| Plan | Price | Users | Features |
|------|-------|-------|----------|
| Starter | ₹999/month | 1 | Basic POS, inventory |
| Growth | ₹2,999/month | 5 | + Analytics, multi-outlet |
| Enterprise | ₹9,999/month | Unlimited | + API, white-label |

### 5. White-label / B2B2C

**Licensing Model:**

| Model | Pricing | Notes |
|-------|---------|-------|
| White-label | ₹50,000-5,00,000/month | Full customization |
| API access | ₹10,000-1,00,000/month | Based on volume |
| Embed SDK | Revenue share | 20-30% of transaction |

---

## Cost Structure

### Platform Costs

| Cost | Monthly | Notes |
|------|---------|-------|
| Cloud (Render, Vercel) | ₹50,000-2,00,000 | Based on usage |
| MongoDB Atlas | ₹20,000-50,000 | Tier-dependent |
| Twilio/SMS | ₹10,000-1,00,000 | Pay-per-use |
| Razorpay fees | 2% of transactions | Pass-through |
| Support | ₹0-1,00,000 | Scaling team |

### Gross Margins by Stream

| Stream | Revenue | COGS | Gross Margin |
|--------|---------|------|--------------|
| Wallet transfers | 1% fee | 0.1% (hosting) | ~90% |
| OTA bookings | 12% commission | 0.5% (hosting) | ~96% |
| Merchant POS | 1.5% fee | 0.2% (hosting) | ~87% |
| Subscriptions | 100% margin | Hosting per customer | ~85% |

---

## Unit Economics

### Wallet (RTMN Coin)

| Metric | Value |
|--------|-------|
| CAC (Customer Acquisition) | ₹50-200 |
| LTV (Lifetime Value) | ₹500-2,000 |
| LTV:CAC Ratio | 10:1 |
| Break-even | 50 transactions |
| Margin per user | ₹5-20/year |

### Hotel OTA

| Metric | Value |
|--------|-------|
| CAC (per hotel) | ₹5,000-20,000 |
| LTV (per hotel) | ₹50,000-2,00,000/year |
| LTV:CAC Ratio | 10:1 |
| Recovery | 6-12 months |

### Merchant POS

| Metric | Value |
|--------|-------|
| CAC | ₹2,000-10,000 |
| LTV | ₹30,000-1,20,000 |
| LTV:CAC Ratio | 15:1 |
| Recovery | 3-6 months |

---

## Growth Levers

### 1. Increase Transaction Volume

- Launch referral bonuses
- Gamification (coin mining)
- Cashback on first transaction
- Partner integrations

### 2. Increase Take Rate

- Premium subscription tier
- Value-added services
- Advertising (intent graph)

### 3. Reduce Churn

- Network effects (more users = more value)
- Switching costs (data, history, relationships)
- Loyalty programs

---

## Projections

### 12-Month Target

| Stream | Current MRR | Target MRR | Growth |
|--------|-------------|-------------|--------|
| Wallet transfers | TBD | ₹10L | 20% MoM |
| OTA bookings | TBD | ₹5L | 30% MoM |
| Merchant POS | TBD | ₹3L | 25% MoM |
| Subscriptions | TBD | ₹2L | 15% MoM |
| **Total** | **TBD** | **₹20L** | **22% MoM** |

### 3-Year Target

| Stream | Year 1 | Year 2 | Year 3 |
|--------|---------|---------|---------|
| Wallet | ₹10L | ₹50L | ₹2Cr |
| OTA | ₹5L | ₹30L | ₹1Cr |
| Merchant | ₹3L | ₹20L | ₹80L |
| Subscriptions | ₹2L | ₹10L | ₹30L |
| **Total** | **₹20L** | **₹1.1Cr** | **₹4.1Cr** |

---

## Key Metrics to Track

| Metric | Monthly Target |
|--------|---------------|
| GMV (Gross Merchandise Value) | Track via analytics |
| Take rate | 1-15% by stream |
| LTV:CAC ratio | > 3:1 |
| Churn rate | < 5% monthly |
| NPS | > 40 |
| Payment success rate | > 99% |

---

## Action Items

- [ ] Implement revenue tracking dashboard
- [ ] Set up analytics for GMV by stream
- [ ] Define pricing tiers for NextaBiZ
- [ ] Create merchant pricing page
- [ ] Set up invoicing for white-label deals

---

*This document is confidential. Revenue figures are estimates based on industry benchmarks.*
