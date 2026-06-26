# Universal Company Template Specification v1.0

> Date: 2026-06-25
> Purpose: Structure for ALL company templates in HOJAI Studio

---

## 10-Layer Architecture

Every template follows this structure:

| Layer | Purpose | Example |
|-------|---------|---------|
| 1. Identity | Twins, CorpID | Customer, Driver, Vehicle |
| 2. Workforce | AI Agents | CEO, Fleet Manager, Dispatch |
| 3. Memory | Customer, Transaction, Knowledge | Preferences, History |
| 4. Flows | Order, Onboarding, Support | ride_booking_flow |
| 5. Policies | Permissions, Approvals | auto_cancel_threshold |
| 6. Commerce | Payments, Pricing | dynamic_pricing |
| 7. Trust | KYC, Ratings, Insurance | background_check |
| 8. Integrations | Maps, SMS, Email | google_maps, twilio |
| 9. Apps | Passenger, Driver, Admin | React Native, Admin dashboard |
| 10. Analytics | Metrics, Dashboards | rider_metrics, driver_metrics |

---

## Core Crew (All Templates)

Every company gets these AI workers by default:

| Agent | Salary/mo | Role |
|-------|---------|------|
| CEO Strategist | 500 | Vision, strategy, goals |
| COO Operations | 400 | Execution, workflows |
| Finance Agent | 300 | Budgets, invoices |
| Legal Agent | 300 | Compliance, contracts |
| Growth Agent | 400 | Marketing, acquisition |
| Support Agent | 150 | Tickets, FAQs |
| Security Agent | 200 | Monitoring, audits |
| Research Agent | 350 | Market intel |

---

## Mobility Template (Uber-like)

### Twins
- Driver Twin
- Vehicle Twin
- Passenger Twin
- Trip Twin
- Route Twin
- Fare Twin
- Insurance Twin

### Additional Agents
| Agent | Salary/mo |
|--------|----------|
| Fleet Manager | 400 |
| Driver Success | 200 |
| Pricing Agent | 350 |
| Safety Agent | 250 |
| Dispatch Agent | 200 |
| Insurance Agent | 200 |
| Maintenance Agent | 150 |

### Flows
1. ride_booking_flow
2. driver_onboarding_flow
3. safety_incident_flow
4. payment_settlement_flow

### Apps
- Passenger App (DO Mobility)
- Driver App
- Admin Dashboard

---

## Template File Structure

```
mobility-template/
├── template/
│   ├── identity/twins.json
│   ├── workforce/agents.json
│   ├── memory/memories.json
│   ├── flows/
│   │   ├── ride_booking_flow.json
│   │   ├── driver_onboarding_flow.json
│   │   └── safety_incident_flow.json
│   ├── policies/policies.json
│   ├── commerce/commerce.json
│   ├── trust/trust.json
│   ├── integrations/
│   │   ├── maps.json
│   │   ├── payments.json
│   │   └── communications.json
│   ├── apps/
│   │   ├── passenger-app/
│   │   ├── driver-app/
│   │   └── admin-dashboard/
│   └── analytics/dashboards.json
├── template.json
└── hojai.ai.md
```

---

## BAM Integration

Templates reference skills from BAM:

```json
{
  "required_skills": [
    "driver_onboarding",
    "ride_pricing",
    "dispatch_optimization",
    "safety_monitoring",
    "insurance_verification"
  ]
}
```

---

## Nexha Integration

Mobility templates connect to Nexha:

```json
{
  "nexha_connections": [
    "insurance_network",
    "fuel_partners",
    "service_centers",
    "oem_network"
  ]
}
```

---

*Last updated: 2026-06-25*
