# @hojai/creator-economy-sdk

> Partner ecosystem with revenue sharing SDK

## Install

```bash
npm install @hojai/creator-economy-sdk
```

## Quick Start

```typescript
import { CreatorEconomySDK } from '@hojai/creator-economy-sdk';

const sdk = new CreatorEconomySDK('http://localhost:4514');

// Register partner
const partner = await sdk.registerPartner({
  name: 'Acme Agency',
  type: 'agency',
  email: 'hello@acme.com'
});

// Record earnings
await sdk.recordEarnings({
  partnerId: partner.id,
  source: 'company_creation',
  amount: 100000
});

// Request payout
await sdk.requestPayout({
  partnerId: partner.id,
  type: 'bank_transfer',
  amount: 5000,
  bankAccount: {
    accountNumber: '1234567890',
    ifsc: 'HDFC0001234',
    bankName: 'HDFC Bank',
    accountHolder: 'Acme Agency'
  }
});
```

## API Reference

### Partner Management

```typescript
sdk.registerPartner(params)     // Register new partner
sdk.getPartner(id)              // Get partner with earnings
sdk.listPartners(query)         // List partners
sdk.activatePartner(id)        // Activate partner
```

### Earnings

```typescript
sdk.recordEarnings(params)           // Record revenue share
sdk.getPartnerEarnings(partnerId)    // Get earnings summary
```

### Payouts

```typescript
sdk.requestPayout(params)       // Request payout
sdk.getPayout(id)              // Get payout details
sdk.listPayouts(query)        // List payouts
sdk.processPayout(id)          // Process payout (admin)
sdk.cancelPayout(id)           // Cancel payout
```

### Dashboard

```typescript
sdk.getDashboard(partnerId)    // Partner dashboard
sdk.getAdminDashboard()        // Admin dashboard
```

### Certifications

```typescript
sdk.issueCertification(params)          // Issue certification
sdk.getPartnerCertifications(partnerId)  // List certifications
```

### Referrals

```typescript
sdk.createReferral(referrerId, refereeId)  // Create referral
sdk.getReferralStats(partnerId)          // Get stats
```

## Partner Tiers

| Tier | Min Earnings | Revenue Share |
|------|-------------|---------------|
| Bronze | ₹0 | 10% |
| Silver | ₹50,000 | 15% |
| Gold | ₹2,00,000 | 20% |
| Platinum | ₹10,00,000 | 25% |

## Revenue Share Model

| Source | Share |
|--------|-------|
| Company Creation | 20% |
| Subscription | 10% |
| Transaction | 2% |
| Referral | ₹500 |

## Payout Limits

| Tier | Min | Max | Daily Limit |
|------|-----|-----|-------------|
| Bronze | ₹500 | ₹50,000 | ₹50,000 |
| Silver | ₹500 | ₹1,00,000 | ₹1,00,000 |
| Gold | ₹1,000 | ₹2,50,000 | ₹2,50,000 |
| Platinum | ₹1,000 | ₹10,00,000 | ₹10,00,000 |

---

See [service README](../platform/company-os/creator-economy/README.md) for full API documentation.
