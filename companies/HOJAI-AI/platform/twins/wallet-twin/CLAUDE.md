# Wallet Twin

**Version:** 1.0.0
**Port:** 4896
**Status:** ✅ RUNNING | June 22, 2026
**Package:** `@rtmn/wallet-twin`
**Module type:** CommonJS (`require`, not `import`)

---

## Overview

The Wallet Twin manages per-customer digital wallets with four balance dimensions: `balance` (cash), `coins` (loyalty), `credit` (prepaid), and `rewardsPoints`. Every wallet is auto-created on first reference (idempotent lookup by `customerId + businessId`), so callers never need a separate "create wallet" call.

The headline feature is the **`withWalletLock()`** per-wallet async mutex that serializes concurrent topup/deduct calls for the same wallet — preventing race conditions where two parallel requests both read the same balance and double-spend. There is also a 24h idempotency cache keyed by client-provided `idempotencyKey`.

Like customer-twin, it publishes events via `publishAsync` (`wallet.transaction.created`, `wallet.wallet.updated`, `wallet.reward.granted`).

Note: This is the only twin in the cluster that uses **CommonJS** (`require`) instead of ESM (`import`).

---

## Endpoints

```
GET    /api/twins/wallet/:customerId           # Get or auto-create wallet + last 50 transactions
POST   /api/twins/wallet/:customerId/topup     # Add funds (type: cash|credit|reward|crypto, default 'cash')
POST   /api/twins/wallet/:customerId/deduct    # Deduct funds (returns INSUFFICIENT_BALANCE if short)
POST   /api/twins/wallet/:customerId/rewards   # Add reward points with reason + optional orderId
GET    /api/twins/wallet/:customerId/history   # Paginated transactions (filter: type)
GET    /api/analytics/wallet                   # Total wallets, totalBalance, totalCredits, totalRewards, activeWallets
GET    /health                                  # Counts
GET    /ready
```

### Wallet Fields
- `customerId`, `businessId`, `currency` (default USD), `balance`, `coins`, `credit`, `rewardsPoints`
- `balanceAfter` on each transaction = sum of cash + credit + coins at time of txn

### Transaction Types
`credit`, `debit`, `transfer`, `reward`, `refund`

### Concurrency
```js
const walletLocks = new Map();
async function withWalletLock(walletId, fn) {
  const prev = walletLocks.get(walletId) || Promise.resolve();
  let release;
  const next = new Promise(r => { release = r; });
  walletLocks.set(walletId, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (walletLocks.get(walletId) === next) walletLocks.delete(walletId);
  }
}
```
Topup and deduct both wrap their mutation in `withWalletLock(wallet.id, ...)`.

---

## Data Stores

| Store Name | Purpose |
|---|---|
| `wallets` | Per-(customer,business) wallet with 4 balance dimensions |
| `transactions` | All credit/debit/transfer/reward/refund operations with balanceAfter snapshot |
| `rewards` | Reserved for future reward-catalog twins (declared, not actively populated by current endpoints) |

In-memory (not data stores): `idempotencyKeys` Map (24h TTL, swept hourly by `setInterval`), `walletLocks` Map.

---

## Architecture

```
wallet-twin/
├── src/
│   └── index.js              # CommonJS, ~225 LOC
├── package.json
└── CLAUDE.md
```

---

## Dependencies

- **@rtmn/twinos-shared** — auth, validation, error handler, logger
- **@rtmn/twinos-shared/src/event-publisher.js** — `publishAsync` for wallet events
- **@rtmn/shared** — env + PersistentStore
- **express**, **helmet**, **cors**, **compression**, **morgan**, **uuid**

---

## Recent Changes

- 2026-06-21: **Silent-mutation fix** — topup/deduct/rewards now call `wallets.set(wallet.id, wallet)` after every mutation (prior code only wrote on create, so topups never reached disk)
- 2026-06-20: `withWalletLock()` per-wallet mutex added to prevent concurrent double-spend race conditions
- 2026-06-19: Idempotency cache migrated to TTL entry shape (`{ value, expiresAt }`) with hourly sweep
- 2026-06-18: `publishAsync` events on all state changes (`wallet.transaction.created`, `wallet.wallet.updated`, `wallet.reward.granted`)
- 2026-06-17: Auto-create wallet on first reference — no separate POST /wallets endpoint needed

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/twins/wallet-twin
npm install
npm start

# Get wallet (auto-creates if not found)
curl http://localhost:4896/api/twins/wallet/cust-abc12345 -H "Authorization: Bearer $TOKEN"

# Top up $100
curl -X POST http://localhost:4896/api/twins/wallet/cust-abc12345/topup \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 100, "type": "cash", "source": "credit_card", "idempotencyKey": "topup-001" }'

# Deduct $25
curl -X POST http://localhost:4896/api/twins/wallet/cust-abc12345/deduct \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 25, "type": "cash", "reference": "ORDER-789", "orderId": "ord-789" }'

# Grant 50 reward points
curl -X POST http://localhost:4896/api/twins/wallet/cust-abc12345/rewards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "points": 50, "reason": "loyalty_bonus", "orderId": "ord-789" }'

curl http://localhost:4896/health
```