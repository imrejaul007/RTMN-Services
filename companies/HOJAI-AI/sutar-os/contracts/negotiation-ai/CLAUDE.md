# Negotiation AI Service

**Port:** 4850
**Layer:** Contracts (Phase 3)
**Version:** 1.0.0

ML-powered negotiation strategies for ACP COUNTER messages. Provides
5 strategies (competitive, collaborative, accommodating, compromising,
principled), each tuned for different scenarios.

## Why This Service

When a Genie agent gets a QUOTE it doesn't like, it can either
counter-propose manually (slow, suboptimal) or call `negotiation-ai`
to generate the best possible counter-offer.

The service:
- Picks the right strategy based on context (urgency, relationship, price gap)
- Predicts the merchant's BATNA (best alternative to negotiated agreement)
- Generates a counter that's likely to be accepted
- Detects when to walk away vs. accept the current offer

## Strategies

| Strategy | Behavior | When to use |
|----------|----------|-------------|
| `competitive` | Win-lose, hard bargaining | One-off transactions, no future relationship |
| `collaborative` | Win-win, problem solving | Long-term relationship, mutual gains possible |
| `accommodating` | Yield to preserve relationship | High-value relationship, low stakes |
| `compromising` | Middle ground quickly | Time pressure, moderate stakes |
| `principled` | BATNA focus, objective standards | Complex deals with objective reference points |

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/negotiate/counter` | Generate a counter-offer (auth required) |
| `POST` | `/api/negotiate/accept` | Decide whether to accept a quote |
| `POST` | `/api/negotiate/strategy` | Recommend a strategy |
| `POST` | `/api/negotiate/batna` | Predict the counter-party's BATNA |
| `GET` | `/api/negotiate/history/:agentId` | Get past negotiations for an agent |
| `POST` | `/api/negotiate/feedback` | Submit feedback on a negotiation (used for ML training) |

## Quick Start

```bash
curl -X POST http://localhost:4850/api/negotiate/counter \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "quote": { "total": 25.00, "currency": "USD" },
    "context": {
      "urgency": "medium",
      "relationship": "first_time",
      "budget": { "max": 18.00 }
    },
    "preferredStrategy": "collaborative"
  }'
# → { "counter": { "total": 19.50 }, "reasoning": "...", "confidence": 0.82 }
```

## ML Training

Strategies improve over time. Every negotiation produces a feedback
loop: was the counter accepted? Did it leave money on the table? This
data is persisted and used to retrain the strategy weights.

## See Also

- [ACP Protocol](../../agents/acp-protocol/CLAUDE.md) — the messages this service generates
- [agent-learning](../agent-learning/) — sibling ML service for preference learning
- [agent-reputation](../../../platform/trust/agent-reputation/) — strategy success correlates with counter-party reputation