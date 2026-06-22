# Agent Analytics Service

**Port:** 4848
**Layer:** Agents (Phase 2)
**Version:** 1.0.0

Metrics, dashboards, and real-time monitoring for the Agent Commerce
Network. Computes ACN-wide KPIs and per-agent performance stats.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/analytics/kpis` | ACN-wide KPIs (transactions/day, success rate, GMV) |
| `GET` | `/api/analytics/agents/:id` | Per-agent stats |
| `GET` | `/api/analytics/leaderboard` | Top agents by reputation / volume |
| `POST` | `/api/analytics/events` | Submit an analytics event (auth required) |
| `GET` | `/api/analytics/realtime` | Real-time dashboard data |

## KPIs Tracked

- Total transactions, GMV (gross merchant value)
- Transaction success rate
- Average negotiation rounds to ACCEPT
- Dispute rate
- Top merchants, top consumers
- Per-agent reputation trends

## See Also

- [agent-reputation](../../../platform/trust/agent-reputation/) — feeds analytics
- [agent-learning](../agent-learning/) — sibling ML service