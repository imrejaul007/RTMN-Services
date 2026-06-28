# Customer Twin Full

**Port:** 5460
**Phase:** 2
**Purpose:** Unified customer profile

## Profile Sections

- **identity** — name, email, phone, company
- **behavior** — pageViews, purchases, searches
- **signals** — event history, counts
- **predictive** — LTV, churnRisk, purchaseProbability
- **consent** — email, sms, whatsapp, tracking

## API

- `GET /api/twin/:id` — Get profile
- `PUT /api/twin/:id` — Update profile
- `POST /api/twin/:id/events` — Add event
- `GET /api/twin/search` — Search by segment

## Startup

```bash
cd products/customer-twin-full && npm install && npm start
```