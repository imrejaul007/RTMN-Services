# ADR 0001: Hub as a Single Frontend HTTP Proxy

**Status:** Accepted (2026-06-22)
**Context:** Phase A — Foundation

## Context and Problem Statement

The RTMN ecosystem has 50+ services across 26 industry OS, 9 department OS, SUTAR OS (25 services), TwinOS (15 services), and Nexha (8 services). Cross-service consumers (do-app mobile, internal SUTAR agents, ad-hoc scripts) shouldn't need to know any of those URLs.

How do we expose the whole ecosystem through one front door without writing a dedicated client per consumer language?

## Considered Options

1. **Service mesh (Istio / Linkerd)** — every service gets its own sidecar, consumers discover through the mesh
2. **In-process Node client** (e.g., `sutarOS.js` in `REZ-Workspace`) — each consumer embeds a Node library
3. **Single HTTP proxy at the Hub** — one Express app on :4399, pattern-matched routes to upstream services

## Decision Outcome

Chose **Option 3**: Hub as a single HTTP proxy. Specifically:

- `GET  /api/sutar/<service>/<path>` → forwards to `SUTAR_SERVICES[<service>] + <path>`
- `GET  /api/nexha/<service>/<path>` → forwards to `NEXHA_SERVICES[<service>] + <path>`
- Plus `GET  /api/sutar/capabilities` and `GET  /api/nexha/capabilities` for service discovery

Implemented in [`companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts`](../../companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts).

### Positive Consequences

- Works for **any HTTP client** in any language (curl, fetch, axios, Go, Java, etc.)
- The `proxyToUpstream()` helper is reusable for both SUTAR and Nexha — one implementation
- Service URLs become env-var-overridable (`SUTAR_TRUST_ENGINE_URL=...`) so the same binary works in dev, staging, prod
- Adding a new service is one line in `SUTAR_SERVICES` / `NEXHA_SERVICES`

### Negative Consequences

- **Hub is now a SPOF** for all cross-service traffic. Mitigation: liveness/readiness probes, the Hub itself is stateless
- Body-forwarding has subtle bugs when `express.json()` runs before the proxy (see [ADR 0005](0005-body-forwarding-with-express-json.md))
- No retry/circuit-breaker logic in the proxy yet — that's tracked in Phase E follow-up

## Why not the alternatives

- **Service mesh** is operationally heavy and assumes a Kubernetes cluster we don't run today
- **In-process Node client** only works for Node consumers. do-app mobile (Expo/React Native) and ad-hoc Python/Go scripts can't use it

## Verification

```bash
$ curl -s http://localhost:4399/api/sutar/capabilities | jq '.services | keys | length'
16

$ curl -s http://localhost:4399/api/nexha/capabilities | jq '.services | keys | length'
8
```