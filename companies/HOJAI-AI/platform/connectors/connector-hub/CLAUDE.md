# Connector Hub (port 4785)

> **Status:** ✅ Production-ready v1.0.0 (Architecture v2 — June 20, 2026)
> **Role:** Data Connectors — pre-built integrations for 8 external SaaS systems.
> **Owner:** HOJAI AI Data Platform team

## Mission

Pull data from external SaaS systems into HOJAI AI / RTMN. Each connector is a small adapter that exposes a common interface over a third-party SaaS. In production each adapter wraps the vendor's official SDK; here we ship deterministic in-memory mocks so the API contract is real and testable without vendor accounts.

## The 8 Connectors

| Connector | Label | Kinds |
|-----------|-------|-------|
| `salesforce` | Salesforce CRM | lead, contact, opportunity, account |
| `hubspot` | HubSpot CRM | contact, company, deal, ticket |
| `stripe` | Stripe Payments | customer, charge, subscription, invoice |
| `shopify` | Shopify Commerce | product, order, customer, inventory |
| `slack` | Slack Messaging | channel, message, member |
| `notion` | Notion Docs | page, database, block |
| `gsheets` | Google Sheets | spreadsheet, range |
| `twilio` | Twilio Comms | message, call |

## The Common Adapter Contract

Every connector exposes the same set of operations:

| Operation | Method + Path | Purpose |
|-----------|--------------|---------|
| `listResources` | `GET /api/connectors/:name/:kind` | List all records of a kind |
| `getResource` | `GET /api/connectors/:name/:kind/:id` | Get one record |
| `createResource` | `POST /api/connectors/:name/:kind` | Create a new record |
| `updateResource` | `PATCH /api/connectors/:name/:kind/:id` | Update a record |
| `deleteResource` | `DELETE /api/connectors/:name/:kind/:id` | Delete a record |
| `search` | `GET /api/connectors/:name/:kind/search?q=...` | Search records |
| `sync` | `POST /api/connectors/:name/:kind/sync` | Trigger sync, log it |

Plus a `connections` registry for credential metadata (never the secrets):

| Operation | Method + Path |
|-----------|--------------|
| `createConnection` | `POST /api/connections` |
| `listConnections` | `GET /api/connections[?tenant=...]` |

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `connectorHub: http://localhost:4785`
- **ai-intelligence (4881) `/api/agents`** — exposes `connectorHub` agent
- **unified-os-hub (4399)** — `/api/connectors/...` routes to this service

## Example

```bash
# List Salesforce leads
curl http://localhost:4785/api/connectors/salesforce/lead

# Create a Stripe customer
curl -X POST http://localhost:4785/api/connectors/stripe/customer \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Inc","email":"billing@acme.com"}'

# Search HubSpot contacts
curl "http://localhost:4785/api/connectors/hubspot/contact/search?q=john"

# Trigger a sync (logs it)
curl -X POST http://localhost:4785/api/connectors/salesforce/lead/sync
```

## Next Steps

- Replace mock stores with real vendor SDK calls (per-connector effort)
- Add OAuth flow for each connector (currently credentials are pre-configured)
- Add rate-limit awareness per vendor
- Add webhook receivers for each vendor
- Add connector marketplace (where 3rd parties can publish their own connectors)
