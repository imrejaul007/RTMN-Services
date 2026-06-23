# Capability Graph

> **Version:** 0.1.0 (draft, 2026-06-23)
> **Status:** Open for community review. Not yet a 1.0.
> **License:** Apache-2.0
> **Spec home:** [protocol/specs/CAPABILITY-GRAPH.md](https://github.com/imrejaul007/RTMN-Services/blob/main/protocol/specs/CAPABILITY-GRAPH.md)

## 1. Purpose

The Capability Graph is a **federated, queryable registry** of *who can do what* across the network. It answers questions like:

- "Which agents can negotiate SaaS contracts in healthcare, in Arabic, available right now?"
- "What's the trust score of agent `agt_abc`?"
- "What capabilities does company `co_xyz` expose?"

The Capability Graph is to **agent discovery** what DNS is to the internet: a lookup layer that lets you find the right endpoint without central registries.

## 2. Non-goals

- **Not a marketplace.** The graph lists capabilities; it does NOT host listings, reviews, or transactions. Transactions happen over [ACP](ACP.md).
- **Not a general knowledge graph.** Only capabilities, agents, companies, and trust signals.
- **Not centralized.** Any federation member can host a partial graph. Queries are routed via capability-aware hubs.

## 3. Core entities

### 3.1 Capability

A unit of work that an agent or company can perform.

```json
{
  "id": "cap_negotiate_saas_contracts",
  "name": "Negotiate SaaS contracts",
  "category": "BUSINESS",
  "description": "Negotiate pricing and terms for B2B SaaS agreements",
  "inputSchema": { /* optional, JSON Schema */ },
  "outputSchema": { /* optional */ },
  "tags": ["b2b", "saas", "negotiation"],
  "languages": ["en", "ar"],
  "industries": ["technology", "finance"]
}
```

Standard categories: `TECHNICAL`, `BUSINESS`, `OPERATIONS`, `CREATIVE`, `ANALYTICS`, `SUPPORT`, `HR`, `LEADERSHIP`, `DOMAIN`.

### 3.2 Agent

A software entity that performs capabilities.

```json
{
  "id": "agt_abc",
  "type": "MERCHANT",      // GENIE | MERCHANT | SYSTEM | PARTNER (per ACP §4)
  "name": "Acme Health Procurement Agent",
  "ownerCompanyId": "co_xyz",
  "endpoint": "https://acme.example.com/acp/v1/messages",
  "capabilities": ["cap_negotiate_saas_contracts", "cap_process_purchase_orders"],
  "trustScore": 82,
  "trustLevel": "GOLD",    // PLATINUM (90-100) | GOLD (80-89) | SILVER (70-79) | BRONZE (50-69) | IRON (30-49) | RESTRICTED (0-29)
  "languages": ["en", "ar"],
  "industries": ["healthcare"],
  "regions": ["AE", "SA"],
  "availability": {
    "status": "online",       // online | busy | offline
    "updatedAt": "2026-06-23T12:00:00Z",
    "expectedResponseMs": 1500
  },
  "registeredAt": "2026-01-15T08:00:00Z"
}
```

### 3.3 Company

A business entity.

```json
{
  "id": "co_xyz",
  "name": "Acme Health FZ-LLC",
  "legalName": "Acme Health FZ-LLC",
  "industry": "healthcare",
  "country": "AE",
  "trustScore": 85,
  "trustLevel": "GOLD",
  "capabilities": ["cap_negotiate_saas_contracts"],
  "agents": ["agt_abc"],
  "endorsements": ["co_def", "co_ghi"],   // other companies that vouched
  "registeredAt": "2025-09-01T08:00:00Z"
}
```

### 3.4 Trust signal

A discrete piece of evidence that informs a trust score.

```json
{
  "id": "ts_xyz",
  "subjectType": "agent",        // agent | company
  "subjectId": "agt_abc",
  "kind": "successful_transaction",  // transaction | dispute | review | endorsement | uptime | compliance
  "value": 1,                     // numeric value (transaction count, score, etc.)
  "weight": 1.0,                  // how much this signal counts toward trust score
  "evidenceUrl": "https://...",   // optional
  "occurredAt": "2026-06-20T10:00:00Z",
  "issuerCompanyId": "co_abc"
}
```

## 4. Query API

The graph is queried via HTTPS. All responses are JSON.

### 4.1 Search capabilities

```
GET /graph/v1/capabilities?q=<text>&category=<cat>&industry=<ind>&limit=<n>
```

Response:

```json
{
  "capabilities": [{ /* full Capability objects */ }],
  "total": 142,
  "limit": 20,
  "offset": 0
}
```

### 4.2 Get an agent

```
GET /graph/v1/agents/:agentId
```

### 4.3 Search agents by capability

```
GET /graph/v1/agents?capability=<capId>&industry=<ind>&minTrust=<n>&availability=online&limit=<n>
```

Response:

```json
{
  "agents": [{ /* full Agent objects */ }],
  "total": 17,
  "limit": 20,
  "offset": 0
}
```

### 4.4 Get trust

```
GET /graph/v1/trust?agentId=<id>&agentId=<id>&companyId=<id>
```

Response:

```json
{
  "subjects": [
    { "subjectId": "agt_abc", "subjectType": "agent", "trustScore": 82, "trustLevel": "GOLD", "signalsLast90d": 47 }
  ]
}
```

### 4.5 Publish to the graph

```
POST /graph/v1/agents       — register a new agent
POST /graph/v1/capabilities — declare a capability
POST /graph/v1/trust        — emit a trust signal
```

Publish operations require authentication: HMAC-SHA256 of body, or mTLS, or a Capability Graph–issued JWT.

## 5. Trust score formula

```
trustScore = clamp(0, 100, base + bonus - penalty)

where:
  base     = 50  (neutral starting point)
  bonus    = sum(signal.value * signal.weight for signal in last 90d)
             capped at +40
  penalty  = 10 * disputes_last_90d + 5 * failed_transactions_last_90d
             capped at -50

  then rounded to nearest integer.
```

Trust level bands are the same as in §3.2.

This is intentionally simple. Sophisticated scoring (Bayesian, time-decayed, etc.) is allowed as an extension but MUST publish the formula it uses.

## 6. Federation

Any organization can host a Capability Graph server. Federation works like email MX records:

1. A company publishes DNS records:
   ```
   capgraph.example.com.  IN  TXT  "v=capgraph1; url=https://graph.example.com"
   ```
2. Other graph servers query that URL when they need fresh data on that company.
3. Trust scores can be aggregated across multiple graph servers (weighted by each server's trust in the others).

A reference implementation lives at [`nexha-business-directory`](https://github.com/imrejaul007/RTMN-Services/tree/main/companies/Nexha/services/nexha-business-directory) (68 vitest tests).

## 7. Privacy

- Publishing to the graph is **opt-in** for both agents and companies.
- A graph server MUST NOT include personal data (PII) without explicit consent.
- A subject has the right to be forgotten: `DELETE /graph/v1/agents/:id` removes all signals and entries within 30 days.
- Aggregated, anonymized trust scores MAY be retained for anti-fraud purposes.

## 8. Versioning

Capability Graph versions are integers. The URL path includes the version (`/graph/v1/...`).

Breaking changes require a major version bump. Receivers SHOULD support the previous major version for at least 12 months after a new major ships.

## 9. Reference implementation + sample SDKs

- **Reference server**: [`nexha-business-directory`](https://github.com/imrejaul007/RTMN-Services/tree/main/companies/Nexha/services/nexha-business-directory)
- **JS / TS SDK**: [protocol/sample-sdk/capgraph-js/](../sample-sdk/capgraph-js/)
- **Python SDK**: [protocol/sample-sdk/capgraph-python/](../sample-sdk/capgraph-python/)

## 10. Contributing

Issues + PRs welcome. For breaking changes, please open an `capgraph-discussion` issue first.