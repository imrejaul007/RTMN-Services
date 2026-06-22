# Agent Wallets Service

**Port:** 4840
**Layer:** Agents
**Version:** 1.0.0

Multi-currency digital wallet for SUTAR agents. Each agent has a wallet
holding balances in 6 currencies (USD, EUR, GBP, INR, AED, SGD) and can
deposit, withdraw, pay another agent, and hold/release escrow.

## Why This Service

Wallets are how SUTAR agents pay for things — a Genie agent buying a
pizza from a restaurant agent, an escrow for a service contract, a
subscription fee for an AI service. Centralising wallet logic in one
service means:

- One place to enforce limits (per-tx, daily, monthly)
- One place to compute fees (transaction fee, fixed fee, escrow fee)
- One place to handle multi-currency
- One persistence layer (file-backed Map) that survives restart

## Currency Support

| Currency | Code | Default decimal |
|----------|------|-----------------|
| US Dollar | USD | 2 |
| Euro | EUR | 2 |
| British Pound | GBP | 2 |
| Indian Rupee | INR | 2 |
| UAE Dirham | AED | 2 |
| Singapore Dollar | SGD | 2 |

## Wallet Limits

Each wallet has 3 configurable limits that are enforced on every
`withdraw` and `pay`:

| Limit | Default | Reset |
|-------|---------|-------|
| `perTransactionLimit` | $5,000 | N/A (per tx) |
| `dailyLimit` | $10,000 | midnight local |
| `monthlyLimit` | $100,000 | 1st of month |

If any limit would be exceeded, the request is rejected with a 400.

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/wallets` | ✓ | Create wallet |
| `GET` | `/api/wallets/:id` | | Get wallet |
| `GET` | `/api/wallets/:id/balance` | | Get balance for a currency |
| `GET` | `/api/wallets/:id/limits` | | Get current limits + usage |
| `POST` | `/api/wallets/:id/deposit` | ✓ | Deposit funds |
| `POST` | `/api/wallets/:id/withdraw` | ✓ | Withdraw (enforces limits) |
| `POST` | `/api/wallets/:id/pay` | ✓ | Pay another agent (enforces limits) |
| `POST` | `/api/wallets/:id/escrow` | ✓ | Hold funds in escrow |
| `POST` | `/api/escrow/:escrowId/release` | ✓ | Release escrow |
| `POST` | `/api/escrow/:escrowId/refund` | ✓ | Refund escrow |
| `GET` | `/api/wallets/:id/transactions` | | List transactions |

## Quick Start

```bash
# Create wallet
curl -X POST http://localhost:4840/api/wallets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-genie-001",
    "initialBalances": { "USD": 1000 },
    "limits": { "perTransactionLimit": 100, "dailyLimit": 500 }
  }'

# Check current usage
curl http://localhost:4840/api/wallets/WAL-abc123/limits \
  -H "Authorization: Bearer <token>"
# → { "dailyUsed": 0, "dailyRemaining": 500, ... }

# Withdraw (enforces limits)
curl -X POST http://localhost:4840/api/wallets/WAL-abc123/withdraw \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 50, "currency": "USD" }'
```

## Fee Structure

Default fees:
- Transaction: 2.9% + $0.30 (Stripe-like)
- Escrow: 1%

Configurable per wallet at creation.

## Escrow

The escrow lifecycle:

```
   POST /api/wallets/:id/escrow         POST /api/escrow/:id/release
         (HOLD)                                 (RELEASE to recipient)
   wallet ─────► escrow-account              escrow-account ─────► recipient
                                                  │
                                                  │ POST /api/escrow/:id/refund
                                                  ▼
                                              original wallet
```

## Persistence

Wallets, transactions, escrow accounts, payment methods, and subscriptions
are all persisted via `PersistentMap`. They survive service restarts.

## Tests

```bash
cd sutar-os/agents/agent-wallets
node tests/limits.test.cjs
```

4 tests covering per-tx, daily, monthly enforcement.

## Related

- `agent-economy` (port 4810) — economy layer, hooks wallets for SLB
- `agent-contracts` (port 4830) — uses wallets for contract payouts
- `dispute-resolution` (port 4847) — uses wallets for refunds