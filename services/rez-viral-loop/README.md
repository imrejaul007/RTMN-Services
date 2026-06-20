# REZ VIRAL LOOP SERVICE

**Version:** 1.0
**Date:** May 2026

---

## WHAT IT DOES

```
Referral Engine → Social Sharing → Reward Distribution
```

### Features

| Feature | Description |
|---------|-------------|
| Referral Links | Generate unique referral codes |
| Social Sharing | WhatsApp, SMS, Email, Social media |
| Reward System | Coins, discounts, free items |
| Tiered Rewards | Multiple referral levels |
| Fraud Detection | Prevent fake referrals |
| Analytics | Track referral performance |

---

## APIS

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/loops` | GET | List viral loops |
| `/api/loops` | POST | Create viral loop |
| `/api/referrals` | GET | Get referrals by user |
| `/api/referrals/track` | POST | Track new referral |
| `/api/rewards` | GET | Get reward status |
| `/api/rewards/claim` | POST | Claim referral reward |
| `/api/share` | POST | Generate shareable link |

---

## REFERRAL FLOW

```
User A shares link → User B signs up → Reward to User A → Reward to User B
```

### Reward Tiers

| Tier | Referrals | Reward |
|------|-----------|--------|
| Bronze | 1-5 | 50 coins |
| Silver | 6-15 | 100 coins + 5% discount |
| Gold | 16-50 | 250 coins + 10% discount |
| Platinum | 51+ | 500 coins + free shipping |

---

## INTEGRATIONS

| Service | Purpose |
|---------|---------|
| Wallet Service | Coin rewards |
| Merchant Service | Discount codes |
| Marketing | Campaign tracking |
| Analytics | Performance metrics |

---

## DEPLOYMENT

### Render

```
1. Connect GitHub repo
2. Add env vars
3. Deploy
```

### Environment Variables

```bash
PORT=4076
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
WALLET_SERVICE_URL=http://localhost:4002
```

---

## STATUS

| Component | Status |
|-----------|--------|
| Referral Links | Built |
| Social Sharing | Built |
| Reward System | Built |
| Fraud Detection | Built |
| Analytics | Built |
| Deployment Ready | Ready |

---

**Built for scale, designed for growth.**
