# RIDZA - Source of Truth

**Version:** 2.0
**Date:** June 10, 2026
**Status:** AUTHORITATIVE

---

## Overview

**RIDZA** = AI-Powered Digital Financial Marketplace
- Like PolicyBazaar + Paisabazaar + Insurance vertical
- Powered by REZ ecosystem (RABTUL services, Signals, Fraud)
- Commission-based revenue

---

## Company Position

RIDZA is part of the RTNM Digital ecosystem. All companies are **sister companies**:
- **HOJAI AI** provides AI services
- **RABTUL** provides Auth, Payment, Wallet
- **REZ Intelligence** provides Signals, Fraud detection

---

## Products

| Product | Type | Purpose |
|---------|------|---------|
| **Digital Services Platform** | Platform | Financial services |
| **REZ-Financial** | Product | Financial services (part of RIDZA) |
| **Insurance** | Product | Policy management |
| **Credit** | Product | Loans, credit |
| **Lending** | Product | BNPL, EMI |

---

## Services (13 Total)

| Service | Port | Purpose | RABTUL |
|---------|------|---------|---------|
| ridza-core | 4500 | Lead engine, matching | Auth, Wallet |
| ridza-ai-search | 4505 | NL search | Signals |
| ridza-partner-api | 4501 | Partner API | Payment |
| ridza-agent-portal | 4502 | Agent CRM | Auth, Notify |
| ridza-provider-api | 4506 | Provider portal | Auth |
| ridza-corpperks-hub | 4503 | CorpPerks | Wallet, Notify |
| ridza-compliance | 4507 | Consent, audit, PII vault | Auth |
| ridza-events | 4508 | Event bus | - |
| ridza-workflow | 4509 | State machine | - |
| ridza-fraud | 4510 | Fraud detection | Fraud Agent |
| ridza-merchant-finance | 4511 | Working capital | Signals |
| ridza-finance-intelligence | 4512 | Credit scoring | Signals, Loyalty |
| ridza-insurance | 4520 | Insurance | Auth, Payment, Notify |

---

## RABTUL Services Used

| RABTUL Service | Port | Usage |
|----------------|------|-------|
| Auth Service | 4002 | JWT/OTP verification |
| Payment Service | 4001 | Premium collection |
| Wallet Service | 4004 | Coin rewards, balance |
| Notify Service | 4011 | SMS/WhatsApp/Email |
| Signal Aggregator | 4142 | User behavior signals |
| Fraud Agent | 3007 | Risk scoring |

---

## Insurance Products (15+)

### Types
Health, Life, Term, Car, Bike, Travel, Home, Gadget, Pet, Critical Illness, Accident, Child Education

### Insurers
LIC India, SBI Life, HDFC Life, ICICI Lombard, Bajaj Allianz, TATA AIG, Star Health, Niva Bupa, Acko

---

## Ecosystem Context

```
RTNM Digital (Parent)
│
├── RIDZA ──────────────────→ provides finance to everyone
├── RABTUL ────────────────→ provides infrastructure to everyone
├── HOJAI AI ────────────→ provides AI to everyone
└── All other sister companies
```

---

**Last Updated:** June 10, 2026
**Version:** 2.0
