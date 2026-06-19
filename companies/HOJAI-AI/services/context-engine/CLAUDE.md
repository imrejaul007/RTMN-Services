# Context Engine - Request-Scoped Context Propagation

**Version:** 1.0.0
**Port:** 4746
**Status:** RUNNING
**Layer:** HOJAI AI Foundation (Division 1)

---

## Overview

The **Context Engine** is the foundation-layer service that owns request-scoped
context for the RTMN ecosystem. It implements the patterns behind
OpenTelemetry Context, W3C Trace Context, and AsyncLocalStorage in a simple
HTTP-friendly shape so multi-agent workflows can carry identity, tenancy,
traces, spans, logs, and cross-service baggage across service boundaries
without losing context.

```
services/context-engine/
├── src/
│   └── index.js          # Context Engine HTTP API
├── package.json
└── CLAUDE.md
```

---

## Why Context Engine?

In a multi-agent workflow, a single user request may bounce across
Marketing, Sales, TwinOS, an Industry OS, and an Agent Marketplace.
Without a shared context layer, every hop loses identity, trace, and
attributes. Context Engine is the canonical place to:

- Track the trace / span hierarchy for a single logical request
- Propagate `principal`, `tenantId`, and baggage across hops
- Attach logs and child spans to the same root
- Look up an active context by traceId or principal/tenant
- Parse W3C `traceparent` / `tracestate` headers from upstream callers

---

## Features

| Feature | Description |
|---------|-------------|
| Context lifecycle | Create, update (merge), end, expire |
| Span tree | Hierarchical spans with kinds (`internal`, `server`, `client`, `producer`, `consumer`) |
| W3C Trace Context | Parse `traceparent` / `tracestate` from upstream |
| Baggage propagation | Cross-service key/value baggage on every context |
| Logs | Append structured log entries to a context |
| Active list | List contexts that are still in flight |
| Trace / principal lookup | Resolve context by `traceId` or (`principal`, `tenantId`) |
| Audit log | Every mutation recorded for observability |
| Periodic sweep | Expired contexts are auto-marked every 60s |

---

## Span Kinds (OpenTelemetry)

| Kind | Meaning |
|------|---------|
| `internal` | Operation happens inside the same process |
| `server` | Server-side handling of a synchronous request |
| `client` | Outbound call to another service |
| `producer` | Async message producer |
| `consumer` | Async message consumer |

---

## W3C Trace Context

The `/api/contexts/propagate` endpoint accepts:

```
traceparent: 00-<32 hex traceId>-<16 hex spanId>-<2 hex flags>
tracestate:  key1=value1,key2=value2
```

It validates the format and returns the parsed fields plus an indicator
of whether the trace is already known (`existing: true|false`).

---

## API Endpoints

```
POST   /api/contexts                  # Create a new context
GET    /api/contexts/:id              # Get a context
PUT    /api/contexts/:id              # Update / merge attributes & baggage
DELETE /api/contexts/:id              # End a context
GET    /api/contexts/active           # List in-flight contexts
POST   /api/contexts/lookup           # Lookup by traceId or (principal, tenantId)
POST   /api/contexts/propagate        # Parse W3C traceparent / tracestate

POST   /api/contexts/:id/spans        # Add a child span
GET    /api/contexts/:id/spans        # Span tree + flat list
GET    /api/contexts/:id/timeline     # Chronological spans w/ durations

POST   /api/contexts/:id/logs         # Append a log entry
GET    /api/contexts/:id/logs         # List logs

GET    /api/audit                     # Audit log
GET    /api/health                    # Health check
GET    /health                        # Alternate health
```

---

## Data Model

```js
{
  id:           "uuid",
  traceId:      "32 hex chars",
  spanId:       "16 hex chars (root span)",
  parentSpanId: "16 hex chars | null",
  principal:    "user or agent id | null",
  tenantId:     "tenant id | null",
  requestId:    "uuid",
  attributes:   { ... },
  baggage:      { ... },
  spans: [
    {
      id, name, kind, parentSpanId,
      attributes, startTime, endTime,
      status, durationMs
    }
  ],
  logs: [
    { id, level, message, fields, timestamp }
  ],
  status:       "active" | "ended" | "expired",
  createdAt:    "ISO timestamp",
  expiresAt:    "ISO timestamp",
  endedAt:      "ISO timestamp | null"
}
```

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/context-engine
npm install
npm start

# Health check
curl http://localhost:4746/api/health

# Create a context
curl -X POST http://localhost:4746/api/contexts \
  -H 'Content-Type: application/json' \
  -d '{"principal":"user_42","tenantId":"tenant_acme","ttlSeconds":1800}'

# Add a span to it
curl -X POST http://localhost:4746/api/contexts/<id>/spans \
  -H 'Content-Type: application/json' \
  -d '{"name":"order.process","kind":"server","startTime":"2026-06-19T10:00:00Z","endTime":"2026-06-19T10:00:01Z","status":"ok"}'

# Propagate from a W3C traceparent
curl -X POST http://localhost:4746/api/contexts/propagate \
  -H 'Content-Type: application/json' \
  -d '{"traceparent":"00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"}'
```

---

## Pre-seeded Data

On boot, the service seeds one example context with:

- A root span `order.process` (server)
- Two children: `inventory.reserve` (client) and `payment.charge` (client)
- One grandchild: `wallet.debit` (internal)
- A single `info` log entry
- `principal: user_42`, `tenantId: tenant_acme`
- Sample `attributes` and `baggage`

---

## TODO / Future Work

- Persistence to MongoDB (replace in-memory `Map`)
- Real-time span export to Jaeger / Tempo via OTLP
- Async-hook-based automatic context propagation in Node.js
  (Node `AsyncLocalStorage`)
- W3C Baggage header parsing/serialization
- Sampling rules per tenant / principal
- Distributed lock for concurrent span updates

---

*Last Updated: June 19, 2026*
*RTMN Ecosystem - HOJAI AI Foundation*
