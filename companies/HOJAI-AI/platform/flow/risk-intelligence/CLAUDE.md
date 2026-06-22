# risk-intelligence

> **Status:** ✅ Production-ready v1.0
> **Service:** `risk-intelligence`
> **Port:** 4755
> **Division:** HOJAI AI — Intelligence Cloud (Division 3)
> **Owner:** HOJAI AI Applications team

Cross-domain risk scoring engine for the RTMN ecosystem. Covers **fraud**, **churn**, **credit**, and a configurable **composite** of all three. Pure CommonJS, in-memory, ~750 lines.

This is the standalone **Risk Intelligence** module defined in `companies/HOJAI-AI/divisions/03-intelligence-cloud/CLAUDE.md`. It is intentionally separate from the customer-specific `riskScoring.ts` that lives in `customer-intelligence` (port 4885) — that one is narrow (churn on a known customer base), this one is broad (any entity, any risk type).

---

## 1. Mission

Provide a single, fast, deterministic risk-scoring endpoint for the rest of RTMN. Three risk dimensions, one audit log, one service.

```
risk-intelligence (4755)
│
├── Fraud Risk        — payment / transaction fraud
├── Churn Risk        — customer churn probability
├── Credit Risk       — lending / BNPL decisions
└── Composite Risk    — weighted combination of the above
```

---

## 2. Quick Start

```bash
cd companies/HOJAI-AI/services/risk-intelligence
npm install
npm start              # PORT defaults to 4755

# Health
curl http://localhost:4755/api/health

# Score a transaction
curl -X POST -H "Content-Type: application/json" \
  -d '{"transaction":{"amount":5000,"merchantCategory":"electronics","country":"US"},"context":{"deviceFingerprint":"abc123","ipRiskScore":0.1,"velocityLast1h":2,"velocityLast24h":5,"accountAge":365,"priorFraudFlags":0}}' \
  http://localhost:4755/api/fraud/score
```

---

## 3. Risk Models

All three models are weighted linear combinations followed by a simple activation. They are deliberately interpretable — every weight is a number you can `PATCH` over the wire to A/B test.

### 3.1 Fraud Risk

- **Algorithm:** weighted linear combination → sigmoid → 0–100
- **Inputs:** `amount`, `merchantCategory`, `country`, `deviceFingerprint`, `ipRiskScore` (0–1), `velocityLast1h`, `velocityLast24h`, `accountAge` (days), `priorFraudFlags`
- **Output:** `score` (0–100), `level` (`low`/`medium`/`high`/`critical`), `recommendation` (`allow`/`review`/`block`), top 3 contributing `factors`
- **Normalization:** amount uses `log10`, velocity caps at 50/hr and 200/day, account age normalizes over 5 years, prior flags cap at 3
- **Lookup tables:** `merchantCategoryRisk` and `countryRisk` map raw categories to a 0–1 prior (jail/gambling/crypto = high, US/CA/GB = low)

### 3.2 Churn Risk

- **Algorithm:** weighted linear combination → logistic (0–1)
- **Inputs:** `tenure` (days), `lastLoginDays`, `monthlyActiveDays` (0–30), `supportTicketsLast90d`, `npsScore` (-100 to 100), `paymentFailures`, `planTier` (`free`/`starter`/`pro`/`enterprise`), `featureAdoption` (0–1), `competitorSignals` (0–5)
- **Output:** `churnProbability` (0–1), `riskTier` (`low`/`medium`/`high`), `expectedChurnDays`, `recommendedAction`, top 3 factors
- **Action mapping:** `monitor` / `in_app_engagement_campaign` / `outreach_within_7_days`

### 3.3 Credit Risk

- **Algorithm:** weighted linear combination → sigmoid → 300–850 FICO-like scale
- **Inputs:** `monthlyIncome`, `debtToIncome`, `creditHistoryYears`, `priorDefaults`, `employmentType`, `requestedAmount`, `termMonths`
- **Output:** `creditScore` (300–850), `decision` (`approve`/`review`/`decline`), `approvedAmount`, `interestRate` (%), `pd` (probability of default)
- **Decision mapping:** `decline` < 580, `review` 580–669, `approve` ≥ 670
- **Rate curve:** 5% at 850 → 25% at 670 (approve), 15–37% (review), 0% (decline)

### 3.4 Composite Risk

- Weighted combination of the three types, default weights: `fraud: 0.4, churn: 0.3, credit: 0.3`
- Composite score is 0–100, levels: `low < 30 ≤ medium < 60 ≤ high < 80 ≤ critical`
- Callers supply partials; missing types are ignored (denominator is re-weighted)

---

## 4. Endpoints (18)

### Fraud (4)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/fraud/score` | Score a single transaction |
| `POST` | `/api/fraud/score/batch` | Score up to 500 transactions |
| `GET` | `/api/fraud/rules` | Read current fraud model weights + thresholds |
| `PATCH` | `/api/fraud/rules` | Update model weights and/or thresholds (A/B test) |

### Churn (3)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/churn/score` | Score a single customer |
| `POST` | `/api/churn/cohort` | Aggregate churn risk over a cohort of customers |
| `GET` | `/api/churn/feature-importance` | Ranked feature weights |

### Credit (2)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/credit/score` | Single applicant decision |
| `POST` | `/api/credit/simulate` | Run one applicant against N scenarios (different amounts/terms) |

### Cross-cutting (7)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/risk/composite` | Combine multiple risk types |
| `GET` | `/api/risk/thresholds` | Read thresholds + composite weights |
| `PATCH` | `/api/risk/thresholds` | Update thresholds and/or composite weights |
| `GET` | `/api/audit` | Full audit log (filterable by `riskType`, `entityId`, `level`, `limit`) |
| `GET` | `/api/audit/:entityType/:entityId` | Risk history per entity |
| `GET` | `/api/stats` | Total counts, distributions, averages |
| `GET` | `/api/health` (and `/health` redirect) | Liveness |

---

## 5. In-Memory Storage

| Map | Type | Notes |
|---|---|---|
| `fraudRules` | `Map<string, number>` | feature → weight (seeded, mutable) |
| `churnRules` | `Map<string, number>` | feature → weight (seeded, mutable) |
| `creditRules` | `Map<string, number>` | feature → weight (seeded, mutable) |
| `thresholds` | object | per-risk-type level cutoffs |
| `compositeWeights` | object | fraud/churn/credit blend |
| `auditLog` | `Array<object>` | bounded to 10,000 entries (FIFO) |

**Pre-seeded data:**
- 8 fraud weights, 9 churn weights, 7 credit weights
- 3 example audit entries (1 low-risk tx, 1 critical fraud block, 1 borderline churn)

---

## 6. Security

- ✅ Helmet security headers
- ✅ CORS open (`*`) — tighten for production
- ✅ Audit log captures principal from `x-actor` / `x-principal` / `x-user-id` headers (falls back to `anonymous`)

**Not yet implemented:**
- ❌ JWT auth via CorpID (TODO)
- ❌ Per-tenant scoping
- ❌ Rate limiting (use an upstream gateway like the Unified Hub)

---

## 7. Integration Points

- **TwinOS Hub (4705):** A customer twin can call `/api/churn/score` to refresh its churn sub-state
- **Sales OS (5055):** A deal can request a `creditScore` for the buyer before CPQ quotes a payment plan
- **REZ Wallet (4004):** Every transaction routed through Wallet should pass `/api/fraud/score` first
- **Customer Success OS (4050):** Health-score deterioration can trigger a `churn/cohort` recalc
- **Unified Hub (4399):** Mount at `/api/risk/*` for cross-OS consumption

---

## 8. Future Work

- [ ] Promote linear models to gradient-boosted trees once labeled data is available
- [ ] Add per-tenant rule packs (each Industry OS overrides the defaults)
- [ ] Add a `/api/risk/why` endpoint that returns SHAP-style per-feature contributions
- [ ] Persist audit log to PostgreSQL with a 7-year retention policy
- [ ] Add a circuit breaker for upstream IP-intel lookups (Micro Intelligence pattern)

---

## 9. Files

| File | Lines | Purpose |
|---|---|---|
| `package.json` | ~20 | Express + helmet + cors + uuid |
| `src/index.js` | ~750 | All scoring, endpoints, audit |
| `CLAUDE.md` | this file | Documentation |

---

*Last updated: June 19, 2026*
*HOJAI AI — Intelligence Cloud Division*
