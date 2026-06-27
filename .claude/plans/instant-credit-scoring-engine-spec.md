# Instant Credit Scoring Engine - Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Priority:** HIGH

## Executive Summary

API-first credit scoring engine that provides instant creditworthiness assessment using AI, alternative data, and real-time risk analysis.

**Core Value:** "Credit Decisions in 1 Second"

---

## Problem Statement

| Pain Point | Current Reality | Solution |
|------------|-----------------|----------|
| Slow credit decisions | Days/weeks of processing | Instant API |
| Limited data | Only bureau scores | Alternative data |
| No real-time monitoring | Static scores | Continuous tracking |
| Manual underwriting | Expensive humans | AI automation |
| Poor default prediction | High NPA rates | ML models |

---

## Target Market

- **Banks & NBFCs** needing instant lending
- **E-commerce platforms** offering BNPL
- **Retail chains** with store credit
- **Employer portals** for salary advances
- **Insurance companies** for risk assessment

---

## Product Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              INSTANT CREDIT SCORING ENGINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DATA SOURCES                                                   │
│  ├── Bureau Data ─────── CIBIL, Experian, Equifax             │
│  ├── Bank Transactions ── Account history, spending patterns      │
│  ├── Alternative Data ── Utility, rent, telecom              │
│  ├── Digital Footprint ── Social, e-commerce, app usage       │
│  └── Employment ───────── Salary, employer, tenure              │
│                                                                 │
│  PROCESSING LAYER                                              │
│  ├── Traditional Score (Risk Intelligence)                     │
│  ├── Behavioral Analysis (AI Intelligence)                      │
│  ├── Alternative Scoring (ML Models)                          │
│  ├── Fraud Detection (AI Intelligence)                         │
│  └── Affordability Engine (Finance OS)                        │
│                                                                 │
│  TWIN LAYER                                                   │
│  ├── Customer Twin ──────── Comprehensive profile              │
│  ├── Financial Twin ─────── Credit behavior                   │
│  └── Risk Twin ──────────── Risk indicators                  │
│                                                                 │
│  OUTPUT LAYER                                                 │
│  ├── Credit Score (300-900)                                   │
│  ├── Risk Tier (A/B/C/D)                                     │
│  ├── Recommended Limit                                         │
│  ├── Interest Rate Suggestion                                   │
│  └── Approval Probability                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

### 1. Instant Score API

| Feature | Description |
|---------|-------------|
| Real-time Scoring | <1 second response |
| No Documents | Score from data only |
| Multiple Bureau | CIBIL, Experian, Equifax |
| Alternative Scoring | Non-traditional data |
| Incremental Updates | Real-time refresh |

### 2. Creditworthiness Factors

| Factor | Weight | Data Source |
|--------|--------|-------------|
| Payment History | 35% | Bureau |
| Credit Utilization | 30% | Bureau + Bank |
| Credit Mix | 15% | Bureau |
| Employment | 10% | Employer data |
| Digital Footprint | 10% | Alternative |

### 3. Risk Tiers

| Tier | Score Range | Default Rate | Interest |
|------|-------------|-------------|----------|
| A+ | 800-900 | <1% | 8-10% |
| A | 750-799 | 1-2% | 10-12% |
| B+ | 700-749 | 2-4% | 12-15% |
| B | 650-699 | 4-6% | 15-18% |
| C | 600-649 | 6-10% | 18-22% |
| D | <600 | >10% | 22%+ |

### 4. Affordability Analysis

| Feature | Description |
|---------|-------------|
| Income Verification | Salary slip + bank |
| Expense Analysis | Spending patterns |
| Existing Obligations | EMI calculations |
| Disposable Income | What they can afford |
| Debt-to-Income | Key ratio |

### 5. Fraud Detection

| Feature | Description |
|---------|-------------|
| Identity Verification | Aadhaar/ PAN validation |
| Device Fingerprinting | Device risk scoring |
| Velocity Checks | Multiple applications |
| Behavioral Analysis | Typing patterns |
| Network Analysis | Fraud rings detection |

### 6. Portfolio Monitoring

| Feature | Description |
|---------|-------------|
| Portfolio Health | NPA tracking |
| Early Warning Signals | Delinquency prediction |
| Concentration Risk | Industry/lender exposure |
| Recovery Analytics | Collection optimization |
| Regulatory Reporting | Basel/IRBI |

---

## API Endpoints

```bash
# Credit Score
POST /api/score                    # Get instant score
POST /api/score/refresh           # Refresh score
GET  /api/score/:customerId       # Get cached score

# Assessment
POST /api/assess                  # Full credit assessment
POST /api/assess/affordability    # Affordability check
POST /api/assess/fraud            # Fraud check

# Decision
POST /api/decision                # Auto decision
POST /api/decision/manual          # Flag for review

# Portfolio
GET  /api/portfolio/health        # Portfolio metrics
GET  /api/portfolio/risk          # Risk dashboard
GET  /api/portfolio/concentration # Concentration

# Monitoring
POST /api/monitor/subscribe        # Subscribe to updates
GET  /api/monitor/:customerId     # Get latest update

# Bureau
POST /api/bureau/report           # Get bureau report
POST /api/bureau/ disputes        # Raise dispute
```

---

## Integration Points

| Service | Port | Role |
|---------|------|------|
| Risk Intelligence | 4755 | Credit scoring, fraud |
| AI Intelligence | 4881 | Behavioral analysis |
| CorpID | 4702 | Identity verification |
| Customer Twin | 4895 | Customer profile |
| Finance OS | 4801 | Financial analysis |
| Trust Intelligence | 4882 | Reputation scoring |
| RABTUL BNPL | - | Lending integration |

---

## Pricing Model

| Tier | Price | Calls/mo | Features |
|------|-------|----------|---------|
| Starter | INR1999/mo | 1,000 | Basic scoring |
| Growth | INR7999/mo | 10,000 | Full assessment |
| Enterprise | INR24999/mo | 100,000 | Custom + Dedicated |

**Per Call:** INR0.50-2.00 per score request

---

## Development Effort

| Component | Weeks | Complexity |
|-----------|-------|------------|
| Score API | 2 | Medium |
| Bureau Integration | 3 | High |
| ML Models | 4 | High |
| Fraud Detection | 3 | High |
| Portfolio Dashboard | 2 | Medium |
| Real-time Monitoring | 2 | Medium |
| **Total** | **16 weeks** | - |

---

## Success Metrics (6 months)

| Metric | Target |
|--------|--------|
| API Calls/mo | 10L |
| Avg Latency | <500ms |
| Accuracy | 92% |
| Fraud Detection | 95% |
| Customers | 50 |

---

*Last Updated: June 28, 2026*
