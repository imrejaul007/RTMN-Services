# ACP — Agent Commerce Protocol Specification

**Version:** 2.0
**Status:** Stable
**Service:** `acp-protocol` (port 4800)
**Last updated:** 2026-06-22

ACP is the wire protocol that SUTAR agents use to negotiate and execute
commerce transactions. This document is the normative reference. It is
deliberately implementation-agnostic: any agent that speaks HTTP + JSON
can implement it.

---

## 1. Overview

ACP messages are JSON objects sent over HTTP POST. Every message belongs
to a **negotiation**, which is a stateful conversation between two agents
identified by their SUTAR agent IDs.

### 1.1 Transport

- **HTTP** with `Content-Type: application/json`
- **Auth**: `Authorization: Bearer <token>` (issued by SUTAR identity service)
- **Endpoint**: `POST /api/acp/messages`

### 1.2 Message envelope

Every ACP message has the same top-level shape:

```json
{
  "id": "MSG-uuid8",
  "type": "QUERY",
  "sender": "agent-genie-001",
  "receiver": "agent-restaurant-42",
  "negotiationId": "NEG-uuid8",
  "timestamp": "2026-06-22T10:30:00.000Z",
  "...": "type-specific fields"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | server-assigned | Returned by the service after first POST |
| `type` | string | yes | One of 8 types — see §2 |
| `sender` | string | yes | SUTAR agent ID |
| `receiver` | string | yes | SUTAR agent ID |
| `negotiationId` | string | server-assigned on first message | Same value for the whole conversation |
| `timestamp` | string (ISO-8601) | server-assigned | When the message was received |

---

## 2. Message Types

### 2.1 QUERY

**Purpose:** Consumer asks a merchant about a product or service.

**Required fields:**

```json
{
  "type": "QUERY",
  "sender": "agent-A",
  "receiver": "agent-B",
  "intent": "order_pizza",
  "context": { /* domain-specific */ }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `intent` | string | Domain verb (e.g. `order_pizza`, `book_room`, `compare_price`) |
| `context` | object | Free-form payload understood by the merchant's domain |

**Optional fields:** `constraints`, `timeline`, `attachments`

**Valid responses:** `QUOTE`, `REJECT`

---

### 2.2 QUOTE

**Purpose:** Merchant responds with an offer.

**Required fields:**

```json
{
  "type": "QUOTE",
  "sender": "agent-B",
  "receiver": "agent-A",
  "offer": {
    "items": [{ "sku": "PIZ-MARG", "qty": 2, "price": 12.50 }],
    "total": 25.00,
    "currency": "USD"
  },
  "terms": {
    "delivery": "30min",
    "paymentMethods": ["card", "wallet"]
  }
}
```

**Optional fields:** `validUntil`, `alternatives`, `negotiableFields`

**Valid responses:** `COUNTER`, `ACCEPT`, `REJECT`, `ORDER`

---

### 2.3 COUNTER

**Purpose:** Either party proposes different terms.

**Required fields:**

```json
{
  "type": "COUNTER",
  "sender": "agent-A",
  "receiver": "agent-B",
  "offer": { /* new offer */ },
  "terms": { /* new terms */ },
  "previousOffer": { /* what was countered */ }
}
```

**Valid responses:** `COUNTER`, `ACCEPT`, `REJECT`

---

### 2.4 ACCEPT

**Purpose:** Accept the current terms (locks in the negotiation).

**Required fields:**

```json
{
  "type": "ACCEPT",
  "sender": "agent-A",
  "receiver": "agent-B",
  "acceptedOffer": { /* the offer being accepted */ }
}
```

**Valid responses:** `ORDER` (from the consumer)

---

### 2.5 REJECT

**Purpose:** End the negotiation without a deal.

**Required fields:**

```json
{
  "type": "REJECT",
  "sender": "agent-A",
  "receiver": "agent-B",
  "reason": "price_too_high"
}
```

**Valid responses:** None — this terminates the negotiation.

---

### 2.6 ORDER

**Purpose:** Consumer confirms an order against an accepted quote.

**Required fields:**

```json
{
  "type": "ORDER",
  "sender": "agent-A",
  "receiver": "agent-B",
  "quoteId": "MSG-uuid8",
  "paymentMethod": "wallet",
  "deliveryAddress": { /* or deliveryTarget */ }
}
```

**Valid responses:** `TRACK`, `DISPUTE`

---

### 2.7 TRACK

**Purpose:** Consumer polls the order status.

**Required fields:**

```json
{
  "type": "TRACK",
  "sender": "agent-A",
  "receiver": "agent-B",
  "orderId": "ORD-uuid8"
}
```

**Valid responses:** `TRACK` (with updated status), `DISPUTE`

---

### 2.8 DISPUTE

**Purpose:** Either party raises a problem with an in-flight or completed order.

**Required fields:**

```json
{
  "type": "DISPUTE",
  "sender": "agent-A",
  "receiver": "agent-B",
  "orderId": "ORD-uuid8",
  "category": "not_delivered | damaged | wrong_item | other",
  "evidence": [/* urls or base64 attachments */]
}
```

**Valid responses:** Resolution is out-of-band (handled by the dispute-resolution service).

---

## 3. Negotiation State Machine

A negotiation moves through these states:

| State | Entered when | Valid next states |
|-------|--------------|-------------------|
| `INITIATED` | First QUERY received | `QUOTED`, `REJECTED` |
| `QUOTED` | A QUOTE was sent | `COUNTERED`, `ACCEPTED`, `REJECTED`, `ORDERED` |
| `COUNTERED` | A COUNTER was sent | `COUNTERED`, `ACCEPTED`, `REJECTED` |
| `ACCEPTED` | ACCEPT was received | `ORDERED` |
| `ORDERED` | ORDER was received | `TRACKING`, `DISPUTED`, `COMPLETED` |
| `TRACKING` | TRACK message exchanged | `TRACKING`, `COMPLETED`, `DISPUTED` |
| `DISPUTED` | DISPUTE was raised | (handled by dispute-resolution) |
| `COMPLETED` | Order fulfilled and accepted | (terminal) |
| `REJECTED` | REJECT was sent | (terminal) |
| `EXPIRED` | No activity within timeout | (terminal) |
| `CANCELLED` | One party explicitly cancelled | (terminal) |

The full state machine:

```
                ┌──────────────┐
                │  INITIATED   │ ◄── QUERY received
                └──────┬───────┘
                       │
              QUOTE    │        REJECT
        ┌──────────────┼──────────────┐
        ▼              │              ▼
   ┌─────────┐         │        ┌──────────┐
   │ QUOTED  │         │        │ REJECTED │ (terminal)
   └────┬────┘         │        └──────────┘
        │              │
        │ ACCEPT       │
        ▼              │
   ┌─────────┐         │
   │ ACCEPTED│         │
   └────┬────┘         │
        │ ORDER        │
        ▼              │
   ┌─────────┐         │
   │ ORDERED │         │
   └────┬────┘         │
        │              │
        │ TRACK        │
        ▼              │
   ┌──────────┐        │
   │ TRACKING │        │
   └────┬─────┘        │
        │              │
   ┌────┴────┐         │
   ▼         ▼         │
COMPLETED  DISPUTED ──►│ (handled by
 (terminal)  │           dispute-resolution)
            ▼
       (resolution)
```

---

## 4. Validation Rules

The service rejects (HTTP 400) any message that violates:

1. **Type-specific required fields** — see §2 for each type.
2. **State transition** — the message type must be a valid successor of the current state.
3. **Sender / receiver order** — the receiver of message N must equal the sender of message N-1.
4. **Single in-flight** — at most one active negotiation per (sender, receiver, intent) tuple.

Validation errors return:

```json
{
  "error": "validation_failed",
  "code": "MISSING_FIELD",
  "field": "offer.items",
  "message": "QUOTE message requires offer.items array"
}
```

---

## 5. Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `INVALID_TYPE` | Unknown message type |
| 400 | `MISSING_FIELD` | Required field absent |
| 400 | `INVALID_TRANSITION` | Type not valid from current negotiation state |
| 401 | `UNAUTHENTICATED` | Missing or invalid token |
| 403 | `NOT_PARTICIPANT` | Sender is not part of the negotiation |
| 404 | `UNKNOWN_NEGOTIATION` | Negotiation ID doesn't exist |
| 409 | `DUPLICATE_NEGOTIATION` | Active negotiation already exists for this tuple |
| 429 | `RATE_LIMITED` | Slow down |
| 500 | `INTERNAL_ERROR` | Server-side failure |

---

## 6. Example Trace

A complete price-compare → buy → track trace:

```http
POST /api/acp/messages
{
  "type": "QUERY",
  "sender": "agent-genie-001",
  "receiver": "agent-restaurant-42",
  "intent": "order_pizza",
  "context": { "items": [{ "sku": "PIZ-MARG", "qty": 1 }] }
}
→ 201 { "id": "MSG-1", "negotiationId": "NEG-1" }


POST /api/acp/messages
{
  "type": "QUOTE",
  "sender": "agent-restaurant-42",
  "receiver": "agent-genie-001",
  "negotiationId": "NEG-1",
  "offer": { "items": [{ "sku": "PIZ-MARG", "qty": 1, "price": 12.50 }], "total": 12.50, "currency": "USD" },
  "terms": { "delivery": "30min" }
}
→ 201 { "id": "MSG-2", "negotiationId": "NEG-1" }


POST /api/acp/messages
{
  "type": "COUNTER",
  "sender": "agent-genie-001",
  "receiver": "agent-restaurant-42",
  "negotiationId": "NEG-1",
  "offer": { "items": [{ "sku": "PIZ-MARG", "qty": 1, "price": 10.00 }], "total": 10.00, "currency": "USD" },
  "terms": { "delivery": "30min" },
  "previousOffer": { /* the QUOTE we countered */ }
}
→ 201 { "id": "MSG-3" }


POST /api/acp/messages
{
  "type": "ACCEPT",
  "sender": "agent-restaurant-42",
  "receiver": "agent-genie-001",
  "negotiationId": "NEG-1",
  "acceptedOffer": { /* the COUNTER */ }
}
→ 201 { "id": "MSG-4" }


POST /api/acp/messages
{
  "type": "ORDER",
  "sender": "agent-genie-001",
  "receiver": "agent-restaurant-42",
  "negotiationId": "NEG-1",
  "quoteId": "MSG-3",
  "paymentMethod": "wallet"
}
→ 201 { "id": "MSG-5", "orderId": "ORD-xyz" }


POST /api/acp/messages
{
  "type": "TRACK",
  "sender": "agent-genie-001",
  "receiver": "agent-restaurant-42",
  "negotiationId": "NEG-1",
  "orderId": "ORD-xyz"
}
→ 201 { "id": "MSG-6", "status": "out_for_delivery" }
```

---

## 7. Versioning

This is ACP v2.0. Breaking changes (new required fields, removed types,
new state transitions) require a major version bump. Additive changes
(new optional fields, new valid transitions from existing states) are
backwards-compatible and don't bump the version.

---

## 8. References

- Service: `sutar-os/agents/acp-protocol/src/index.js`
- Source-of-truth for validation: `MESSAGE_TYPES` constant in the service
- Negotiation states: `NEGOTIATION_STATES` constant in the service
- Related: `negotiation-ai` service implements ML strategies for COUNTER messages
- Related: `dispute-resolution` service handles DISPUTE outcomes