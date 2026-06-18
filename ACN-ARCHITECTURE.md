# Agent Commerce Network (ACN) - Complete Architecture

> **Version:** 2.0.0
> **Status:** ✅ ALL PHASES COMPLETE
> **Last Updated:** June 18, 2026

---

## 🎯 Executive Summary

The **Agent Commerce Network (ACN)** is a revolutionary platform where AI agents become the primary economic actors. Every business has a **Merchant AI (SUTAR OS)** and every consumer has a **Genie AI** - these agents communicate directly to negotiate, purchase, and transact autonomously.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      AGENT COMMERCE NETWORK (ACN)                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          CONSUMER LAYER                                  │   │
│   │                                                                          │   │
│   │   ┌─────────────┐     ┌─────────────────────┐                          │   │
│   │   │   DO App    │────►│  Genie Shopping AI  │                          │   │
│   │   │  (User UI)  │     │  (Port 4716)        │                          │   │
│   │   └─────────────┘     └──────────┬──────────┘                          │   │
│   │                                  │                                       │   │
│   └──────────────────────────────────┼──────────────────────────────────────┘   │
│                                      │                                           │
│                                      ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          ACP PROTOCOL (Port 4800)                        │   │
│   │                                                                          │   │
│   │   Message Types: QUERY │ QUOTE │ COUNTER │ ACCEPT │ REJECT │ ORDER    │   │
│   │                       │ TRACK │ DISPUTE                                 │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                         │
│                                        ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          ACN NETWORK (Port 4801)                          │   │
│   │                                                                          │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │   │
│   │   │ Agent       │  │ Capability   │  │ Agent        │                   │   │
│   │   │ Registry    │  │ Discovery    │  │ Matching     │                   │   │
│   │   └──────────────┘  └──────────────┘  └──────────────┘                   │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                         │
│                                        ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          MERCHANT LAYER                                  │   │
│   │                                                                          │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│   │   │ Restaurant │  │   Hotel     │  │   Retail    │  │ Healthcare  │    │   │
│   │   │     AI     │  │     AI      │  │     AI      │  │     AI      │    │   │
│   │   │ (Port 4810)│  │ (Port 4810) │  │ (Port 4810) │  │ (Port 4810) │    │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│   │                                                                          │   │
│   │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│   │   │                    SUTAR OS (Port 4810)                         │   │   │
│   │   │         Industry-Specific Merchant AI Templates                   │   │   │
│   │   └─────────────────────────────────────────────────────────────────┘   │   │
│   └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          FOUNDATION LAYER                                  │   │
│   │                                                                          │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │   │
│   │   │ Agent        │  │ Agent        │  │ Agent        │                   │   │
│   │   │ Reputation   │  │ Contracts    │  │ Wallets      │                   │   │
│   │   │ (Port 4820) │  │ (Port 4830) │  │ (Port 4840) │                   │   │
│   │   └──────────────┘  └──────────────┘  └──────────────┘                   │   │
│   │                                                                          │   │
│   │   ┌────────────────────────────────────────────────────────────────┐    │   │
│   │   │                 TRUST & PAYMENT LAYER                          │    │   │
│   │   │         Reputation │ Escrow │ Settlement │ Disputes           │    │   │
│   │   └────────────────────────────────────────────────────────────────┘    │   │
│   └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Components

### Core Services

| Service | Port | Purpose |
|---------|------|---------|
| [ACP Protocol](services/acp-protocol/) | 4800 | Standardized messaging for AI-to-AI negotiations |
| [ACN Network](services/acn-network/) | 4801 | Agent registry, discovery, and routing |
| [Genie Shopping Agent](services/genie-shopping-agent/) | 4716 | Consumer's personal AI shopping assistant |
| [Merchant Agents](services/merchant-agents/) | 4810 | SUTAR OS - Business AI agents |
| [Agent Reputation](services/agent-reputation/) | 4820 | Trust scores for AI agents |
| [Agent Contracts](services/agent-contracts/) | 4830 | Smart contracts for transactions |
| [Agent Wallets](services/agent-wallets/) | 4840 | Digital wallets for agent payments |

---

## 🔄 ACP Protocol (Port 4800)

### Message Types

```
┌────────────────────────────────────────────────────────────────┐
│                    ACP MESSAGE FLOW                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BUYER (Genie AI)              SELLER (Merchant AI)            │
│           │                           │                        │
│           │────────── QUERY ──────────►                        │
│           │                           │                        │
│           │◄───────── QUOTE ───────────│                        │
│           │                           │                        │
│           │──────── COUNTER ──────────►                        │
│           │                           │                        │
│           │◄────── COUNTER ───────────│                        │
│           │                           │                        │
│           │─────── (repeat) ──────────►                       │
│           │                           │                        │
│           │──────── ACCEPT ──────────►                        │
│           │                           │                        │
│           │═══════════ ORDER ═════════════════►               │
│           │                           │                        │
│           │◄─────── TRACK ────────────│ (periodic)            │
│           │                           │                        │
│           │◄── DISPUTE (if needed) ───│                       │
│           │                           │                        │
└────────────────────────────────────────────────────────────────┘
```

### Message Definitions

| Type | Description | Valid Transitions |
|------|-------------|------------------|
| **QUERY** | Request product/service information | QUOTE, REJECT |
| **QUOTE** | Provide pricing and terms | COUNTER, ACCEPT, REJECT, ORDER |
| **COUNTER** | Counter-offer during negotiation | COUNTER, ACCEPT, REJECT, ORDER |
| **ACCEPT** | Accept current terms | ORDER, TRACK, DISPUTE |
| **REJECT** | Reject current terms | QUERY, NEW_NEGOTIATION |
| **ORDER** | Place order with agreed terms | TRACK, DISPUTE, REJECT |
| **TRACK** | Track order status | TRACK, DISPUTE, ACCEPT |
| **DISPUTE** | Raise a dispute | RESOLVE, ESCALATE, ARBITRATE |

### API Endpoints

```bash
# Create negotiation
POST /api/negotiations
{
  "buyerAgent": "genie-user123",
  "sellerAgent": "tech-store-ai",
  "context": { "product": "laptop" },
  "initialQuery": { "intent": "buy laptop", "constraints": { "maxPrice": 1000 } }
}

# Send quote
POST /api/negotiations/:id/quote
{
  "offer": { "price": 899.99, "quantity": 1 },
  "terms": { "deliveryDate": "2026-06-25", "warranty": "1 year" },
  "validUntil": "2026-06-19T12:00:00Z"
}

# Counter offer
POST /api/negotiations/:id/counter
{
  "counterOffer": { "price": 850.00 },
  "reasoning": "Lower price for bulk purchase"
}

# Accept terms
POST /api/negotiations/:id/accept

# Place order
POST /api/negotiations/:id/order
{
  "deliveryAddress": { "street": "...", "city": "...", "zip": "..." }
}

# Track order
POST /api/negotiations/:id/track
{
  "milestones": [
    { "name": "Shipped", "status": "completed", "timestamp": "..." },
    { "name": "Delivered", "status": "pending" }
  ]
}

# Raise dispute
POST /api/negotiations/:id/dispute
{
  "reason": "Product not as described",
  "evidence": ["photo1.jpg", "description.pdf"]
}
```

---

## 🌐 ACN Network (Port 4801)

### Agent Registry

```
┌────────────────────────────────────────────────────────────────┐
│                    AGENT TYPES                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐                                            │
│  │     GENIE      │  Consumer personal AI                      │
│  │                │  • Shopping assistant                      │
│  │  Port: 4716    │  • Price negotiation                      │
│  └────────────────┘  • Order management                       │
│                       • Preference learning                     │
│  ┌────────────────┐                                            │
│  │    MERCHANT    │  Business AI (SUTAR OS)                    │
│  │                │  • 26 industry templates                  │
│  │  Port: 4810    │  • Autonomous negotiation                  │
│  └────────────────┘  • Order fulfillment                       │
│                       • Dynamic pricing                         │
│  ┌────────────────┐                                            │
│  │    SYSTEM      │  RTMN internal agents                      │
│  │   (Internal)   │  • Reputation tracking                    │
│  └────────────────┘  • Contract management                     │
│                       • Escrow services                         │
│  ┌────────────────┐                                            │
│  │    PARTNER     │  External partner agents                   │
│  │                │  • Payment processors                      │
│  └────────────────┘  • Logistics providers                    │
│                       • Verification services                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Industry Templates

| Industry | Capabilities | Default Rules |
|----------|--------------|---------------|
| Restaurant | Reservation, Order, Delivery, Takeout, Catering | Min $15, Max 15% discount |
| Hotel | Booking, Check-in, Room Service, Concierge | Min $50, Max 25% discount |
| Retail | Product Search, Shipping, Returns, Refunds | Min $10, Free shipping >$50 |
| Healthcare | Appointment, Consultation, Prescription | No returns, 10% max discount |
| Travel | Booking, Cancellation, Insurance | Min $100, 20% discount |
| +20 more | ... | ... |

### API Endpoints

```bash
# Register Genie agent
POST /api/agents/genie
{
  "userId": "user-123",
  "preferences": {
    "shoppingStyle": "smart",
    "negotiationLevel": "moderate",
    "budget": { "daily": 200, "monthly": 2000 }
  }
}

# Register Merchant agent
POST /api/agents/merchant
{
  "businessId": "biz-456",
  "businessName": "Tech Store",
  "industry": "retail",
  "capabilities": ["product_search", "negotiation", "order_placement"]
}

# Search agents
POST /api/agents/search
{
  "type": "merchant",
  "industry": "retail",
  "capabilities": ["negotiation", "order_placement"],
  "minRating": 4.0
}

# Find agents by capability
GET /api/agents/capability/NEGOTIATION

# Get recommendations
POST /api/recommend
{
  "intent": "buy",
  "industry": "restaurant",
  "budget": 50
}
```

---

## 🛒 Genie Shopping Agent (Port 4716)

### Shopping Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GENIE SHOPPING FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. USER REQUEST                                                     │
│     "Find me a laptop under $1000 with fast shipping"               │
│            │                                                         │
│            ▼                                                         │
│  2. INTENT PARSING                                                  │
│     intent: purchase                                                 │
│     constraints: maxPrice=1000, fastShipping=true                    │
│            │                                                         │
│            ▼                                                         │
│  3. PRODUCT SEARCH                                                   │
│     Query ACN Network for matching merchants                         │
│     Filter by capabilities, ratings, price                           │
│            │                                                         │
│            ▼                                                         │
│  4. COMPARISON                                                       │
│     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│     │  Store A    │  │  Store B    │  │  Store C    │             │
│     │  $999       │  │  $949       │  │  $979       │             │
│     │  4.5★ 230   │  │  4.7★ 500   │  │  4.2★ 1000  │             │
│     │  2-day ship │  │  4-day ship │  │  1-day ship │             │
│     └─────────────┘  └─────────────┘  └─────────────┘             │
│            │                                                         │
│            ▼                                                         │
│  5. RECOMMENDATION                                                   │
│     "Best value: Store B at $949 with 4.7★ rating"                  │
│            │                                                         │
│            ▼                                                         │
│  6. NEGOTIATION (if requested)                                       │
│     Send QUERY → Receive QUOTE → Counter → Accept                    │
│            │                                                         │
│            ▼                                                         │
│  7. ORDER PLACEMENT                                                  │
│     "Order placed! Confirmation #ORD-12345"                         │
│            │                                                         │
│            ▼                                                         │
│  8. TRACKING                                                         │
│     "Your order is shipped. ETA: June 20"                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### API Endpoints

```bash
# Natural language shopping
POST /api/shop
{
  "userId": "user-123",
  "message": "Find me a laptop under $1000 with fast shipping"
}

# Start negotiation
POST /api/negotiate
{
  "sessionId": "sess-abc123",
  "merchantId": "merchant-456",
  "targetPrice": 850
}

# Process counter
POST /api/negotiate/:id/counter
{
  "counterPrice": 875
}

# Place order
POST /api/order
{
  "sessionId": "sess-abc123",
  "paymentDetails": {
    "method": "wallet",
    "shippingAddress": "..."
  }
}

# Get recommendations
GET /api/recommendations/:userId
```

---

## 🏪 Merchant Agents / SUTAR OS (Port 4810)

### Industry-Specific AI

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUTAR OS - INDUSTRY TEMPLATES                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  RESTAURANT AI                                                      │
│  ├── Menu Management                                                │
│  ├── Reservation System                                             │
│  ├── Order Processing (Dine-in/Takeout/Delivery)                   │
│  ├── Table Management                                               │
│  └── Kitchen Display Integration                                    │
│                                                                      │
│  HOTEL AI                                                           │
│  ├── Room Booking & Availability                                    │
│  ├── Check-in/Check-out Automation                                  │
│  ├── Room Service Orders                                            │
│  ├── Concierge Services                                             │
│  └── Revenue Management                                             │
│                                                                      │
│  RETAIL AI                                                          │
│  ├── Product Catalog Management                                     │
│  ├── Inventory Control                                              │
│  ├── Dynamic Pricing                                                 │
│  ├── Shipping & Delivery Coordination                               │
│  └── Returns & Refunds Processing                                    │
│                                                                      │
│  HEALTHCARE AI                                                      │
│  ├── Appointment Scheduling                                         │
│  ├── Patient Intake                                                  │
│  ├── Prescription Management                                        │
│  ├── Lab Test Booking                                               │
│  └── Telemedicine Integration                                        │
│                                                                      │
│  TRAVEL AI                                                          │
│  ├── Flight/Hotel Booking                                           │
│  ├── Itinerary Management                                           │
│  ├── Cancellation Handling                                           │
│  ├── Travel Insurance                                                │
│  └── Refund Processing                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Negotiation Rules

| Rule | Description | Default |
|------|-------------|---------|
| `maxDiscount` | Maximum discount allowed | 20% |
| `autoAcceptThreshold` | Auto-accept if within X% of target | 5% |
| `negotiationRounds` | Maximum counter rounds | 5 |
| `minOrderValue` | Minimum order amount | $0-$100 |
| `acceptReturns` | Allow returns | varies |

### API Endpoints

```bash
# Create restaurant AI
POST /api/merchants/restaurant
{
  "businessId": "restaurant-123",
  "businessName": "Pizza Palace",
  "rules": {
    "minOrderValue": 15,
    "maxDiscount": 0.15
  },
  "catalog": [
    {
      "name": "Margherita Pizza",
      "price": 14.99,
      "category": "pizza"
    }
  ]
}

# Handle incoming message
POST /api/merchants/:id/message
{
  "type": "QUERY",
  "sender": "genie-user123",
  "negotiationId": "neg-789",
  "intent": "Order 2 large pizzas",
  "constraints": { "quantity": 2, "size": "large" }
}
```

---

## 🏆 Agent Reputation (Port 4820)

### Trust Score Calculation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REPUTATION FACTORS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Overall Score = Σ(Factor × Weight)                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Factor             │ Weight │ Description                    │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ Transaction Success│  30%   │ Successful vs failed txns    │   │
│  │ Response Time      │  15%   │ Speed of agent responses      │   │
│  │ Dispute Rate       │  20%   │ Low dispute = high score      │   │
│  │ Identity Verified  │  15%   │ KYC/verification status       │   │
│  │ Longevity          │  10%   │ Time in the network           │   │
│  │ Consistency        │  10%   │ Behavior consistency          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Trust Levels

| Level | Score Range | Badge | Benefits |
|-------|-------------|-------|----------|
| Platinum | 90-100 | 🏆 | Priority routing, lower fees |
| Gold | 80-89 | ⭐ | Enhanced visibility |
| Silver | 70-79 | 🥈 | Standard access |
| Bronze | 50-69 | 🥉 | Basic access |
| Iron | 30-49 | ⚙️ | Restricted |
| Restricted | 0-29 | ⚠️ | Under review |

### Badges

| Badge | Icon | Requirement | Points |
|-------|------|-------------|--------|
| Verified | ✓ | KYC completed | +10 |
| Top Rated | ⭐ | Score ≥ 80 | +15 |
| Trusted | 🛡️ | Score ≥ 90 | +20 |
| Power Seller | ⚡ | 100+ transactions | +25 |
| Newcomer | 🌱 | < 1 transaction | 0 |
| Caution | ⚠️ | Score < 40 | -20 |
| Blocked | 🚫 | Policy violation | -100 |

### API Endpoints

```bash
# Get trust score
GET /api/reputation/:agentId/trust

# Record transaction
POST /api/reputation/:agentId/transactions
{
  "success": true,
  "volume": 299.99,
  "responseTime": 2.5,
  "type": "purchase"
}

# Verify agent
POST /api/reputation/:agentId/verify
{
  "verifiedBy": "admin",
  "level": "business"
}

# Get leaderboard
GET /api/leaderboard?type=merchant&limit=10
```

---

## 📄 Agent Contracts (Port 4830)

### Contract Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTRACT LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌───────────────────┐    ┌─────────┐              │
│  │  DRAFT   │───►│ PENDING_SIGNATURES│───►│ ACTIVE  │              │
│  └──────────┘    └───────────────────┘    └────┬────┘              │
│                                                 │                   │
│                                                 ▼                   │
│  ┌───────────┐    ┌─────────────┐    ┌─────────────────┐           │
│  │ CANCELLED │◄───│  DISPUTED   │◄───│  IN_PROGRESS    │           │
│  └───────────┘    └──────┬──────┘    └────────┬────────┘           │
│                          │                     │                    │
│                          ▼                     ▼                    │
│                   ┌──────────────────────────────┐                  │
│                   │         FULFILLED           │                  │
│                   └──────────────┬───────────────┘                  │
│                                  │                                  │
│                                  ▼                                  │
│                           ┌───────────┐                           │
│                           │ COMPLETED │                           │
│                           └───────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Contract Features

| Feature | Description |
|---------|-------------|
| Multi-party Signatures | Buyer + Seller digital signatures |
| Escrow | Funds held until fulfillment verified |
| Milestones | Track progress of multi-step contracts |
| Auto-fulfillment | Verify delivery confirmation |
| Dispute Handling | Trigger resolution workflow |

### API Endpoints

```bash
# Create from negotiation
POST /api/contracts/from-negotiation
{
  "negotiationId": "neg-123",
  "buyerAgent": "genie-user123",
  "sellerAgent": "tech-store-ai",
  "terms": {
    "product": "Laptop",
    "price": 899.99,
    "deliveryDate": "2026-06-25"
  }
}

# Sign contract
POST /api/contracts/:id/sign
{
  "agentId": "genie-user123"
}

# Complete milestone
POST /api/contracts/:id/milestones/:milestoneId
{
  "proof": "tracking_number_ABC123"
}

# Raise dispute
POST /api/contracts/:id/dispute
{
  "raisedBy": "genie-user123",
  "reason": "Item not received",
  "evidence": ["screenshot1.png"]
}
```

---

## 💰 Agent Wallets (Port 4840)

### Wallet Operations

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WALLET OPERATIONS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐                                                    │
│  │  DEPOSIT   │  Add funds from bank/card/external                   │
│  └──────┬──────┘                                                    │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────┐                                                    │
│  │   WALLET   │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │  Balance   │  │   USD   │  │   EUR   │  │   INR   │             │
│  │            │  │ $1,234  │  │   €456  │  │ ₹78,900 │             │
│  └──────┬──────┘  └─────────┘  └─────────┘  └─────────┘             │
│         │                                                            │
│         ├────────────┬────────────┬────────────┐                     │
│         ▼            ▼            ▼            ▼                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  PAYMENT │  │ WITHDRAW │  │  ESCROW  │  │ SUBSCRIP │          │
│  │  To Agent│  │  To Bank │  │   Hold   │  │ Recurring │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Transaction Types

| Type | Description | Fee |
|------|-------------|-----|
| Deposit | Add funds | Free |
| Withdrawal | Withdraw to bank | $0.30 + 1.5% |
| Payment | Pay another agent | 2.9% + $0.30 |
| Escrow Hold | Reserve funds | 1% |
| Escrow Release | Release to seller | Included in escrow |
| Escrow Refund | Return to buyer | Free |

### API Endpoints

```bash
# Create wallet
POST /api/wallets
{
  "agentId": "merchant-123",
  "name": "Tech Store Revenue",
  "initialBalances": { "USD": 1000 }
}

# Deposit
POST /api/wallets/:id/deposit
{
  "amount": 500,
  "currency": "USD",
  "source": { "type": "bank", "reference": "txn-abc" }
}

# Pay another agent
POST /api/wallets/:id/pay
{
  "toAgentId": "genie-user123",
  "amount": 100,
  "currency": "USD",
  "memo": "Refund for order #123"
}

# Hold escrow
POST /api/wallets/:id/escrow
{
  "amount": 899.99,
  "currency": "USD",
  "contractId": "CTR-123"
}

# Release escrow
POST /api/escrow/:escrowId/release
{
  "releaseToAgentId": "merchant-123"
}
```

---

## 🔄 Complete Shopping Flow Example

### Scenario: Genie buys a laptop from Tech Store

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPLETE SHOPPING FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: User Request (DO App → Genie Shopping Agent)                      │
│  ───────────────────────────────────────────────────────────────            │
│  User: "Hey Genie, find me a good laptop under $1000"                       │
│                                                                             │
│  STEP 2: Product Search (Genie → ACN Network)                              │
│  ───────────────────────────────────────────────────────────────            │
│  Query: { type: "merchant", industry: "retail",                            │
│           capabilities: ["negotiation", "product_search"] }                 │
│                                                                             │
│  Result: Tech Store AI (rating: 4.7, verified: true)                      │
│                                                                             │
│  STEP 3: Negotiation Start (Genie → ACP Protocol → Tech Store)              │
│  ───────────────────────────────────────────────────────────────            │
│  QUERY:                                                                     │
│  {                                                                           │
│    intent: "Purchase laptop",                                                │
│    constraints: { maxPrice: 1000, RAM: "16GB", SSD: "512GB" }             │
│  }                                                                           │
│                                                                             │
│  QUOTE:                                                                     │
│  {                                                                           │
│    offer: { price: 999.99, product: "MacBook Air" },                       │
│    terms: { delivery: "2 days", warranty: "1 year" },                       │
│    validUntil: "2026-06-19T12:00:00Z"                                       │
│  }                                                                           │
│                                                                             │
│  STEP 4: Counter-Offer                                                      │
│  ───────────────────────────────────────────────────────────────            │
│  COUNTER: { counterOffer: { price: 899.99 }, reasoning: "Better price?" }  │
│  COUNTER: { counterOffer: { price: 925.00 }, reasoning: "Our best" }      │
│  ACCEPT: { }                                                               │
│                                                                             │
│  STEP 5: Contract Creation (ACP → Agent Contracts)                         │
│  ───────────────────────────────────────────────────────────────            │
│  Contract: CTR-20260618-abc123                                              │
│  Terms: MacBook Air, $925.00, Delivery: June 20                            │
│  Status: ACTIVE → IN_PROGRESS                                               │
│                                                                             │
│  STEP 6: Escrow Hold (Contracts → Agent Wallets)                            │
│  ───────────────────────────────────────────────────────────────            │
│  Escrow: $925.00 held from Genie wallet                                    │
│  Status: HELD                                                               │
│                                                                             │
│  STEP 7: Order Fulfillment                                                 │
│  ───────────────────────────────────────────────────────────────            │
│  TRACK: Shipped via FedEx, Tracking: 123456789                            │
│  TRACK: Delivered to destination                                           │
│                                                                             │
│  STEP 8: Contract Completion                                               │
│  ───────────────────────────────────────────────────────────────            │
│  Buyer confirms receipt → FULFILLED                                        │
│  Escrow released to Tech Store → COMPLETED                                 │
│                                                                             │
│  STEP 9: Reputation Update                                                 │
│  ───────────────────────────────────────────────────────────────            │
│  Genie: +1 successful transaction, avg response: 2s                        │
│  Tech Store: +1 successful transaction, +$925 revenue                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
RTMN/
│
├── services/
│   │
│   ├── PHASE 1 - CORE (7 services)
│   │   ├── acp-protocol/              # ACP Protocol (Port 4800)
│   │   ├── acn-network/               # ACN Network (Port 4801)
│   │   ├── genie-shopping-agent/       # Genie Shopping (Port 4716)
│   │   ├── merchant-agents/           # SUTAR OS (Port 4810)
│   │   ├── agent-reputation/           # Reputation (Port 4820)
│   │   ├── agent-contracts/            # Smart Contracts (Port 4830)
│   │   └── agent-wallets/              # Digital Wallets (Port 4840)
│   │
│   ├── PHASE 2 - ENHANCED (5 services)
│   │   ├── agent-marketplace/         # Marketplace (Port 4845)
│   │   ├── agent-learning/             # ML Learning (Port 4846)
│   │   ├── dispute-resolution/         # Disputes (Port 4847)
│   │   ├── agent-analytics/            # Analytics (Port 4848)
│   │   └── acn-integration/            # RTMN Bridge (Port 4849)
│   │
│   ├── PHASE 3 - ADVANCED (3 services)
│   │   ├── negotiation-ai/             # Negotiation AI (Port 4850)
│   │   ├── agent-orchestration/        # Orchestration (Port 4851)
│   │   └── acn-hub/                    # ACN Hub Gateway (Port 4800)
│   │
│   └── [+] EXISTING RTMN SERVICES (50+)
│       ├── unified-os-hub/             # RTMN Unified Hub (Port 4399)
│       ├── sales-os/                   # Sales OS (Port 5055)
│       ├── [+] 50+ more...
│
└── ACN-ARCHITECTURE.md                  # This documentation
```

---

## 🚀 Quick Start

### Start All ACN Services

```bash
# Phase 1 - Core
cd services/acp-protocol && npm start              # Port 4800
cd services/acn-network && npm start               # Port 4801
cd services/genie-shopping-agent && npm start       # Port 4716
cd services/merchant-agents && npm start           # Port 4810
cd services/agent-reputation && npm start           # Port 4820
cd services/agent-contracts && npm start            # Port 4830
cd services/agent-wallets && npm start              # Port 4840

# Phase 2 - Enhanced
cd services/agent-marketplace && npm start         # Port 4845
cd services/agent-learning && npm start             # Port 4846
cd services/dispute-resolution && npm start         # Port 4847
cd services/agent-analytics && npm start            # Port 4848
cd services/acn-integration && npm start            # Port 4849

# Phase 3 - Advanced
cd services/negotiation-ai && npm start             # Port 4850
cd services/agent-orchestration && npm start        # Port 4851
cd services/acn-hub && npm start                    # Port 4800 (Gateway)
```

### Health Checks

```bash
# Phase 1
curl http://localhost:4800/health   # ACP Protocol
curl http://localhost:4801/health   # ACN Network
curl http://localhost:4716/health   # Genie Shopping
curl http://localhost:4810/health   # Merchant Agents
curl http://localhost:4820/health   # Agent Reputation
curl http://localhost:4830/health   # Agent Contracts
curl http://localhost:4840/health   # Agent Wallets

# Phase 2
curl http://localhost:4845/health   # Marketplace
curl http://localhost:4846/health   # Learning
curl http://localhost:4847/health   # Disputes
curl http://localhost:4848/health   # Analytics
curl http://localhost:4849/health   # Integration

# Phase 3
curl http://localhost:4850/health   # Negotiation AI
curl http://localhost:4851/health   # Orchestration
curl http://localhost:4800/info     # ACN Hub Gateway
```

### Quick Shopping Example

```bash
# 1. Get Genie shopping endpoint
curl http://localhost:4800/api/shop \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "product": "laptop", "maxPrice": 1000}'

# 2. Direct Genie shopping
curl http://localhost:4716/api/shop \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "message": "Find me a laptop under $1000"}'

# 3. Search merchants
curl http://localhost:4801/api/agents/search \
  -H "Content-Type: application/json" \
  -d '{"type": "merchant", "industry": "retail"}'

# 4. Start negotiation
curl http://localhost:4800/api/negotiations \
  -H "Content-Type: application/json" \
  -d '{"buyerAgent": "genie-user123", "sellerAgent": "tech-store-ai"}'
```

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Total Services | 15 |
| Phase 1 (Core) | 7 |
| Phase 2 (Enhanced) | 5 |
| Phase 3 (Advanced) | 3 |
| Total Ports | 4716, 4800-4851 |
| ACP Message Types | 8 |
| Agent Types | 4 (Genie, Merchant, System, Partner) |
| Industry Templates | 26 |
| Trust Levels | 6 |
| Reputation Badges | 7 |
| Orchestration Patterns | 6 |
| Negotiation Strategies | 5 |
| Workflow Templates | 2 |
| RTMN Services Connected | 26 |

---

## 🔮 Roadmap

### Phase 1 (DONE) ✅
- ACP Protocol - Message types for negotiation
- ACN Network - Agent registry and discovery
- Genie Shopping Agent - Consumer AI
- Merchant Agents - SUTAR OS
- Agent Reputation - Trust scoring
- Agent Contracts - Smart contracts
- Agent Wallets - Digital payments

### Phase 2 (DONE) ✅
- Agent Marketplace - Listings, reviews, promotions
- Agent Learning - Preference learning, strategy optimization
- Dispute Resolution - Arbitration, mediation, refunds
- Agent Analytics - Metrics, dashboards, alerts
- ACN Integration - Bridge to RTMN services

### Phase 3 (DONE) ✅
- Negotiation AI - Advanced ML strategies (competitive, collaborative, principled)
- Agent Orchestration - Multi-agent workflows (sequential, parallel, pipeline, fan-out, fan-in, conditional)
- ACN Hub Gateway - Unified entry point for all 15 services

### Phase 4 (Future)
- Real-time bidirectional WebSocket communication
- Blockchain integration for trustless contracts
- Computer vision agents (visual product search)
- Voice commerce agents (natural conversation)
- Quantum-secure cryptography for high-value contracts

---

*Last Updated: June 18, 2026*
*Agent Commerce Network - Where AI Agents Trade*
