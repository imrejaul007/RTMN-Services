# sutar-founder-os

> **Service:** SUTAR OS Founder OS
> **Port:** 4260
> **Layer:** 4 (Decision + Simulation + Learning + Flow + Founder)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

Founder-specific AI twin + workflows. Founders get a digital twin that
tracks their **KPIs** (runway, burn, team morale, customers, revenue),
records trends over time, and offers **4 playbooks** for common
founder work.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts |
| GET | `/api/founders` | List founders |
| GET | `/api/founders/:id` | Get one founder |
| POST | `/api/founders` | Create a founder |
| POST | `/api/founders/:id/kpis` | Record a KPI snapshot |
| GET | `/api/founders/:id/kpis/latest` | Most recent KPI snapshot |
| GET | `/api/founders/:id/kpis/trend` | All KPI snapshots, sorted by date |
| GET | `/api/playbooks` | List available playbooks |
| GET | `/api/playbooks/:id` | Get one playbook |
| POST | `/api/founders/:id/playbooks/:pid/run` | Run a playbook, return structured draft |
| GET | `/api/audit` | Recent operations |

## Playbooks (4 seeded)

| ID | Title | Returns |
|----|-------|---------|
| `weekly-board-update` | Weekly Board Update | Structured status update text from current KPIs |
| `investor-outreach` | Investor Outreach | 10 investor match criteria + email template with placeholders |
| `hiring-decision` | Hiring Decision | Score fit (0-1) + reasoning + recommendation |
| `runway-extension` | Extend Runway | 3 ranked actions by impact (months added) + risk |

## Seeded data

- `founder-reja-001` — Rejaul Karim, HOJAI AI, CEO & Founder, seed stage, AI Infrastructure
- 2 KPI snapshots (June 1 + June 15) showing runway declining from 14mo → 13mo
  but revenue growing $4500 → $5800 and morale 7.5 → 7.8

## Next steps

- Persist founders + KPIs to MongoDB
- Connect to `/services/simulation-os` (4241) for "what-if" runway scenarios
- Add `raise-round` playbook that uses ROI Calculator (4259)
- Add Slack/email integration so playbooks auto-deliver
