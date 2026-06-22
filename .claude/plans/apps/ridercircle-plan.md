# RiderCircle — Motorcycle Adventure OS (existing, harden)

**Owner:** KHAIRMOVE
**Status:** 5 services built, ready for testing (per CLAUDE.md 2026-06-19)
**Tagline:** "The Operating System for Adventure Mobility"
**v1 polish window:** 4 weeks

---

## What's already built (per CLAUDE.md)

| Service | Port | Purpose |
|---------|------|---------|
| rider-circle-api | 4200 | Express + MongoDB REST API |
| rider-circle-graph | 4300 | Neo4j Knowledge Graph |
| rider-circle-intelligence | 4400 | Python FastAPI AI Engine |
| rider-circle-app | (mobile) | Expo app |
| rider-circle-shared | (lib) | TypeScript SDK |

**The moat:** Rider Intelligence Graph (Riders → Bikes → Routes → Groups → Events → Destinations → Merchants). Don't break this.

---

## v1 Scope (4 weeks) — Polish + Wire, don't add

### 3 things only
1. **Verify all 5 services actually run** (per honest CLAUDE.md)
2. **Wire to Sync Engine** — publish `RideCompleted` events with route, bike, group
3. **Anti-cheat hardening** — every ride event flows through `anticheat-service :4966`

### Hard cuts
- ❌ Don't add 10 more services
- ❌ Don't rebuild the Neo4j graph
- ❌ Don't add "carpooling" or "ride-hailing" (RiderCircle is for motorcycle enthusiasts, not commuters)
- ❌ Don't add livestreaming (v3)
- ❌ Don't add 25 more screens (per existing CLAUDE.md, the app is well-scoped already)

---

## Reuse the existing moat

RiderCircle already has:
- **Bike Digital Twin** — tire, chain, brake health. Don't rebuild, expose via API.
- **SafeQR** — emergency ID with blood group, medical info. Critical for v1.
- **AI Genie** — route planning, maintenance, weather. Rule-based is fine v1.
- **Rider Intelligence Graph** — Neo4j already. Connect to **Place Intelligence Graph** in v1.

**The graph connection is the v1 unlock.** RiderCircle's Neo4j (bikes, riders, routes) connects to the ecosystem's Neo4j (places, visits, memories) via the Sync Engine.

---

## Sync Engine integration

### Publish
| Event | When | Payload |
|-------|------|---------|
| `RideCompleted` | Ride stopped | distance, duration, route, bike, group |
| `TerritoryCaptured` | New hex during ride | hexId, wasNew |
| `BikeMaintenanceEvent` | Service logged | bikeId, what, when |

### Read
- Place intelligence: "This road is popular among bikers" (RisaLife + Axom Trails + RiderCircle combined)
- Safety: "3 RiderCircle users flagged this road as risky"
- Weather: "Rain expected in 30 mins" (real-time push to active ride)

---

## v1 must-pass criteria

- 1,000 downloads (niche audience is OK — motorcyclists are a known market)
- 40% D7 retention (niches retain better)
- Anti-cheat catches 100% of GPS-mock attempts in testing
- Bike Digital Twin predicts 1 issue 7 days before it happens (validated by 10 users)

---

## What I would NOT do

- Don't add ride-hailing. RiderCircle is for enthusiasts.
- Don't add 5 more services.
- Don't break the Neo4j graph. Extend it via Sync.
- Don't add livestreaming.
- Don't rebuild SafeQR. It's already good.
