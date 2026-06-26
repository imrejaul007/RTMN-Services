# Mobility OS Template

> AI-native mobility network template

## Overview

This template generates a complete Uber-like autonomous mobility platform with:
- 13 AI workers (Fleet Manager, Pricing Agent, Dispatch Agent, etc.)
- 9 digital twins (Driver, Passenger, Vehicle, Trip, etc.)
- 5 pre-built flows (ride booking, driver onboarding, etc.)
- 15 policies (safety, pricing, compliance)
- DO-ready mobile apps

## Quick Start

```bash
npx hojai create my-mobility --template mobility
cd my-mobility
npx hojai deploy
```

## AI Workforce

| Agent | Salary/mo | Capabilities |
|-------|-----------|-------------|
| CEO Strategist | $500 | Vision, strategy |
| COO Operations | $400 | Daily ops |
| Fleet Manager | $400 | Fleet optimization |
| Driver Success | $200 | Onboarding, training |
| Pricing Agent | $350 | Dynamic pricing |
| Safety Agent | $250 | Monitoring |
| Dispatch Agent | $200 | Matching |
| Insurance Agent | $200 | Claims |
| Maintenance Agent | $150 | Vehicle health |
| Growth Agent | $400 | Acquisition |
| Support Agent | $150 | Help desk |
| Finance Agent | $300 | Payouts |
| Legal Agent | $300 | Compliance |

**Total AI Salary:** $3,800/month

## Digital Twins

| Twin | Purpose |
|------|---------|
| Driver Twin | Driver profile, rating, earnings |
| Passenger Twin | Preferences, history |
| Vehicle Twin | Fleet inventory, health |
| Trip Twin | Booking lifecycle |
| Fare Twin | Pricing components |
| Insurance Twin | Coverage verification |
| Rating Twin | Reviews and feedback |
| Dispute Twin | Issue resolution |

## Key Flows

1. **ride_booking_flow** - Passenger request → driver match → trip → payment
2. **driver_onboarding_flow** - Apply → verify → train → activate
3. **safety_incident_flow** - Detect → assess → respond → resolve
4. **payment_settlement_flow** - Trip complete → calculate → charge → payout
5. **surge_pricing_flow** - Demand spike → adjust → notify → balance

## Nexha Integration

Connects to:
- Insurance network (verify coverage)
- Fuel partners (fleet management)
- Service centers (maintenance)
- OEMs (vehicle sourcing)

## DO Integration

Passenger app = "DO Mobility"
- Voice-first booking
- AI trip assistant
- Auto expense reports
- Corporate billing

## Policies

- Min driver rating: 4.5
- Surge cap: 3.0x
- Insurance verification required
- Background check annually
- Cancellation fees apply

## Extensions

To add custom agents:
```bash
npx hojai add agent insurance-specialist
```

To add flows:
```bash
npx hojai add flow airport-pickup
```

## License

MIT
