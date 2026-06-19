# SUTAR OS — ROI Calculator (Port 4259)

> **Status:** ✅ NEW — Built June 20, 2026
> **SUTAR Layer:** 7 — Economy / ROI
> **Purpose:** Compute ROI, payback period, NPV, IRR for AI agent / service investments

---

## Mission

The marketplace is full of agents and services, each with a price. Before buying, a decision-maker needs to know: **will this investment pay back, and when?** ROI Calculator takes upfront cost, monthly revenue, monthly cost, horizon, and discount rate — and returns payback months, NPV, IRR, break-even, and total ROI.

## Templates

| ID | Use Case | Defaults |
|----|----------|----------|
| `agent-purchase` | Buying/subscribing to a marketplace agent | $1k upfront, $500/mo revenue, 12mo horizon |
| `training-investment` | Custom model training (GPU spend + gains) | $50k upfront, $8k/mo revenue, 24mo horizon |
| `service-rollout` | Internal service deployment across departments | $20k upfront, $3k/mo revenue, 18mo horizon |

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/calculations` | Create + run a calculation (template OR custom inputs) |
| GET | `/api/calculations` | List calculations |
| GET | `/api/calculations/:id` | Get detail |
| DELETE | `/api/calculations/:id` | Remove |
| POST | `/api/calculations/compare` | Compare 2+ calculations |
| POST | `/api/quick-roi` | One-shot simple ROI: `{investment, annualGain}` |
| GET | `/api/templates` | List templates |
| GET | `/health` | Health |

## Returned Metrics

| Metric | Meaning |
|--------|---------|
| `totalRevenue` | Sum of monthly revenue over horizon |
| `totalCost` | Upfront + monthly cost over horizon |
| `totalProfit` | Revenue − Cost |
| `roi` | Profit / Upfront (e.g., 1.5 = 150% return) |
| `roiPercent` | "150.0%" |
| `paybackMonths` | When cumulative cash flow turns positive |
| `npv` | Net present value at given discount rate (monthly) |
| `irr` | Internal rate of return (annualized %) |
| `breakEven` | True if payback ≤ horizon |

## Example

```bash
curl -X POST http://localhost:4259/api/quick-roi \
  -H "Content-Type: application/json" \
  -d '{"investment": 50000, "annualGain": 20000}'
# { roi: -0.6, roiPercent: "-60.0%", paybackYears: 2.5, ... }
```

## Algorithms

- **NPV**: Standard `Σ CF_t / (1+r)^t` with monthly rate = `annualRate / 12`
- **IRR**: Newton-Raphson iteration, max 100 steps, convergence threshold 0.0001
- **Payback**: First month when cumulative cash flow ≥ 0
- **Total ROI**: `TotalProfit / UpfrontCost` (no discounting)

## Known Limitations

- Constant monthly revenue/cost — no seasonality, no growth curves
- No tax modeling
- No risk-adjustment (Monte Carlo would belong in Simulation OS)
- In-memory only — restart loses calculations

## Integration with HOJAI Intelligence (4881)

Wired into `/api/route` and `/api/agents` as `sutarRoi`. Also accessible via Hub (4399) at `/api/roi/...`.

## Related Services

- `/services/usage-tracker` (4252) — provides real revenue/cost data
- `/services/simulation-os` (4241) — for risk-adjusted scenarios
- `/services/decision-engine` (4240) — uses ROI to drive policy

---

*See also: [companies/HOJAI-AI/divisions/12-sutar-os/CLAUDE.md](../../divisions/12-sutar-os/CLAUDE.md)*