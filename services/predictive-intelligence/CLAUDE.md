# Predictive Intelligence

> **Status:** ✅ Production Ready
> **Port:** 4754
> **Version:** 1.0.0
> **Owner:** HOJAI AI - Division 3 (Intelligence Cloud)
> **Last Updated:** June 19, 2026

A standalone, general-purpose time-series forecasting engine for the RTMN ecosystem. Part of HOJAI AI's **Intelligence Cloud** (Division 3). Distinct from `sales-intelligence` (port 5181) which is sales-specific — Predictive Intelligence is the **cross-domain forecasting brain** that any Industry OS, Department OS, or external app can call.

---

## Purpose

Predictive Intelligence provides on-demand forecasting, anomaly detection, trend analysis, and demand prediction for **any** time-series in the RTMN ecosystem. It implements all algorithms from scratch in pure JavaScript — no external ML libraries — so it has zero native dependencies and runs anywhere Node.js runs.

**Use cases across RTMN:**

- Restaurant OS — predict tomorrow's covers, ingredient demand, table turnover
- Hotel OS — forecast occupancy, RevPAR, seasonal demand
- Healthcare OS — predict patient volume, prescription demand
- Retail OS — inventory replenishment, SKU demand
- Finance OS — revenue forecasting, cash flow prediction
- Operations OS — incident volume, ticket backlog

---

## Endpoints

### Health & Metadata

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Redirects to `/api/health` |
| GET | `/api/health` | Liveness probe + stats |
| GET | `/api/methods` | List of supported forecasting methods |
| GET | `/api/stats` | Global stats (counts, average horizon, memory) |
| GET | `/api/audit` | Append-only audit log (filter by `?op=`) |

### Forecasting

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/forecast` | Run a single forecast (auto-persists, returns UUID) |
| POST | `/api/forecast/batch` | Batch forecast many series at once |
| GET | `/api/forecast/:id` | Retrieve a stored forecast |
| GET | `/api/forecasts` | List all stored forecasts |
| DELETE | `/api/forecast/:id` | Delete a stored forecast |

### Anomaly Detection

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/anomaly/detect` | Detect anomalies in a series (z-score / IQR / modified-zscore) |
| POST | `/api/anomaly/score` | Score a single point against history |

### Trend Analysis

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/trend` | Direction (increasing/decreasing/flat), slope, R², changepoints |
| POST | `/api/trend/decompose` | Decompose series into trend + seasonal + residual |

### Demand Prediction

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/demand/predict` | Inventory model: expected demand, safety stock, reorder point, stockout probability |

### Model Evaluation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/evaluate` | Train/test split, returns MAE, RMSE, MAPE |

**Total: 18 endpoints**

---

## Forecasting Methods

All algorithms implemented from scratch using only built-in `Math`.

### 1. Linear Regression (least squares)

Fits a line `y = a + b·x` to the data. Best for clear trends with no seasonality.

```
b = Σ(xi - x̄)(yi - ȳ) / Σ(xi - x̄)²
a = ȳ - b·x̄
R² = 1 - SSres/SStot
```

Forecast = `a + b·(n-1+h)` for each horizon step `h`.

### 2. Moving Average

Three flavors:
- **Simple** — `mean(last N values)`
- **Weighted** — linearly increasing weights, recent values matter more
- **Exponential** — `s_t = α·y_t + (1-α)·s_{t-1}`. Default α = 0.3.

### 3. Holt-Winters Triple Exponential Smoothing

Captures **level + trend + seasonality** simultaneously. Additive seasonality.

```
level_t    = α·(y_t - seasonal_{t-p}) + (1-α)·(level_{t-1} + trend_{t-1})
trend_t    = β·(level_t - level_{t-1}) + (1-β)·trend_{t-1}
seasonal_t = γ·(y_t - level_t) + (1-γ)·seasonal_{t-p}
forecast   = level_T + h·trend_T + seasonal_{T+h-p}
```

Defaults: α=0.4, β=0.1, γ=0.3, period inferred from data spacing.

### 4. Naive Seasonal

Repeats the last seasonal cycle, scaled by the trend between the last two cycles. Simple but effective for highly seasonal data.

### 5. Ensemble

Weighted average of three base methods:
- 20% Linear
- 30% Exponential Moving Average
- 50% Seasonal (Holt-Winters or Seasonal Naive, depending on series)

Final confidence = mean of component confidences.

### Auto Selection

When `method: 'auto'`, picks:
- Holt-Winters if `n ≥ 2·period` and period > 1
- Exponential MA if `n < 12`
- Ensemble otherwise
- Simple MA fallback if `n < 5`

### Confidence Intervals

Each forecast returns `upperBound` and `lowerBound` as `±1.96·σ·√h` where `σ` is the residual standard deviation and `h` is the horizon step. Bounds widen with horizon, as expected.

---

## Integration Notes

### Industry OS Examples

**Restaurant OS (port 5010)** — daily covers forecast:
```bash
curl -X POST http://localhost:4754/api/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "series": [{"t":"2026-06-01","v":120}, ...],
    "horizon": 7,
    "method": "holt-winters",
    "seasonality": "daily"
  }'
```

**Hotel OS (port 5025)** — occupancy forecast:
```bash
curl -X POST http://localhost:4754/api/forecast \
  -d '{"series":[...],"horizon":30,"seasonality":"weekly"}'
```

**Retail / Healthcare** — inventory demand:
```bash
curl -X POST http://localhost:4754/api/demand/predict \
  -d '{
    "historicalDemand": [...],
    "leadTimeDays": 7,
    "currentStock": 50,
    "serviceLevel": 0.95
  }'
```

### Anomaly Use Cases

- **Operations OS** — detect unusual incident spikes
- **Finance OS** — flag suspicious transaction patterns
- **Sales OS** — catch pipeline anomalies

### Trend Use Cases

- **CXO OS** — strategic KPI direction + changepoints
- **Marketing OS** — campaign performance trend
- **Customer Success OS** — NPS trajectory

### Calling Pattern

All endpoints are unauthenticated for development. In production, gate them behind:
1. CorpID JWT (verify `Authorization: Bearer <token>`)
2. Per-tenant rate limiting
3. Per-industry quotas

The service does not need DB access — pass series data in the request body and persist results via the returned UUID.

### Recommended Pattern for Industry OS

1. Industry OS stores its time-series in its own DB
2. On demand (dashboard refresh, scheduled job, or AI agent query), Industry OS calls Predictive Intelligence
3. Predictive Intelligence returns forecast + confidence + bounds
4. Industry OS caches the result (e.g. 1 hour TTL) and exposes it to its UI/agents

### Pre-seeded Example

On startup, the service generates a 90-day sinusoidal series (trend + weekly seasonality + noise) and runs Holt-Winters on it with a 14-day horizon. Useful for smoke-testing.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Pure CommonJS, no TypeScript** | Matches `secrets-manager` style; fastest to deploy |
| **In-memory Map storage** | No DB dependency; forecasts are ephemeral by design |
| **No external ML libs** | Zero supply chain risk; deterministic; easy to audit |
| **UUIDs as forecast IDs** | Globally unique; no collision risk across service restarts |
| **Audit log bounded at 10,000** | Prevents unbounded memory growth |
| **CORS '*' in dev** | Industry OS on different ports can call freely |

---

## Next Steps

1. **Auth** — wire CorpID JWT verification (currently open)
2. **Persistence** — back the in-memory Map with MongoDB or Postgres for restart safety
3. **Model evaluation telemetry** — track MAPE/MAE per forecast method to auto-pick better ensembles
4. **Streaming mode** — accept incrementally growing series (e.g. live transaction stream)
5. **More models** — ARIMA, Prophet-style decompositions, Bayesian time-series (would require more math; may need to revisit the "no external libs" constraint)
6. **Service registration** — add to RTMN Hub (`/api/services`) and the canonical port registry
7. **Dashboard** — `/dashboard` route for human inspection of stored forecasts
8. **Per-tenant quotas** — limit forecasts/hour per CorpID tenant

---

## Files

```
predictive-intelligence/
├── package.json      # express, helmet, cors, uuid
├── src/
│   └── index.js     # ~700 lines: math + 18 endpoints + audit + seed
└── CLAUDE.md         # this file
```

---

*Part of HOJAI AI - Division 3 (Intelligence Cloud). See [companies/HOJAI-AI/divisions/03-intelligence-cloud/CLAUDE.md](../../companies/HOJAI-AI/divisions/03-intelligence-cloud/CLAUDE.md) for the full intelligence module taxonomy.*
