# Compliance Engine (port 4261)

> **Status:** ✅ Production-ready v1.0.0 (Governance suite — June 22, 2026)
> **Role:** Maps policies to regulatory frameworks, tracks evidence, and produces audit-ready attestations.
> **Owner:** HOJAI AI Platform team

## Mission

Before the Compliance Engine, knowing "which policy satisfies which regulatory control" was a manual spreadsheet. The Compliance Engine solves this by:

- **Frameworks** — 5 built-in (GDPR, SOC2, HIPAA, PCI-DSS, ISO27001), 32 controls
- **Policy mapping** — link a PolicyOS policy to one or more controls
- **Coverage reporting** — see at a glance which controls are covered / partial / uncovered
- **Evidence** — upload and link audit artifacts (configs, screenshots, exports)
- **Attestations** — formal sign-off records per (control × period)

## Design Principles

| # | Principle | How Compliance Engine implements it |
|---|-----------|-------------------------------------|
| 1 | Coverage is the source of truth | `GET /api/coverage` returns the full control × policy matrix |
| 2 | Evidence is first-class | `POST /api/evidence` with controlId + payload + sha256 |
| 3 | Frameworks are immutable | Built-in controls can't be edited; you can map additional policies |
| 4 | Attestations are time-bound | Each attestation has `validFrom` / `validUntil`; expired ones don't count |
| 5 | Fail-closed on missing coverage | `coverage` report flags controls with 0 linked policies as `uncovered` |

## Endpoints (20)

### Frameworks & Controls (4)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/frameworks` | List 5 built-in frameworks + counts |
| GET | `/api/frameworks/:id/controls` | List controls in a framework |
| GET | `/api/controls` | Flat list of all 32 controls |
| GET | `/api/controls/:id` | Get one control |

### Policy Mapping (3)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/policies` | Link a policy to one or more controls |
| GET | `/api/policies` | List mappings |
| GET | `/api/policies/:id` | Get one mapping |
| DELETE | `/api/policies/:id` | Unlink a mapping |

### Coverage (1)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/coverage` | Full control × policy matrix with status (covered / partial / uncovered) |

### Evidence (3)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/evidence` | Upload evidence for a control |
| GET | `/api/evidence` | List evidence |
| GET | `/api/evidence/:id` | Get one piece of evidence |

### Attestations (4)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/attestations` | Create a signed attestation for a control × period |
| GET | `/api/attestations` | List attestations |
| GET | `/api/attestations/:id` | Get one attestation |
| DELETE | `/api/attestations/:id` | Revoke an attestation |

### Snapshots (1)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/frameworks/:id/snapshot` | Frozen point-in-time view of a framework's coverage |

### Health (3)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness + counts |
| GET | `/ready` | Readiness probe |
| GET | `/` | Redirects to `/health` |

## Built-in Frameworks (5)

| Framework | ID | Controls |
|-----------|----|----|
| GDPR | `gdpr` | 10 (lawful basis, consent, right-to-erasure, data-portability, ...) |
| SOC 2 | `soc2` | 7 (security, availability, processing-integrity, confidentiality, ...) |
| HIPAA | `hipaa` | 4 (privacy rule, security rule, breach notification, ...) |
| PCI-DSS | `pci-dss` | 6 (cardholder data, encryption, access control, ...) |
| ISO 27001 | `iso27001` | 5 (A.5–A.18 control families) |

**Total: 32 controls** across all frameworks.

## Rate Limits

20 req/min default, overridable via `COMPLIANCE_LIMIT` env.

## Storage

`PersistentStore` (file-backed JSON in `data/`).

## Tests

`tests/smoke.sh` — 18 tests covering all 5 frameworks + mapping + coverage + evidence + attestations.

## Related

- [PolicyOS](../policy-os/CLAUDE.md) — policy authoring + evaluation
- [Consent Engine](../consent-engine/CLAUDE.md) — per-purpose user consent
- [Governance SDK](../../shared/lib/governance-sdk.js) — client wrapper
