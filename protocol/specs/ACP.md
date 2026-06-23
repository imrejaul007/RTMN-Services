# ACP — Agent Commerce Protocol

> **Version:** 0.1.0 (draft, 2026-06-23)
> **Status:** Open for community review. Not yet a 1.0.
> **License:** Apache-2.0
> **Spec home:** [protocol/specs/ACP.md](https://github.com/imrejaul007/RTMN-Services/blob/main/protocol/specs/ACP.md)

## 1. Purpose

ACP is a **JSON-over-HTTPS message protocol** that lets two software agents (one acting on behalf of a consumer, one acting on behalf of a business) negotiate a transaction, place an order, track delivery, and resolve disputes — without either party being RTMN-specific.

ACP is to **agent-to-agent commerce** what SMTP is to email: a thin, well-defined contract that any two implementations can speak.

## 2. Non-goals

- **Not a payment protocol.** Payments are out of scope — ACP assumes settlement happens out-of-band (bank rail, RABTUL wallet, crypto, etc.). ACP carries payment *references*, not payment *data*.
- **Not a discovery protocol.** Finding agents is a separate concern (use [Capability Graph](CAPABILITY-GRAPH.md) for that).
- **Not RTMN-specific.** Any HTTP-speaking agent can implement ACP. RTMN's `nexha-acp-messaging` service is the reference implementation.

## 3. Transport

- **HTTPS only.** Port 443. No plaintext.
- **POST /acp/v1/messages** — single endpoint per agent. The agent's base URL is its `endpoint` in the Capability Graph.
- **JSON request/response bodies.**
- **Mutual TLS optional** — recommended for high-trust flows but not required.

### Headers

Every request MUST carry:

| Header | Required | Description |
|--------|----------|-------------|
| `X-ACP-Agent-Id` | yes | The sender's agent ID (issuer's UUID) |
| `X-ACP-Message-Id` | yes | UUID for this specific message |
| `X-ACP-In-Reply-To` | no | The `messageId` of the message this responds to |
| `X-ACP-Signature` | yes (after v0.2) | HMAC-SHA256 of body, see §6 |
| `X-ACP-Timestamp` | yes | ISO-8601 UTC timestamp; receivers reject > 5min skew |
| `Content-Type` | yes | `application/json` |

## 4. Message envelope

Every message is a JSON object with the same envelope:

```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "inReplyTo": "7c9e6679-7425-40de-944b-e07fc1f90ae7",   // optional
  "type": "QUERY",                                       // see §5
  "from": { "agentId": "agt_abc", "tenantId": "t_x" },
  "to":   { "agentId": "agt_xyz", "tenantId": "t_y" },
  "threadId": "thr_123",                                 // groups a conversation
  "occurredAt": "2026-06-23T12:00:00Z",
  "payload": { /* type-specific, see §5 */ },
  "expiresAt": "2026-06-23T12:15:00Z"                   // optional
}
```

The `threadId` groups related messages. The first message in a conversation sets it; replies inherit it.

## 5. Message types

ACP defines 8 message types. Each transitions to specific allowed next types:

| Type | Purpose | Allowed next |
|------|---------|--------------|
| `QUERY` | Ask about a product/service | `QUOTE`, `REJECT` |
| `QUOTE` | Provide pricing + terms | `COUNTER`, `ACCEPT`, `REJECT` |
| `COUNTER` | Counter-offer | `COUNTER`, `ACCEPT`, `REJECT` |
| `ACCEPT` | Accept current terms | `ORDER`, `REJECT` |
| `REJECT` | Reject terms | (terminal — start new thread) |
| `ORDER` | Place order | `TRACK`, `DISPUTE` |
| `TRACK` | Order status update | `TRACK`, `DISPUTE` |
| `DISPUTE` | Raise a dispute | `RESOLVE`, `ESCALATE` |
| `RESOLVE` | Dispute resolution outcome | (terminal) |
| `ESCALATE` | Send to human arbitration | (terminal — human-mediated) |

Each message type has a type-specific `payload`. See [§5.1–5.8](#51-query).

### 5.1 QUERY

```json
{
  "type": "QUERY",
  "payload": {
    "productOrService": "Margherita pizza, 12 inch, gluten-free crust",
    "quantity": 2,
    "deliveryAddress": { "lat": 25.20, "lon": 55.27, "label": "Dubai Marina" },
    "desiredDeliveryAt": "2026-06-23T19:00:00Z",
    "constraints": { "maxPriceCents": 4500, "currency": "AED" }
  }
}
```

### 5.2 QUOTE

```json
{
  "type": "QUOTE",
  "payload": {
    "quoteId": "qt_abc",
    "items": [{
      "description": "Margherita pizza, 12 inch, gluten-free",
      "quantity": 2,
      "unitPriceCents": 2000,
      "totalCents": 4000
    }],
    "subtotalCents": 4000,
    "taxCents": 200,
    "deliveryCents": 300,
    "totalCents": 4500,
    "currency": "AED",
    "validUntil": "2026-06-23T12:30:00Z",
    "terms": "Payment due on delivery. Cancellation free up to 30 min before."
  }
}
```

### 5.3 COUNTER

```json
{
  "type": "COUNTER",
  "payload": {
    "counterQuoteId": "qt_def",
    "items": [{ /* same shape as QUOTE items, with adjusted prices */ }],
    "totalCents": 4000,
    "rationale": "Volume discount for 2+ pizzas"
  }
}
```

### 5.4 ACCEPT

```json
{
  "type": "ACCEPT",
  "payload": {
    "acceptedQuoteId": "qt_abc",
    "paymentMethod": "rabtul_wallet",
    "paymentRef": "rw_xyz"
  }
}
```

### 5.5 REJECT

```json
{
  "type": "REJECT",
  "payload": {
    "reason": "out_of_stock",
    "message": "Gluten-free crust out of stock until tomorrow."
  }
}
```

### 5.6 ORDER

```json
{
  "type": "ORDER",
  "payload": {
    "orderId": "ord_123",
    "quoteId": "qt_abc",
    "totalCents": 4500,
    "currency": "AED",
    "paymentRef": "rw_xyz",
    "fulfillmentEta": "2026-06-23T19:30:00Z"
  }
}
```

### 5.7 TRACK

```json
{
  "type": "TRACK",
  "payload": {
    "orderId": "ord_123",
    "status": "out_for_delivery",   // placed | preparing | out_for_delivery | delivered
    "courierLocation": { "lat": 25.21, "lon": 55.26 },
    "estimatedArrival": "2026-06-23T19:25:00Z"
  }
}
```

### 5.8 DISPUTE

```json
{
  "type": "DISPUTE",
  "payload": {
    "disputeId": "dsp_1",
    "orderId": "ord_123",
    "reason": "wrong_items",
    "description": "Received pepperoni instead of margherita",
    "evidenceUrls": ["https://photos.example.com/abc.jpg"],
    "requestedResolution": "refund_or_replacement"
  }
}
```

## 6. Signing (planned for v0.2)

Every ACP request body SHOULD be signed:

```
X-ACP-Signature: sha256=<hex digest of HMAC-SHA256(secret, raw_body)>
```

The `secret` is shared out-of-band during agent onboarding (or via the Capability Graph's `secretRef` field — see [CAPABILITY-GRAPH.md](CAPABILITY-GRAPH.md)).

Receivers MUST verify with **timing-safe comparison** (`crypto.timingSafeEqual` in Node, `hmac.compare_digest` in Python).

## 7. Error handling

When a receiver cannot process a message, it returns an HTTP error with a JSON body:

```json
{
  "error": {
    "code": "INVALID_QUOTE",
    "message": "Quote qt_abc expired at 2026-06-23T12:30:00Z"
  }
}
```

Standard error codes:

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `INVALID_ENVELOPE` | Missing required envelope fields |
| 400 | `INVALID_PAYLOAD` | Type-specific payload failed schema validation |
| 401 | `UNAUTHENTICATED` | Missing or bad signature |
| 403 | `FORBIDDEN_TRANSITION` | Tried to send a message type not allowed from the current thread state |
| 408 | `TIMEOUT` | Receiver couldn't process in time |
| 410 | `THREAD_CLOSED` | Thread has been finalized |
| 429 | `RATE_LIMITED` | Too many requests |
| 503 | `UNAVAILABLE` | Receiver temporarily down (retry with backoff) |

## 8. Versioning

ACP versions are integers. The URL path includes the version (`/acp/v1/...`). Receivers MUST support at least one major version back.

Breaking changes require a major version bump. Additive changes (new optional payload fields, new error codes) are minor.

## 9. Reference implementation

The reference implementation lives at [`nexha-acp-messaging`](https://github.com/imrejaul007/RTMN-Services/tree/main/companies/Nexha/services/nexha-acp-messaging) in the RTMN monorepo. It implements the full spec with 78 vitest tests.

## 10. Sample SDKs

- **JavaScript / TypeScript**: [protocol/sample-sdk/acp-js/](../sample-sdk/acp-js/) — reference implementation in Node.
- **Python**: [protocol/sample-sdk/acp-python/](../sample-sdk/acp-python/) — reference implementation in Python 3.10+.

## 11. Contributing

Issues + PRs welcome at https://github.com/imrejaul007/RTMN-Services/issues.

Before proposing a breaking change, please open an issue tagged `acp-discussion` to gather feedback.