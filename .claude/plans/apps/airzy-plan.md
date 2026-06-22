# Airzy — Travel Companion (PICK 3 services, not 20)

**Owner:** KHAIRMOVE
**Status:** 20+ services exist (per CLAUDE.md), port 4500 gateway
**Tagline:** "Smart companion for frequent travelers"
**v1 scope:** 6 weeks
**Hard rule:** **Pick 3 services, ship them well. Don't try to ship 20.**

---

## The problem with 20+ services

Airzy has 20+ services. The honest CLAUDE.md says many are scaffold. **Trying to ship all 20 at once is a guaranteed disaster.** Pick 3 that prove the engagement loop, ship them, then expand.

---

## v1 Pick: Flight + Lounge + Concierge

These 3 work together: book a flight, get lounge access on the day, use the concierge at the airport.

| Service | Port | Purpose |
|---------|------|---------|
| `airzy-flight-service` | 4505 | Flight search + booking (Amadeus integration) |
| `airzy-lounge-service` | 4506 | Lounge access (Priority Pass / DreamFolks) |
| `airzy-concierge-extension` | 4507 | Concierge (in-person help at airport) |
| `airzy-app` | 4500 | Mobile app |

**Reuse:**
- REZ Wallet :4004 (payment)
- REZ Auth :4002
- rez-payment :4001
- Sync Engine :4960 (publish `TravelItineraryShared`)

---

## v1 Scope — 3 features

1. **Flight search + booking** — Amadeus integration
2. **Lounge access** — show lounges at your airport on travel day
3. **Concierge** — chat with a human concierge at the airport (manual ops in v1)

### Hard cuts (defer to v2+)
- ❌ Visa service (v2)
- ❌ Itinerary service (v2)
- ❌ Travel finance (v2)
- ❌ Hotel extension (v2 — StayOwn handles this)
- ❌ Dining extension (v2 — Go4Food handles this)
- ❌ Social extension (v2)
- ❌ Transfer extension (v2)
- ❌ DOOH extension (v2)
- ❌ Document vault (v2)
- ❌ AI brain (v2)
- ❌ Corp service (v2)
- ❌ Gate navigation (v3)
- ❌ Wallet extension (v2)

That's 13 services deferred. Ship 3 well first.

---

## Sync Engine integration

### Publish
| Event | When | Payload |
|-------|------|---------|
| `TravelItineraryShared` | Trip booked | origin, dest, dates, flights |
| `LoungeVisited` | Lounge check-in | loungeId, airport, time |
| `ConciergeUsed` | Chat started | topic, airport |

### Read
- RisaLife activity near destination: "you'll be in Mumbai, here's your last 5 visits"
- Go4Food: "best restaurants in your destination"
- StayOwn: "hotels in your destination"
- BuzzLocal: "what's happening in your destination city"

---

## Engagement loop (v1)

```
User opens Airzy
  → "Your flight to Mumbai tomorrow"
  → Lounge card: "Lounge 5A, open now, Priority Pass accepted"
  → Concierge: "Need help at Mumbai airport? Tap to chat"
  → User books lounge
  → User uses concierge
  → Sync Engine publishes → BuzzLocal shows "Karim flew to Mumbai"
  → On return: "Welcome back. Here are 3 places from your last visit worth revisiting"
```

---

## Why Airzy benefits from the ecosystem (not the other way)

Airzy is **a publisher to the ecosystem, not a consumer of it.** The user comes to Airzy for flights. The value comes from RisaLife + Go4Food + StayOwn + BuzzLocal feeding back context about their destination.

This means Airzy can ship with 3 services, not 20. The other 17 services can come later because the value isn't in Airzy's own breadth — it's in the ecosystem's depth.

---

## Success criteria for v1

- 2,000 downloads (niche — frequent travelers)
- 60% D7 retention (very sticky — travelers plan trips weeks in advance)
- 1 verifiable cross-app moment: "You ran in Cubbon Park last month, here are running routes in your destination"
- 1 Amadeus integration live

---

## What I would NOT do

- Don't ship 20 services. Ship 3.
- Don't build visa / itinerary / hotel in v1.
- Don't try to be a travel super-app in v1. Be a flight + lounge + concierge app.
- Don't rebuild Amadeus integration from scratch if it already exists.
