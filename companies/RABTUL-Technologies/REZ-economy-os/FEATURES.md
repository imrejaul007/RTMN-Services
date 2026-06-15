# REZ-economy-os Features

Comprehensive feature list for the RABTUL Agent Economy OS service (Port 4251).

## 1. Karma Reputation System

### Tier System
| Tier | Threshold (Karma) | Privileges |
|------|-------------------|------------|
| Bronze | 0 | New agents, default |
| Silver | 100 | Basic features, low priority support |
| Gold | 500 | Priority support, lower fees (0.5%) |
| Platinum | 2,000 | Premium support, lowest fees (0.25%) |
| Diamond | 10,000 | VIP support, no fees, exclusive features |

### Karma Sources and Events
| Source | Points | Trigger |
|--------|--------|---------|
| `taskCompleted` | +10 | Task marked complete |
| `slaMet` | +5 | SLA target achieved |
| `positiveReview` | +15 | Received 4-5 star review |
| `negativeReview` | -10 | Received 1-2 star review |
| `disputeResolved` | +20 | Dispute resolved in favor |
| `breachDetected` | -25 | SLA breach detected |
| `onTimePayment` | +8 | Payment made on time |
| `latePayment` | -5 | Payment made late |
| `customPoints` | variable | Manual adjustment via API |

### Tier Progression
- Tracks `tierProgress` (0-1) toward next tier
- `lifetimeKarma` is monotonic (never decreases)
- Tier changes publish `economy.karma.tier.changed` event
- Old tier and new tier both included in event payload

### History Tracking
- Last 100 karma events per agent
- Each event has: id, source, points, reason, referenceId, timestamp
- Retrievable via `GET /api/v1/karma/:agentId/history`

## 2. Credit Scoring System

### Component Weights (25% Each)
| Component | Weight | Description |
|-----------|--------|-------------|
| Credit History | 25% | Account age + transaction volume |
| Payment History | 25% | On-time vs late payment ratio |
| Dispute Rate (Inverse) | 25% | Lower disputes = higher score |
| Delivery Success | 25% | Successful vs failed deliveries |

### Credit Tiers
| Tier | Score Range | Description |
|------|-------------|-------------|
| Excellent | 850-1000 | Top performers, lowest rates |
| Good | 700-849 | Reliable, standard rates |
| Fair | 550-699 | Acceptable, slightly elevated rates |
| Poor | 400-549 | Risk accounts, higher rates |
| Very Poor | 0-399 | High risk, restricted features |

### Component Calculation Details
- **Credit History:** `min(500, ageScore) + min(500, volumeScore)`
  - ageScore = (accountAgeDays / 365) * 500
  - volumeScore = (totalTransactions / 100) * 500
- **Payment History:** `onTimePayments / (onTimePayments + latePayments) * 1000`
- **Dispute Rate (Inverse):** `1000 - (totalDisputes / totalDisputeActivity) * 1000`
- **Delivery Success:** `successfulDeliveries / totalDeliveries * 1000`

### Auto-Recalculation Triggers
- On payment event (on-time or late)
- On dispute event (opened or resolved)
- On delivery event (success or failure)
- Manual via `POST /api/v1/credit/:agentId/recalculate`

## 3. Wallet Account System

### Account Types
- **agent:** Autonomous agent accounts
- **user:** Human user accounts
- **merchant:** Business/merchant accounts
- **platform:** RTMN platform accounts
- **escrow:** Held funds accounts
- **fee:** Platform fee collection

### Balance Structure
- `balance`: Total current balance
- `availableBalance`: balance - held (usable for transactions)
- `heldBalance`: Funds in escrow or pending
- `lifetimeCredits`: Total ever received
- `lifetimeDebits`: Total ever sent
- `transactionCount`: Total transactions

### Account States
- `active`: Normal operation
- `frozen`: No transactions allowed
- `closed`: Terminated (read-only)

### Multi-Currency Support
- Default: USD
- Any ISO currency code supported
- Cross-currency transactions rejected (account must match)

### Auto-Create Behavior
- Primary account auto-created on first access for new agents
- Prevents 404 errors for legitimate operations

## 4. Double-Entry Ledger

### Atomicity Guarantees
- All debits and credits for a transaction succeed or all fail
- Balance verification: `Σ debits = Σ credits ± 0.0001`
- Failed transactions rolled back

### Transaction Types
| Type | Description | Fee Default |
|------|-------------|-------------|
| `payment` | Standard payment | 2.5% |
| `refund` | Money returned | 0% |
| `fee` | Platform fee | 0% |
| `reward` | Bonus/reward | 0% |
| `penalty` | Penalty assessment | 0% |
| `transfer` | Account-to-account | 0% |
| `escrow` | Held funds | 0% |
| `release` | Escrow release | 0% |
| `adjustment` | Manual adjustment | 0% |

### Reference Format
- Pattern: `TXN-YYYY-NNNNNNNN`
- Auto-incrementing counter
- Human-readable for auditing

### Idempotency
- Optional `idempotencyKey` parameter
- Same key returns same transaction
- Prevents double-charges on retries

### Transaction Lifecycle
1. **Validation** (amount, accounts, currency, status)
2. **Idempotency Check** (return existing if key matches)
3. **Balance Check** (insufficient funds → 402)
4. **Balance Update** (atomic, double-entry)
5. **Ledger Entries** (debit + credit + optional fee)
6. **Status Update** (pending → completed/failed)
7. **Event Publish** (transaction.created/completed)
8. **Credit Update** (auto-record payment event)
9. **Karma Award** (onTimePayment karma)

### Reversal
- Creates linked reverse transaction
- Original marked as `reversed`
- Reference back to original in metadata
- Cannot reverse an already-reversed transaction

## 5. Escrow Service

### Lifecycle States
- `held` → Funds locked in escrow
- `released` → Funds delivered to payee
- `refunded` → Funds returned to payer
- `disputed` → Funds frozen pending resolution

### Use Cases
- Service marketplace (pay on delivery)
- Multi-party transactions
- Conditional payments
- Refundable transactions
- Agent-to-agent task payments

### Operations
- **Hold:** Create payment + transfer to escrow + mark held
- **Release:** Verify conditions + transfer to payee
- **Refund:** Return to payer (with reason)
- **Dispute:** Freeze + link to dispute ID

### Conditions Tracking
- Each escrow has list of release conditions
- Conditions documented in escrow record
- Conditions metadata for audit trail

## 6. Agent Economic Profile

### Profile Components
- **Karma:** Full karma record
- **Credit:** Full credit record
- **Accounts:** All accounts owned by agent
- **Trust Score:** From trust-scorer (proxied to credit score)
- **Total Volume:** Lifetime credit volume
- **Net Flow:** Current balance across accounts
- **Status:** newcomer / active / veteran / suspended

### Status Determination
- `newcomer`: <50 karma AND <500 credit
- `active`: 50-999 karma OR 500-699 credit
- `veteran`: ≥1000 karma OR ≥700 credit
- `suspended`: Account frozen (via API)

### Summary Endpoint
Provides at-a-glance financial health:
- Karma (total + tier)
- Credit (score + tier)
- Accounts (count + balance + held)
- Transactions (count + volume)
- Escrows (held/released/disputed)
- Status

## 7. Event Bus Integration

### 14 Published Topics
All economic events flow through the event bus for:
- Real-time notifications
- Audit logging
- Cross-service coordination
- Memory layer ingestion
- Analytics pipelines

### Event Payload Standardization
- `source`: Always "rez-economy-os"
- `timestamp`: ISO 8601
- `data`: Event-specific payload
- Topic pattern: `economy.{entity}.{action}`

## 8. Statistics & Analytics

### Karma Statistics
- Total agents with karma
- Distribution by tier
- Average karma
- Top agent

### Credit Statistics
- Total agents with credit
- Average score
- Distribution by tier

### Account Statistics
- Total accounts
- Distribution by type
- Total balance held

### Transaction Statistics
- Total transactions
- Distribution by status
- Distribution by type
- Total volume (USD)

### Escrow Statistics
- Total escrows
- Distribution by status
- Total amount held (USD)

## 9. Security & Validation

- All inputs validated via `validators/schemas.ts`
- Custom error classes for precise error handling
- No SQL injection risk (in-memory storage)
- Helmet middleware for HTTP security
- CORS configured
- Request logging with timing

## 10. Operational Features

- Graceful shutdown on SIGTERM/SIGINT
- Unhandled rejection logging
- Health check endpoint (`/health`)
- Service info at root (`/`)
- Per-route error handling
- Decimal precision: 4 places (configurable)

## Service Mesh Integration

This service **connects** to:
- **Event Bus (4510):** Publishes all economic events
- **Trust Scorer (4180):** Reads trust scores (future: full integration)
- **Wallet Service (4004):** Settlement reconciliation (future)
- **GoalOS (4242):** Economic goals tracking (future)

This service is **consumed by**:
- Industry OS (payment processing)
- Agent Marketplaces (escrow holds)
- Negotiation Engine (4191) (post-negotiation transactions)
- Trust Scorer (4180) (economic signals)
- Memory Layer (event ingestion)
