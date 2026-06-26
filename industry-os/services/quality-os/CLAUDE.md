# Quality OS

**Port:** 5272  
**Status:** ✅ Built (June 26, 2026)

Engineering Quality Platform: Test coverage, code quality metrics, technical debt tracking, quality gates, and engineering excellence.

## AI Agents (2)

| Agent | Purpose |
|-------|---------|
| Quality Gate Agent | Automated quality checks, pass/fail criteria, deployment gates |
| Technical Debt Tracker | Debt identification, prioritization, remediation tracking |

## Key Features

- **Test Coverage**: Coverage analysis, trend tracking, gap identification
- **Code Quality**: Complexity metrics, duplication detection, maintainability scoring
- **Technical Debt**: Debt inventory, interest calculation, payoff planning
- **Quality Gates**: Automated checkpoints, deployment approval, quality thresholds
- **Engineering Metrics**: PR stats, review times, bug rates, velocity

## Endpoints

```
POST /api/metrics                # Record metrics
GET  /api/metrics/:repo         # Repo metrics
GET  /api/coverage/:repo        # Coverage analysis
GET  /api/quality/:repo         # Quality score
POST /api/debt                  # Log technical debt
GET  /api/debt/:repo           # Debt inventory
POST /api/gates/check          # Run quality gate
GET  /api/reports/:repo        # Quality reports
```

## Start

```bash
cd industry-os/services/quality-os
npm start
# http://localhost:5272/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
