# ACP — Agent Commerce Protocol

**Port:** 4800
**Layer:** Agents
**Version:** 2.0.0
**Spec:** [SPEC.md](./SPEC.md)

ACP is the standardized messaging layer for AI-to-AI commerce in the SUTAR
ecosystem. It defines 8 message types and 12 negotiation states that any
agent — internal or external — can implement to participate in autonomous
transactions.

## Why ACP

Without a common protocol, every pair of agents needs custom integration
code to talk to each other. ACP eliminates that by providing:

- **8 message types** that cover the full commerce lifecycle (query → quote
  → counter → accept → order → track → dispute)
- **12 negotiation states** so agents can model multi-round negotiations
- **JSON wire format** that's language-agnostic and HTTP-transportable
- **Validation rules** that prevent malformed messages from poisoning a
  negotiation

## Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `QUERY` | consumer → merchant | "What can you offer for X?" |
| `QUOTE` | merchant → consumer | "Here's what I can offer" |
| `COUNTER` | either | Counter-propose different terms |
| `ACCEPT` | either | Accept current terms |
| `REJECT` | either | End the negotiation |
| `ORDER` | consumer → merchant | "Place an order on the accepted terms" |
| `TRACK` | consumer → merchant | "What's the status of my order?" |
| `DISPUTE` | either | "Something went wrong, escalate" |

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/acp/messages` | Send a message (starts or continues a negotiation) |
| `GET` | `/api/acp/messages/:id` | Get a message by ID |
| `GET` | `/api/acp/negotiations/:id` | Get a negotiation (full state machine) |
| `GET` | `/api/acp/negotiations` | List active negotiations |
| `POST` | `/api/acp/validate` | Validate a message against the type schema |

## Quick Start

Send a `QUERY` to start a negotiation:

```bash
curl -X POST http://localhost:4800/api/acp/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "QUERY",
    "sender": "agent-genie-001",
    "receiver": "agent-restaurant-42",
    "intent": "order_pizza",
    "context": {
      "items": [{ "sku": "PIZ-MARG", "qty": 2 }],
      "delivery": "ASAP"
    }
  }'
```

The service returns the message ID and the negotiation ID, which you can
poll via `GET /api/acp/negotiations/:id`.

## Negotiation State Machine

```
   QUERY ────────────────► QUOTE ────────────────► ACCEPT ─────────► ORDER ──► TRACK
     │                      │  ▲                   │  ▲                            │
     │                      │  │                   │  │                            │
     │                      ▼  │                   ▼  │                            ▼
     └─► REJECT ◄─────── COUNTER                  REJECT                        DISPUTE
```

## Validation

Every message is validated against the type schema before being accepted.
Required fields must be present, and the message type must be a valid
successor of the previous message in the negotiation. Invalid messages
are rejected with a 400 response and a detailed error.

## Persistence

Messages and negotiations are persisted via `PersistentMap` (file-backed
Map). They survive service restarts.

## Full Specification

See [SPEC.md](./SPEC.md) for the complete wire format, field definitions,
state-transition rules, and example traces.

## See Also

- [SPEC.md](./SPEC.md) — public protocol spec
- [acn-hub](../acn-hub/CLAUDE.md) — gateway for ACP and other ACN services
- [acn-network](../acn-network/CLAUDE.md) — agent registry used by ACP
- [negotiation-ai](../../contracts/negotiation-ai/CLAUDE.md) — ML strategies for COUNTER messages