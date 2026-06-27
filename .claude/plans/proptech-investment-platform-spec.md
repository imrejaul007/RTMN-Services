# PropTech Investment Platform — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P1 | **Build:** ₹45L / 8 weeks | **ARR:** ₹3.0Cr

---

## 1. Concept & Vision

Fractional ownership and investment platform enabling retail investors to own portions of real estate properties with automated income distribution and portfolio management.

---

## 2. Core Features

### 2.1 Property Listings (P0)
```typescript
interface PropertyListing {
  id: string;
  property: {
    address: string;
    type: 'residential' | 'commercial' | 'retail' | 'land';
    totalValue: number;
    minInvestment: number;    // ₹10,000
    totalTokens: number;       // 1 token = ₹100
  };
  
  financials: {
    expectedYield: number;    // Annual %
    projectedAppreciation: number;
    lockInPeriod: number;      // months
    listingDate: Date;
    exitDate?: Date;
  };
  
  documents: {
    titleDeed: string;
    valuationReport: string;
    rentalAgreement: string;
    tenantInfo: string;
  };
}
```

### 2.2 Tokenized Ownership (P0)
- Blockchain-backed tokens representing property shares
- 1 token = ₹100 (configurable)
- Transferable on secondary market
- Dividend distribution proportional to holdings

### 2.3 Investment Dashboard (P0)
```
Portfolio Value: ₹2,45,000
├── Property A (25 tokens): ₹50,000
├── Property B (100 tokens): ₹1,00,000
└── Property C (95 tokens): ₹95,000

YTD Returns: +12.4%
├── Rental Income: ₹8,500
└── Capital Gains: ₹17,200
```

### 2.4 Rental Distribution (P0)
- Monthly rental income calculation
- Proportional distribution to token holders
- TDS deduction (if applicable)
- Auto-reinvest option

### 2.5 Secondary Market (P1)
- Token trading platform
- Price discovery based on supply/demand
- Order matching engine
- Settlement system

### 2.6 Risk Assessment (P1)
```python
def calculate_property_risk(property_id):
    factors = {
        'location_risk': get_location_score(property_id),
        'tenant_quality': get_tenant_score(property_id),
        'liquidity_risk': calculate_liquidity(property_id),
        'market_risk': get_market_trend(property_id),
        'regulatory_risk': get_regulatory_risk(property_id)
    }
    
    overall_risk = weighted_average(factors, weights)
    return {
        'score': overall_risk,
        'rating': 'A' if overall_risk > 80 else 'B' if > 60 else 'C',
        'factors': factors
    }
```

---

## 3. Data Model

```typescript
interface InvestorPortfolio {
  id: string;
  investorId: string;
  
  holdings: {
    propertyId: string;
    tokens: number;
    investedAmount: number;
    currentValue: number;
    unrealizedGain: number;
  }[];
  
  transactions: Transaction[];
  
  financials: {
    totalInvested: number;
    currentValue: number;
    totalReturns: number;
    ytdReturns: number;
  };
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'dividend' | 'exit';
  propertyId: string;
  tokens: number;
  price: number;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}
```

---

## 4. API Endpoints

```
# Properties
GET    /api/properties
GET    /api/properties/:id
GET    /api/properties/:id/financials

# Investment
POST   /api/investments
GET    /api/investments/portfolio
GET    /api/investments/:propertyId/returns

# Trading
POST   /api/market/buy
POST   /api/market/sell
GET    /api/market/orderbook/:propertyId

# Dividends
GET    /api/dividends
GET    /api/dividends/pending

# KYC
POST   /api/kyc/submit
GET    /api/kyc/status
```

---

## 5. Compliance

- SEBI regulations for alternative investments
- KYC/AML compliance
- E-signature integration
- Escrow account management
- Audit trail

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| Investor growth | 10K+ by Y1 |
| Properties listed | 50+ |
| Avg investment | ₹50,000 |
| Platform AUM | ₹100Cr |
| Dividend accuracy | 100% |

---

*Spec created: June 28, 2026*
