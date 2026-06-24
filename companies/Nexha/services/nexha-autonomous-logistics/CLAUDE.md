# nexha-autonomous-logistics

> **Port:** 4293
> **Purpose:** Fills the KHAIRMOVE gap. Multi-carrier shipping, customs clearance, multi-modal routing, unified tracking, cargo insurance, carbon footprint.
> **Status:** ✅ MVP complete — 12 built-in carriers, 11 endpoints, 65+ tests passing.

---

## What it does

A logistics service that books shipments across multiple carriers, routes, and modes. Drop-in replacement for freight forwarder APIs.

**Visitor flow:**
1. Company uploads shipment details (origin, destination, cargo, HS code, value)
2. Service generates 3+ candidate routes using different carriers/modes
3. Scores routes by cost / speed / carbon / reliability (composite score)
4. Checks customs requirements (documents, duties, sanctions, trade agreements)
5. Auto-binds cargo insurance if requested
6. Returns a `ShipmentPlan` with the recommended route + alternatives
7. On booking, books each leg with the carrier, registers tracking, schedules customs
8. Unifies tracking status across all legs

---

## Endpoints (11)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health`, `/ready`, `/info` | Service metadata |
| `GET` | `/api/v1/carriers` | List 12 built-in carriers |
| `POST` | `/api/v1/shipments/plan` | Generate shipment plan (routes + cost + customs) |
| `POST` | `/api/v1/shipments/book` | Book a planned shipment |
| `GET` | `/api/v1/shipments/:id/track` | Track shipment status |
| `POST` | `/api/v1/shipments/:id/reroute` | Reroute delayed shipment |
| `POST` | `/api/v1/shipments/:id/cancel` | Cancel shipment |
| `POST` | `/api/v1/customs/check` | Check customs requirements |
| `POST` | `/api/v1/insurance/bind` | Bind cargo insurance |
| `GET` | `/api/v1/routes` | Multi-modal routing options |
| `POST` | `/api/v1/carbon/calculate` | Calculate carbon footprint |

---

## Architecture

```
src/
├── types.ts                          # All interfaces
├── index.ts                          # Express API + 11 endpoints
├── orchestrator/
│   └── orchestrator.ts               # planShipment, bookShipment, track, reroute, cancel
├── routing/
│   └── engine.ts                     # Multi-modal route generation + scoring
├── carriers/
│   └── registry.ts                   # 12 built-in carriers (DHL, FedEx, Maersk, etc.)
├── customs/
│   └── agent.ts                      # HS codes, country rules, trade agreements, sanctions
├── insurance/
│   └── binder.ts                     # Auto-bind cargo insurance
├── carbon/
│   └── calculator.ts                 # Carbon footprint + offset estimate
└── tracking/
    └── registry.ts                   # Unified tracking across legs
```

---

## 12 Built-in Carriers

| ID | Name | Modes | Region | Reliability |
|---|---|---|---|---|
| `dhl-express` | DHL Express | air, courier | Global | 0.96 |
| `fedex-international` | FedEx International | air, courier | Global | 0.95 |
| `ups-worldwide` | UPS Worldwide | air, courier, road | Global | 0.94 |
| `maersk` | Maersk | sea | Global | 0.92 |
| `msc` | MSC | sea | Global | 0.91 |
| `cma-cgm` | CMA CGM | sea | Global | 0.90 |
| `emirates-skycargo` | Emirates SkyCargo | air | Middle East / Asia | 0.93 |
| `bluedart` | BlueDart | air, courier, road | India + region | 0.94 |
| `delhivery` | Delhivery | road, courier, rail | India | 0.91 |
| `aramex` | Aramex | road, courier | Middle East | 0.92 |
| `sf-express` | SF Express | air, road, courier, rail | China + region | 0.93 |
| `yamato` | Yamato Transport | road, courier, rail | Japan | 0.95 |

Year 2 expansion target: 20+ regional carriers (per spec §C).

---

## Customs Agent

### Supported HS chapters (40+ bands)

Duty rates per HS chapter: live animals (5%), meat (10%), fish (7%), vegetables (8%), alcohol (18%), tobacco (25%), textiles (10-16%), machinery (4%), electronics (5%), vehicles (10%), etc.

### Country rules (9 destinations hardcoded)

US, IN, DE, GB, AE, CN, JP, AU, SG. Each has:
- Required documents (commercial invoice, packing list, BoL, country-specific forms)
- VAT/GST rate (US=0, IN=18%, DE=19%, GB=20%, AE=5%, CN=13%, JP=10%, AU=10%, SG=9%)
- Average clearance time (12-72 hours)

### Trade agreements

USMCA, EU Single Market, GCC, SAFTA, RCEP, CPTPP — automatic duty reductions.

### Sanctions

Hardcoded list (KP, IR, SY, CU) blocks shipments. HS 93 (arms) and 71 (precious metals) trigger warnings.

---

## Routing Engine

Multi-modal route generation:
- Short-haul (<500km): road/courier
- Mid-haul (500-3000km): air or road
- Long-haul (>3000km): sea freight primary, air alternatives
- Perishable long-distance: air freight

Scoring weights:
- `cost`: 50% / 30% (default)
- `speed`: 50% / 30%
- `carbon`: 50% / 15%
- `reliability`: 50% / 25%

Caller can override with `weights: { cost: 0.4, speed: 0.4, ... }`.

---

## Insurance

Three coverage levels:

| Coverage | Rate (of cargo value) |
|---|---|
| `basic` | 0.3% |
| `standard` | 0.5% |
| `all-risk` | 0.8% |

Policy valid for transit + 30 days.

---

## Carbon Calculator

Per-leg emissions + intensity metrics + offset estimates:
- `intensity` = kg CO2 per tonne-km
- `treeDays` = tree-days of absorption to offset
- `offsetCostUsd` = $15/tonne CO2 (varies by project)

---

## Quick start

```bash
cd companies/Nexha/services/nexha-autonomous-logistics
npm install
npm run build
LOGISTICS_REQUIRE_AUTH=false npm start

# Test
npm test
```

---

## Tests

65+ tests across 4 test files:
- `carriers.test.ts` — 12 carriers catalog, findCarriers filters, getCarrier lookup, generateTrackingNumber, bookWithCarrier
- `customs.test.ts` — HS code lookup, country rules, duty calculation, restrictions, documents, full requirements check
- `routing.test.ts` — Haversine distance, mode suggestion, single + multi-leg routes, candidate generation, scoring
- `orchestrator.test.ts` — Plan generation (with/without insurance), booking (default + custom pickup), tracking, cancellation, carbon + insurance modules

```bash
npm test
# 65+ pass, 0 fail
```

---

## Integration points

This service is designed to plug into:
- **HOJAI Widget**: visitor asks "ship 50 boxes from Mumbai to NYC" → widget backend → plans → books → tracks
- **Merchant agents**: merchant offers product → adds shipping → orders agent routes via nexha-logistics
- **BAM Marketplace**: 3rd-party logistics apps install via BAM, register as carriers
- **Nexha federation**: cross-border merchants in different Nexhas share carrier data via Nexha gateway

---

## What it does NOT do (yet)

- Real carrier API integration (uses stubbed `bookWithCarrier` — wire to DHL, FedEx, Maersk SDKs in production)
- Persistent storage (uses in-memory `Map` — wire to MongoDB/Postgres for production)
- Real-time tracking webhooks (uses simulated status — wire to carrier webhook callbacks)
- HS code autocomplete UI (just lookup by exact code)
- Multi-tenant rate cards (single rate per carrier)
- Returns / reverse logistics (out of MVP scope)

---

## References

- Spec: `.claude/plans/global-nexha-addendum.md` §C
- Phase plan: `.claude/plans/global-nexha-development-plan.md`
- Sibling services: `nexha-distribution-network` (port 4285), `nexha-warehouse-network` (port 4288)