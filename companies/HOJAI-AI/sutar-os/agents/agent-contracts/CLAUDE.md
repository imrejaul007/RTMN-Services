# Agent Contracts Service

**Port:** 4830
**Layer:** Agents (Phase 1)
**Version:** 1.0.0

Smart contracts for agent-to-agent transactions. Drafts, signs, stores,
and enforces contracts. Once both parties ACCEPT a quote, an
`agent-contracts` contract is created and bound to the transaction.

## Why This Service

A transaction isn't done when both parties agree — it's done when the
terms are enforceable. `agent-contracts` converts an ACP `ACCEPT` +
`ORDER` into a contract that:
- Records the agreed terms (price, delivery, payment terms)
- Has signatures from both parties
- Can be referenced if a dispute arises
- Can trigger automated actions (escrow release, payment capture)

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/contracts` | Create a new contract (auth required) |
| `GET` | `/api/contracts/:id` | Get a contract |
| `GET` | `/api/contracts` | List contracts (filter by agent, status) |
| `POST` | `/api/contracts/:id/sign` | Add a signature |
| `POST` | `/api/contracts/:id/execute` | Execute the contract (capture payment, release escrow) |
| `POST` | `/api/contracts/:id/cancel` | Cancel a pending contract |
| `GET` | `/api/contracts/:id/events` | Get the event log for a contract |

## Contract States

```
   DRAFT → SIGNED → ACTIVE → EXECUTED
      ↓       ↓        ↓
   CANCELLED VOIDED   DISPUTED
```

## See Also

- [ACP Protocol](../acp-protocol/CLAUDE.md) — generates the contracts
- [agent-wallets](../../../platform/economy/wallet-service/) — captures payments
- [dispute-resolution](../../../platform/trust/dispute-resolution/) — handles disputed contracts