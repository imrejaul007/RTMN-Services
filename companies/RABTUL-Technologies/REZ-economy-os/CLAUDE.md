# REZ-economy-os - RABTUL Agent Economy OS

**Port:** 4251
**Layer:** SUTAR OS Economy Layer (10th layer of 12-Layer Canonical Architecture)
**Company:** RABTUL Technologies
**Version:** 1.0.0

## Overview

The REZ-economy-os is the **Agent Economy** service in the SUTAR OS stack. It manages the entire economic infrastructure for autonomous agents in the RTMN ecosystem, including karma reputation, credit scoring, wallet accounts, double-entry ledger transactions, and escrow holds.

This service is the **9th canonical layer** of the 12-layer SUTAR architecture: it transforms economic events into flows that the Memory layer can recall and the Flow layer can route.

## Architecture Position

```
12-Layer SUTAR Canonical Stack:
1. Trigger
2. Intent Graph
3. GoalOS
4. Decision Engine
5. SimulationOS
6. Agent Network
7. Negotiation       <-- sutar-negotiation-engine (port 4191)
8. Trust             <-- rez-trust-scorer (port 4180)
9. Economy           <-- YOU ARE HERE (port 4251)
10. Contract
11. Flow
12. Memory
```

## Core Features

### 1. Karma System (Reputation)
- **Tier System:** bronze (0) → silver (100) → gold (500) → platinum (2000) → diamond (10000)
- **Karma Sources:**
  - Task completed: +10
  - SLA met: +5
  - Positive review: +15
  - Negative review: -10
  - Dispute resolved: +20
  - Breach detected: -25
  - On-time payment: +8
  - Late payment: -5
- **Tier Progression:** Tracks 0-1 progress to next tier
- **Lifetime Karma:** Never decreases (monotonic)
- **Event History:** Last 100 events per agent

### 2. Credit Scoring
- **Formula:** `score = 0.25 * creditHistory + 0.25 * paymentHistory + 0.25 * disputeRateInverse + 0.25 * deliverySuccess`
- **Score Range:** 0-1000
- **Tiers:**
  - Excellent: ≥850
  - Good: 700-849
  - Fair: 550-699
  - Poor: 400-549
  - Very Poor: <400
- **Auto-Recalculation:** Triggered on payment, dispute, delivery events
- **Component Tracking:** Each component scored 0-1000

### 3. Wallet Accounts
- **Multi-Currency:** USD default, supports any ISO code
- **Account Types:** agent, user, merchant, platform, escrow, fee
- **Balance Tracking:**
  - `balance`: total balance
  - `availableBalance`: balance - held
  - `heldBalance`: in escrow
  - `lifetimeCredits/Debits`: cumulative totals
- **Status:** active, frozen, closed
- **Auto-Create:** Primary account on first access

### 4. Double-Entry Ledger
- **Atomicity:** All entries succeed or all fail
- **Verification:** `Σ debits = Σ credits` per transaction
- **Idempotency:** Unique keys prevent duplicate transactions
- **Reference Format:** `TXN-YYYY-NNNNNNNN`
- **Fee Handling:** Optional fee deducted from recipient
- **Reversal:** Linked reverse transactions preserve audit trail
- **Ledger Entries:** Tagged with debit/credit, balance snapshot

### 5. Escrow Service
- **Hold:** Funds moved to platform escrow account, tracked as held
- **Release:** Funds released to payee when conditions met
- **Refund:** Funds returned to payer
- **Dispute:** Escrow frozen pending resolution
- **Conditions:** Release conditions tracked per escrow

### 6. Agent Economic Profile
Aggregates karma, credit, accounts, and activity into a single view:
- **Status:** newcomer, active, veteran, suspended
- **Trust Score:** Proxy from credit score (synced from trust-scorer)
- **Net Flow:** Total balance across all accounts
- **Total Volume:** Lifetime credit volume

## API Endpoints

### Karma
- `GET /api/v1/karma/:agentId` - Get karma record
- `POST /api/v1/karma/:agentId/initialize` - Initialize karma
- `POST /api/v1/karma/:agentId/award` - Award/penalize karma
- `GET /api/v1/karma/:agentId/history` - Get history
- `GET /api/v1/karma` - List all
- `GET /api/v1/karma/top/list` - Top N by karma
- `GET /api/v1/karma/stats/summary` - Statistics

### Credit
- `GET /api/v1/credit/:agentId` - Get credit record
- `POST /api/v1/credit/:agentId/initialize` - Initialize
- `POST /api/v1/credit/:agentId/recalculate` - Recalculate score
- `POST /api/v1/credit/:agentId/payment` - Record payment
- `POST /api/v1/credit/:agentId/dispute` - Record dispute
- `POST /api/v1/credit/:agentId/delivery` - Record delivery
- `GET /api/v1/credit/top/list` - Top N by credit
- `GET /api/v1/credit/stats/summary` - Statistics

### Accounts
- `POST /api/v1/accounts` - Create account
- `GET /api/v1/accounts/:accountId` - Get account
- `GET /api/v1/accounts?ownerId=X` - List by owner
- `GET /api/v1/accounts/owner/:ownerId/primary` - Get/create primary
- `POST /api/v1/accounts/:accountId/freeze` - Freeze
- `POST /api/v1/accounts/:accountId/activate` - Activate
- `GET /api/v1/accounts/stats/summary` - Statistics

### Transactions
- `POST /api/v1/transactions` - Create transaction
- `GET /api/v1/transactions/:transactionId` - Get transaction
- `GET /api/v1/transactions/reference/:reference` - Get by ref
- `POST /api/v1/transactions/:transactionId/reverse` - Reverse
- `GET /api/v1/transactions?fromAccountId=&toAccountId=&type=&status=` - List
- `GET /api/v1/transactions/ledger/:accountId` - Account ledger
- `GET /api/v1/transactions/:transactionId/verify` - Verify integrity
- `GET /api/v1/transactions/stats/summary` - Statistics

### Escrow
- `POST /api/v1/escrow` - Hold escrow
- `GET /api/v1/escrow/:escrowId` - Get escrow
- `POST /api/v1/escrow/:escrowId/release` - Release
- `POST /api/v1/escrow/:escrowId/refund` - Refund
- `POST /api/v1/escrow/:escrowId/dispute` - Dispute
- `GET /api/v1/escrow?status=&payerAccountId=&payeeAccountId=` - List
- `GET /api/v1/escrow/stats/summary` - Statistics

### Profiles
- `GET /api/v1/profiles/:agentId` - Full profile
- `GET /api/v1/profiles/:agentId/summary` - Summary

## Event Bus Integration

**Published Topics:**
- `economy.transaction.created`
- `economy.transaction.completed`
- `economy.transaction.failed`
- `economy.transaction.reversed`
- `economy.karma.awarded`
- `economy.karma.penalized`
- `economy.karma.tier.changed`
- `economy.credit.updated`
- `economy.credit.tier.changed`
- `economy.escrow.held`
- `economy.escrow.released`
- `economy.escrow.disputed`
- `economy.account.frozen`
- `economy.account.activated`

**Event Bus URL:** `http://localhost:4510` (configurable)

## Storage

- In-memory Maps for all entities (production-ready replacement with MongoDB planned)
- Atomic operations via single-threaded Node.js event loop
- All ledger updates use double-entry pattern

## Development

```bash
npm install
npm run dev
```

## Integration with SUTAR OS Layers

- **Trust Layer (4180):** Trust score feeds into economic profile
- **Contract Layer:** Transaction reversal = contract breach
- **Negotiation Layer (4191):** Negotiation outcomes trigger escrow holds
- **Memory Layer:** All economic events published for recall
- **Flow Layer:** Transaction routing rules apply based on credit/karma

## Source Files

- [src/services/karmaService.ts](src/services/karmaService.ts) - Karma logic
- [src/services/creditService.ts](src/services/creditService.ts) - Credit scoring
- [src/services/accountService.ts](src/services/accountService.ts) - Account management
- [src/services/transactionService.ts](src/services/transactionService.ts) - Double-entry ledger
- [src/services/escrowService.ts](src/services/escrowService.ts) - Escrow lifecycle
- [src/services/agentProfileService.ts](src/services/agentProfileService.ts) - Profile aggregation
