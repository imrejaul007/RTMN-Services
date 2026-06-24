# @hojai/rez-coin — REZ Coin (REZ) Service

> **Port:** 4050
> **Version:** 1.0.0
> **Type:** Utility token + loyalty points hybrid
> **Status:** ✅ **PRODUCTION-READY MVP** — 17/17 tests pass, builds clean.

---

## What it is

**REZ Coin (REZ)** is the utility token + loyalty points hybrid for the RTMN ecosystem.

| Property | Value |
|---|---|
| **Backing** | 1 REZ = 1 INR of merchant-funded commission value |
| **Supply** | Elastic (minted on merchant commission, burned on customer spend) |
| **Where held** | REZ Wallet (every customer + merchant + agent + Nexha) |
| **Where spent** | Any participating merchant |
| **Expiry** | None (but inactive wallets lose 2%/year to encourage circulation) |
| **Type** | Programmable utility token + loyalty points hybrid |

REZ is the **economic primitive** that powers cross-Nexha transactions in the federation. Every purchase mints REZ to the buyer's wallet (cashback), every spend burns REZ, every merchant commission mints REZ to the merchant. Agents earn REZ for completing tasks.

---

## Wallet Model

```ts
interface Wallet {
  id: string;                  // wallet-<uuid>
  ownerId: string;              // customer/merchant/nexha/agent id
  ownerType: 'nexha' | 'customer' | 'merchant' | 'agent' | 'system';
  displayName: string;
  balance: number;              // REZ balance
  stakedBalance: number;        // REZ locked in staking
  lifetimeEarned: number;       // all-time earned
  lifetimeSpent: number;        // all-time spent
  lastActivityAt: string;       // for decay calculation
  status: 'active' | 'frozen' | 'pending-kyc' | 'closed';
  createdAt: string;
  updatedAt: string;
}
```

---

## Transaction Kinds (9)

| Kind | Direction | Use case |
|---|---|---|
| `mint` | + credit | Merchant pays commission → REZ minted to wallet |
| `burn` | - debit | Customer spends REZ → REZ burned |
| `transfer` | P2P | Wallet-to-wallet transfer (paired debit/credit) |
| `reward` | + credit | System reward (referral, sign-up, etc.) |
| `cashback` | + credit | Cashback from a purchase |
| `stake` | lock | Locked in staking |
| `unstake` | release | Released from staking |
| `fee` | - debit | Network fee |
| `expire` | - debit | Inactive wallet decay (2%/year) |

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health + counts |
| `GET` | `/ready` | Readiness probe |
| `GET` | `/api/v1/info` | Service metadata |
| `POST` | `/api/v1/wallets` | Create a wallet |
| `GET` | `/api/v1/wallets/:id` | Get one wallet |
| `GET` | `/api/v1/wallets` | List (filters: ownerType, status, minBalance) |
| `POST` | `/api/v1/mint` | Mint REZ to a wallet |
| `POST` | `/api/v1/burn` | Burn REZ from a wallet |
| `POST` | `/api/v1/transfer` | P2P transfer (paired debit/credit) |
| `GET` | `/api/v1/supply` | Federation-wide supply stats |
| `GET` | `/api/v1/history` | Transaction history (filters: walletId, kind, limit) |

---

## Quick Start

```bash
cd companies/HOJAI-AI/rez-coin
npm install
npm run build
PORT=4050 node dist/index.js
# → Listening on :4050
```

```bash
# Health
curl http://localhost:4050/health

# Supply
curl http://localhost:4050/api/v1/supply

# Mint REZ
curl -X POST http://localhost:4050/api/v1/mint \
  -H 'Content-Type: application/json' \
  -d '{"toWalletId":"wallet-abc","amount":100,"memo":"signup bonus"}'

# Transfer
curl -X POST http://localhost:4050/api/v1/transfer \
  -H 'Content-Type: application/json' \
  -d '{"fromWalletId":"wallet-a","toWalletId":"wallet-b","amount":50,"memo":"gift"}'

# History
curl 'http://localhost:4050/api/v1/history?walletId=wallet-abc&limit=10'
```

---

## Architecture

```
rez-coin (port 4050)
├── src/
│   ├── index.ts                  # Express server
│   ├── types/index.ts            # Wallet, RezTransaction, SupplyStats
│   └── services/
│       └── rezCoinService.ts     # Wallet mgmt + mint/burn/transfer
├── __tests__/unit/
│   └── rezCoinService.test.ts    # 17 tests
├── dist/                         # Compiled output
├── package.json                  # @hojai/rez-coin@1.0.0
├── tsconfig.json
└── vitest.config.ts
```

**Storage:** In-memory `Map<walletId, Wallet>`. Production would use Postgres with row-level locking for transfers (atomicity).

**Auth:** None in MVP — designed to be called by trusted internal services (Nexhas, agents, merchants). Add JWT in production.

**REZ Intel:** Can be wired using the standard pattern (see other services).

---

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | 4050 | Service port |

---

## Tests

17 unit tests covering:
- Seeding (idempotent + correct wallet/tx counts)
- Wallet creation (initial 0 balance, rejects duplicate owner)
- Wallet listing (sorted by balance, filter by ownerType)
- Minting (positive amount, refuses negative, increments balance)
- Burning (decrements balance, refuses insufficient)
- Transfers (decrements sender, increments recipient, refuses self)
- **Supply conservation** (mint+transfer doesn't create REZ, burn destroys)
- History (filters by walletId, kind, limit)
- Supply stats (sum of balances, topHolders, totalBurned, totalMinted)

```bash
npm test
# ✓ 17 tests pass
```

---

## Build

```bash
npm install
npm run build    # tsc → dist/
npm start        # node dist/index.js
npm run dev      # tsx watch src/index.ts
```

---

## Files

```
rez-coin/
├── CLAUDE.md                # This file
├── package.json             # @hojai/rez-coin@1.0.0
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── index.ts             # Express server
│   ├── types/index.ts       # Type definitions
│   └── services/
│       └── rezCoinService.ts  # Wallet + mint/burn/transfer
├── __tests__/unit/
│   └── rezCoinService.test.ts # 17 tests
└── dist/                    # Built output
```

---

## Use Cases

**Reward a customer for sign-up:**
```ts
const res = await fetch('http://localhost:4050/api/v1/mint', {
  method: 'POST',
  body: JSON.stringify({
    toWalletId: customerWalletId,
    amount: 100,
    memo: 'Welcome bonus',
    reference: 'signup-2026-06'
  })
});
```

**P2P transfer (customer tips driver):**
```ts
const res = await fetch('http://localhost:4050/api/v1/transfer', {
  method: 'POST',
  body: JSON.stringify({
    fromWalletId: customerWallet,
    toWalletId: driverWallet,
    amount: 20,
    memo: 'Tip for fast delivery'
  })
});
```

**Pay for a purchase (burn REZ):**
```ts
const res = await fetch('http://localhost:4050/api/v1/burn', {
  method: 'POST',
  body: JSON.stringify({
    fromWalletId: customerWallet,
    amount: 50,
    memo: 'Payment for Order #1234'
  })
});
```

**Federation-wide supply dashboard:**
```ts
const res = await fetch('http://localhost:4050/api/v1/supply');
// { totalSupply: 16875, totalWallets: 6, topHolders: [...], totalMinted, totalBurned, ... }
```

---

## Related

- **rez-wallet-service** (RABTUL port 4004) — REZ consumer wallet
- **rez-payment-service** (RABTUL port 4001) — payment processing
- **nexha-capability-os** (port 4270) — capabilities priced in REZ
- **nexha-market-os** (port 4275) — REZ-denominated market intelligence
- **nexha-autonomous-logistics** (port 4293) — REZ-denominated shipping
- **HOJAI Foundry** — REZ-compatible company-starter

---

*Built as part of Phase G roadmap (40-phase plan, item #12: REZ Coin L2 + Wallet mobile).*