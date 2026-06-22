# Agent Learning Service

**Port:** 4846
**Layer:** Agents (Phase 2)
**Version:** 1.0.0

ML service that learns from past agent interactions to improve future
decisions. Tracks which merchants a user prefers, which negotiation
strategies work best, which products are popular, etc.

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/learning/preferences` | Update agent preferences (auth required) |
| `GET` | `/api/learning/preferences/:agentId` | Get learned preferences for an agent |
| `POST` | `/api/learning/feedback` | Submit explicit feedback on a transaction |
| `GET` | `/api/learning/recommendations/:agentId` | Get recommendations |
| `POST` | `/api/learning/train` | Trigger a model retrain |

## What It Learns

- **Consumer preferences**: which merchants, products, cuisines a Genie agent keeps choosing
- **Merchant success patterns**: which quotes get accepted, which negotiation styles work
- **Time-of-day patterns**: when to send offers for best response rates
- **Price elasticity**: how much each consumer segment will pay above floor

## See Also

- [agent-analytics](../agent-analytics/) — sibling for metrics (not learning)
- [negotiation-ai](../../contracts/negotiation-ai/) — sibling ML service for strategy
- [MemoryOS](../../../platform/memory/memory-os/) — long-term memory backbone