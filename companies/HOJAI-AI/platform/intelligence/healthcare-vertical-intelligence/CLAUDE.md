# Healthcare Vertical Intelligence (port 4160)

> **Status:** ✅ Production-ready v1.0.0
> **Role:** Vertical intelligence layer — generic healthcare templates offered to clients (RisaCare, plus any future healthcare product).
> **Owner:** HOJAI AI

## Mission

Expose a small, opinionated set of **vertical templates** that any healthcare product can compose into its own workflows. These are the building blocks HOJAI AI provides as a service — clients (RisaCare first) consume them via HTTP, wrap them in product UX, and own the resulting experience.

The templates carry **no client branding**. They describe vertical mechanics (HIPAA gating, FHIR mapping, triage routing, journey tracking, protocol lookup) and are intentionally generic so a second or third healthcare client can adopt them without rework.

## Templates Shipped

| Template | Kind | Inputs | Outputs |
|----------|------|--------|---------|
| HIPAA Consent Gate | compliance | `phi_field`, `consent_ts` | `redact_required` |
| FHIR Resource Mapper | integration | `internal_patient_id` | `fhir_patient_resource` |
| Triage Routing | workflow | `symptoms`, `severity` | `care_path` |
| Patient Journey Tracker | analytics | `patient_id` | `stage`, `next_action` |
| Clinical Protocol Lookup | knowledge | `condition_icd10` | `protocol_id` |

## Seeded Clinical Protocols (ICD-10 keyed)

| ICD-10 | Name | Steps |
|--------|------|-------|
| E11 | Diabetes Type 2 Management | A1c test, Lifestyle counseling, Metformin |
| I10 | Hypertension First-line | BP measurement, Lifestyle, ACE inhibitor |

Clients can add their own protocols via `POST /api/protocols`.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Service health (returns vertical + counts) |
| GET | `/ready` | Readiness |
| GET | `/api/templates` | List templates |
| GET | `/api/templates/:id` | Get template |
| POST | `/api/templates` | Create template |
| POST | `/api/templates/:id/run` | Run a template (mock execution; returns inputs echoed back) |
| GET | `/api/protocols?icd10=E11` | List/filter clinical protocols |
| POST | `/api/protocols` | Create clinical protocol |

## Clients

| Client | How they consume |
|--------|------------------|
| **RisaCare** (first adopter) | Wraps the templates behind its MyRisa / consumer app UI. Calls `/api/templates/:id/run` to evaluate a template against a patient's context. |

To add a new client: hit the same endpoints. No code changes are needed — the templates are vertical-agnostic at the API level.

## Example

```bash
# Discover templates
curl http://localhost:4160/api/templates

# Pull the Diabetes Type 2 protocol
curl 'http://localhost:4160/api/protocols?icd10=E11'

# Run a template against a patient's symptoms
curl -X POST http://localhost:4160/api/templates/$TEMPLATE_ID/run \
  -H 'Content-Type: application/json' \
  -d '{"symptoms":["fever","cough"],"severity":2}'
```

## Wiring

- **unified-os-hub (4399)** — `/api/healthcare/templates` and `/api/healthcare/protocols` should route to this service
- **ai-intelligence (4881)** — `/api/route` exposes `healthcareVerticalIntelligence: http://localhost:4160`

## Next Steps

- Add a `tenant_id` filter to support multi-tenant isolation across clients
- Replace the in-memory Maps with a Postgres schema for production durability
- Add audit logging so HIPAA-relevant template executions leave a trace
- Add a `version` field to templates so clients can pin to a stable template ID
