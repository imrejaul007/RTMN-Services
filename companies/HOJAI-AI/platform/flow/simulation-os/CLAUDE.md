# SUTAR OS — Simulation OS (Port 4241)

> **Status:** ✅ NEW — Built June 20, 2026
> **SUTAR Layer:** 4 — Decision Support / What-if
> **Purpose:** Run what-if scenarios for pricing changes, market entry, policy rollouts, agent decisions

---

## Mission

When an agent (or a human operator) is considering a change — should we raise prices 10%? Enter this new market? Roll out this policy? — they need a quick estimate of the likely outcomes across many plausible futures. Simulation OS runs **Monte Carlo + parameter sweep** simulations and returns summary statistics (mean, median, std, p5, p95) so the caller can make a probabilistic decision.

## Templates

| ID | Use Case | Key Outputs |
|----|----------|-------------|
| `pricing-change` | Estimate revenue impact of a price change | mean / p5 / p95 revenue across elasticity distribution |
| `market-entry` | Project adoption curve and break-even for new market | final adoption, acquired customers, CAC payback months |
| `policy-rollout` | Adoption + compliance + penalty revenue of a policy | mean adoption, mean compliance, mean penalty revenue |
| `agent-decision` | Score expected payoff of agent decision alternatives | per-option expected value, std dev, risk ratio |

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/scenarios` | Create + run a scenario (`{type, params, name}`) |
| GET | `/api/scenarios` | List scenarios (filter by type, status) |
| GET | `/api/scenarios/:id` | Get scenario + results |
| POST | `/api/scenarios/:id/rerun` | Rerun with optional param overrides |
| POST | `/api/scenarios/:id/cancel` | Cancel a running scenario |
| POST | `/api/scenarios/compare` | Compare 2+ scenarios side-by-side |
| GET | `/api/templates` | List built-in scenario templates |
| GET | `/api/templates/:id` | Get a template spec with defaults |
| GET | `/api/presets` | List distribution presets (normal, uniform, lognormal) |
| GET | `/health` | Health + counts |

## Example: Pricing Change

```bash
curl -X POST http://localhost:4241/api/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pricing-change",
    "params": { "baselinePrice": 50, "baselineVolume": 5000, "elasticity": -1.5 }
  }'
# Returns: { mean: 245000, median: 245800, std: 21000, p5: 210000, p95: 280000, ... }
```

## What This Is NOT

- **Not** a full digital twin simulator (no real market dynamics)
- **Not** Bayesian or causal inference — it's Monte Carlo with assumed distributions
- **Not** real-time — scenarios complete in <1s but aren't streaming

For deeper modeling, integrate with a dedicated service (Palisade @RISK, AnyLogic, or a custom sim).

## Known Limitations

- Distributions are parametric (assumed shape); user can override but defaults are reasonable
- No persistence — restart loses scenarios
- `policy-rollout` results are returned as a concatenated string (cosmetic; will fix)

## Integration with HOJAI Intelligence (4881)

Wired into `/api/route` and `/api/agents` as `sutarSimulation`. Also accessible via Hub (4399) at `/api/simulation/...`.

## Related Services

- `/services/decision-engine` (4240) — uses simulation results to drive policy decisions
- `/services/usage-tracker` (4252) — feeds simulation parameters with real usage data
- `/services/agent-marketplace` (4845) — listing decisions informed by ROI/simulation

---

*See also: [companies/HOJAI-AI/divisions/12-sutar-os/CLAUDE.md](../../divisions/12-sutar-os/CLAUDE.md)*