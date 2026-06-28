# Nexha Gateway — Architecture Spec v1.0

> **Purpose:** Single entry point for all external consumers (LLMs, apps, enterprises) to access Global Nexha commerce infrastructure.

## Why Gateway First

Without it:
- 64 Nexha services = 64 independent APIs with no unified access
- Every external consumer (OpenAI, Claude, Shopify) needs custom integration per service
- No central auth, policy enforcement, or audit trail
- RTMN internal infrastructure, not external platform

With it:
- One endpoint, any consumer
- Consistent auth, routing, rate limiting, audit
- Plugs into MCP, REST, GraphQL, WebSocket simultaneously
- Becomes the "port 443 of the commerce internet"

---

## Gateway Position

```
EXTERNAL CONSUMERS
  GPT Agents │ Claude │ Gemini │ WhatsApp │ Shopify │ Zoho
                    │
                    ▼
┌─────────────────────────────────────────────┐
│         NEXHA GATEWAY (443)                 │
│  Auth │ Routing │ Policy │ MCP │ REST      │
└─────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ ACP      │   │ Discovery│   │ Trust    │
│ Runtime  │   │ Layer    │   │ Engine   │
└──────────┘   └──────────┘   └──────────┘
    │               │               │
    ▼               ▼               ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Contract │   │ Payment  │   │ Logistics│
│ Network  │   │ Network  │   │ Network  │
└──────────┘   └──────────┘   └──────────┘
    │               │               │
    └───────────────┼───────────────┘
                    ▼
           ┌──────────────────┐
           │   RTMN Core OS   │
           │ CorpID │ TwinOS  │
           │ Memory │ SUTAR   │
           │ RABTUL          │
           └──────────────────┘
```

---

## Gateway Responsibilities

| Responsibility | What It Does |
|----------------|-------------|
| **Authentication** | CorpID resolution, API keys, OAuth 2.0, DID verification |
| **Policy Enforcement** | Per-tenant budgets, approval thresholds, geo restrictions |
| **Protocol Translation** | REST ↔ GraphQL ↔ MCP ↔ WebSocket |
| **ACP Routing** | Routes messages to correct Nexha service based on protocol state |
| **Connector Registration** | Self-service onboarding for merchants, suppliers, logistics |
| **MCP Serving** | Exposes Nexha tools as MCP server for LLM consumption |
| **Tenant Isolation** | Multi-tenant with complete data separation |
| **Audit Trails** | Every request logged, immutable, queryable |
| **Rate Limiting** | Per-consumer, per-endpoint, configurable |
| **Circuit Breakers** | Prevents cascading failures across services |

---

## Canonical API Surface

### MCP Tools (Priority #1) — Six Tools Only

```typescript
// Discovery
discover_suppliers(params: {
  product: string;
  location?: string;
  min_trust?: number;
  limit?: number;
}): Supplier[]

// Trust
check_trust(entity_id: string): TrustScore

// Commerce
negotiate_order(params: {
  supplier_id: string;
  product: string;
  quantity: number;
  target_price?: number;
}): NegotiationSession

// Contract
create_contract(params: {
  negotiation_id: string;
  terms: ContractTerms;
}): Contract

// Payment
release_payment(params: {
  contract_id: string;
  amount: number;
  escrow: boolean;
}): PaymentStatus

// Logistics
track_shipment(shipment_id: string): ShipmentStatus
```

### REST Endpoints

```
POST /v1/discover/suppliers
GET  /v1/trust/:entity_id
POST /v1/negotiate/start
POST /v1/negotiate/counter
POST /v1/negotiate/accept
POST /v1/contracts/create
POST /v1/contracts/sign
POST /v1/payments/initiate
POST /v1/payments/escrow
POST /v1/payments/release
GET  /v1/shipments/:id
POST /v1/webhooks
```

### GraphQL

```graphql
type Query {
  suppliers(filter: SupplierFilter): [Supplier!]!
  trust(entityId: ID!): TrustScore!
  contract(contractId: ID!): Contract
  shipment(shipmentId: ID!): Shipment
}

type Mutation {
  startNegotiation(input: NegotiationInput!): Negotiation!
  acceptNegotiation(negotiationId: ID!): Contract!
  releasePayment(input: PaymentInput!): Payment!
}
```

---

## Port Allocation

| Port | Service | Protocol |
|------|---------|----------|
| **443** | Nexha Gateway | HTTPS (primary) |
| **4443** | Nexha Gateway (dev) | HTTP |
| **4444** | MCP Server | stdio / HTTP |

---

## Security Model

```
Request
  │
  ▼
API Key / OAuth / DID
  │
  ▼
CorpID Resolution
  │
  ▼
Tenant Isolation Check
  │
  ▼
PolicyOS Evaluation
  │  (budget limits, approval thresholds, geo restrictions)
  │
  ▼
Rate Limit Check
  │
  ▼
Service Call
  │
  ▼
Audit Log
  │
  ▼
Response
```

---

## Next Steps

1. Create `companies/Nexha/services/nexha-gateway/`
2. Scaffold Express app with all middleware
3. Implement MCP tool handlers (6 tools first)
4. Add REST endpoints as mirror
5. Wire to existing Nexha services
6. Deploy to HOJAI Cloud

---

## Dependencies

| Dependency | Purpose | Source |
|------------|---------|--------|
| `nexha-acp-messaging` | ACP state machine | Already exists |
| `nexha-discovery-os` | Supplier search | Already exists |
| `nexha-reputation-os` | Trust scores | Already exists |
| `nexha-contract-network` | Contract generation | Already exists |
| `nexha-payment-network` | Escrow + payments | Already exists |
| `nexha-autonomous-logistics` | Shipment tracking | Already exists |
| `@modelcontextprotocol/sdk` | MCP server framework | npm |

---

*Owner: Nexha Core Team*
*Status: Ready for implementation*
*Target: 30 days to working MVP*