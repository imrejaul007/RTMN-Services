# Customer Twin Full

**Port:** 5460
**Purpose:** Unified customer profile with identity, behavior, predictive scores

## Profile Sections

- **identity** — name, email, phone, company, location
- **behavior** — pageViews, purchases, cartAdds, searches
- **signals** — event history, counts, segments
- **predictive** — LTV, churnRisk, purchaseProbability
- **consent** — email, sms, whatsapp, tracking

## API

- GET /api/twin/:id — Get profile
- PUT /api/twin/:id — Update profile
- POST /api/twin/:id/events — Add event
- POST /api/twin/:id/consent — Update consent
- GET /api/twin/search — Search profiles by segment
