# RTMN Consumer Ecosystem V2 — Master Plan

**Date:** 2026-06-22
**Status:** Draft v0.1
**Supersedes:** Aspirational claims in root `CLAUDE.md` about "all apps running"
**Companion docs:** Per-app sub-plans (see [Per-app sub-plans](#per-app-sub-plans) below)

---

## 1. The Idea in One Page

We are building **one shared world graph** (BuzzLocal = read layer) that **ten vertical apps** write into (write layer). The graph gets stronger with every app, every event, every memory. No app is an island. Every app contributes to the same `Place Intelligence Graph`.

```
                       HOJAI AI  +  MemoryOS  +  TwinOS
                                │
                  ┌─────────────┴─────────────┐
                  │     SYNC ENGINE (new)     │
                  │  enrich • tag • dedupe    │
                  │  privacy • fan-out        │
                  └─────────────┬─────────────┘
                                │
                ┌───────────────┴───────────────┐
                │      BUZZLOCAL  (read layer)  │
                │   World Discovery Graph       │
                │   Map · Feed · Memories       │
                └───────────────┬───────────────┘
                                │
   ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
   │      │      │      │      │      │      │      │      │      │
RisaLife MyRisa Axom  Rider Go4Food Karma Airzy REZ  StayOwn REZ
         Adventure Circle                            -App        -Home
```

**Core principle:** Don't build ten complete products. Build **one shared infrastructure** + **lean vertical apps** that each prove one engagement loop.

---

## 2. Apps in Scope

| # | App | Company | Tagline | Current State | v1 Owner Loop |
|---|-----|---------|---------|---------------|----------------|
| 1 | **BuzzLocal** | Axom | "Live Pulse of Your City" | Code exists, services unverified live | **Read** all events from other apps |
| 2 | **RisaLife** | RisaCare | "Your AI Companion for a Healthier Life" | New, vision doc has 25 modules | **Move** — territory + activity + AI coach |
| 3 | **MyRisa** | RisaCare | "Your Health. Understood." | Mostly built, 11 services | **Women's health** — cycle, fertility, pregnancy |
| 4 | **Axom Adventure** | Axom | "Explore Beyond Limits" | New | **Discover** — outdoor places, routes, community |
| 5 | **RiderCircle** | KHAIRMOVE | "OS for Adventure Mobility" | 5 services, code complete | **Ride** — bike twin, SafeQR, routes |
| 6 | **Go4Food** | REZ-Consumer | (Food discovery/delivery) | Exists, scope unclear | **Eat** — restaurants, food memories |
| 7 | **Karma** | Karma-Foundation | "Impact, Trust & Community Good" | 6 services exist | **Give** — volunteer, NGO, social impact |
| 8 | **Airzy** | KHAIRMOVE | "Smart companion for frequent travelers" | 20+ services, port 4500 | **Travel** — airports, lounges, itineraries |
| 9 | **REZ-App** | REZ-Consumer | (Main consumer super-app) | Exists | **Pay** — REZ Coins, wallet, primary commerce |
| 10 | **StayOwn** | StayOwn-Hospitality | (Hotel OS) | 45+ services | **Stay** — hotels, bookings, hospitality |

---

## 3. The Sync Engine (the keystone)

Without this, every app reinvents the world map. With this, every app is a thin skin over the shared graph.

### 3.1 Purpose
A **write-only bus** that vertical apps publish to, and a **read API** that BuzzLocal (and any app) consumes from. It owns:
- **Event ingestion** (HTTP, async queue, retries)
- **Enrichment** (HOJAI AI tagging: location, category, sentiment, privacy class)
- **Dedup** (same place captured twice)
- **Privacy filter** (apply user's visibility rules: public / friends / private)
- **Fan-out** (publish to BuzzLocal read store, also to other interested apps)
- **Audit** (every event traceable to source app + user)

### 3.2 Event contract (minimum)

```typescript
type SyncEvent =
  | { type: 'HealthActivityCompleted'; app: 'risalife'; userId: string; payload: ActivityPayload; ts: Date; place: GeoPoint }
  | { type: 'RideCompleted';           app: 'ridercircle'; userId: string; payload: RidePayload; ts: Date; place: GeoPoint }
  | { type: 'AdventureCompleted';      app: 'axom-adventure'; userId: string; payload: AdventurePayload; ts: Date; place: GeoPoint }
  | { type: 'FoodReviewCreated';       app: 'go4food'; userId: string; payload: ReviewPayload; ts: Date; place: GeoPoint }
  | { type: 'HotelStayCompleted';      app: 'stayown'; userId: string; payload: StayPayload; ts: Date; place: GeoPoint }
  | { type: 'KarmaImpactLogged';       app: 'karma'; userId: string; payload: ImpactPayload; ts: Date; place: GeoPoint }
  | { type: 'TravelItineraryShared';   app: 'airzy'; userId: string; payload: ItineraryPayload; ts: Date; place: GeoPoint };
```

### 3.3 Services to build

| Service | Port | Purpose |
|---------|------|---------|
| `sync-engine-api` | 4960 | Ingestion HTTP API |
| `sync-enricher` | 4961 | HOJAI AI tagging, dedup |
| `sync-privacy` | 4962 | Visibility filter |
| `sync-fanout` | 4963 | Publish to BuzzLocal + subscribers |
| `sync-audit` | 4964 | Compliance, deletion, GDPR/DPDP |
| `place-graph-writer` | 4965 | Writes to Neo4j Place Intelligence Graph |

### 3.4 Reusable from existing
- **Neo4j** (already used by RiderCircle port 4300) → place graph
- **MemoryOS** (port 4703) → user-level memory of places visited
- **TwinOS** (port 4705) → user place preferences
- **REZ Intelligence** (port 4530) → enrichment
- **HOJAI LLM** → auto-tagging, auto-summarization

---

## 4. v1 / v2 / v3 Scope Cuts per App

**Rule:** v1 = 3-5 features. v2 = double. v3 = the full vision. **Don't ship v3 in v1.**

### 4.1 BuzzLocal (Axom)
- **v1 (8 weeks):** Read layer only. World map view of all events. Feed of memories. No user-generated content from inside BuzzLocal.
- **v2 (8 weeks):** Add City OS layers (Ask Buzz, Society, REZ Safe, Marketplace) — defer Crisis, Density Service.
- **v3:** Full 8-layer City OS as currently documented.

### 4.2 RisaLife (RisaCare)
- **v1 (8 weeks):** Activity tracking (walk/run/cycle only) + Territory capture + GPS anti-cheat + AI Coach (rule-based) + REZ Coins (3 earn, 1 redeem). **ONE city launch.**
- **v2 (8 weeks):** + Sleep, Nutrition (basic), Mental Wellness (mood + meditation), Multi-city leagues, Wearable integrations.
- **v3:** Full 25-module vision: Women's Health subset, Family, Corporate, Marketplace, Health Records, AI Scribe, Chronic Care.

### 4.3 MyRisa (RisaCare)
- **v1 (4 weeks — already 80% built):** Polish existing 11 services. Wire to Sync Engine. Wire to Human Twin. **Pick one** of: pregnancy OR menopause (don't try both).
- **v2 (6 weeks):** + The second lifecycle phase + Beauty/skin + Sexual wellness.
- **v3:** Full 7-domain coverage.

### 4.4 Axom Adventure (Axom)
- **v1 (6 weeks):** Rides/Treks/Cycle tracking + Route discovery (read-only map) + Community feed (photos per place) + AI Adventure Guide (rule-based, weather) + SOS/Safety.
- **v2 (6 weeks):** + Events + Booking marketplace + Group rides + Offline maps.
- **v3:** Full outdoor super-app (kayak, paragliding, scuba, drones, etc.).

### 4.5 RiderCircle (KHAIRMOVE)
- **v1 (4 weeks — already built):** Polish existing 5 services (API 4200, Graph 4300, Intelligence 4400, App, Shared). Wire to Sync Engine. Anti-cheat hardening.
- **v2 (6 weeks):** + Routes marketplace + Group rides + Events + Camps + Bike rental marketplace.
- **v3:** Full adventure OS scope as documented.

### 4.6 Go4Food (REZ-Consumer)
- **v1 (6 weeks):** Restaurant discovery + Menu view + Reviews (publishes `FoodReviewCreated` to Sync Engine) + Reservations. **No delivery** in v1.
- **v2 (6 weeks):** + Food delivery (3P aggregator integration) + Order tracking + Loyalty.
- **v3:** Full food OS (cooking classes, food tours, kitchen OS).

### 4.7 Karma (Karma-Foundation)
- **v1 (4 weeks — already 6 services exist):** Polish existing 6 services. Wire to Sync Engine. Add **visible "Karma Score"** that other apps can read (e.g., RisaLife shows "Karim has Karma 850 — 12 verified volunteer events").
- **v2 (6 weeks):** + NGO partnerships + Corporate CSR dashboards + Impact certificates.
- **v3:** Full social impact platform with policy integration.

### 4.8 Airzy (KHAIRMOVE)
- **v1 (6 weeks — 20+ services exist):** Pick 3 working ones (e.g., flight, lounge, concierge). Wire to Sync Engine. **Don't** try to ship all 20+ services.
- **v2 (6 weeks):** + Visa, Itinerary, Travel Finance.
- **v3:** All extensions (dining, hotel, social, transfer, etc.).

### 4.9 REZ-App (REZ-Consumer)
- **v1 (4 weeks — exists):** This is the **commerce + wallet super-app** where REZ Coins live. v1 = REZ Coins wallet + basic history + transfer.
- **v2 (6 weeks):** + REZ Pay (UPI) + REZ Invest + REZ Save + REZ Bills.
- **v3:** Full consumer commerce platform.

### 4.10 StayOwn (StayOwn-Hospitality)
- **v1 (4 weeks — 45+ services exist):** Pick 5 working ones: Hub (6000), Room (6001), Booking (6002), Guest (6004), Check-in (6005). Wire to Sync Engine as `HotelStayCompleted`.
- **v2 (6 weeks):** + Restaurant, Spa, Concierge.
- **v3:** All 45+ services (don't try — most are scaffold).

---

## 5. Anti-Cheat as P0 (Not Optional)

Every game with territory/leaderboards dies without anti-cheat. The Runiverse analysis glosses over this. **Make it a hard requirement:**

- **GPS spoofing detection** (mock-location check, sensor cross-validation)
- **Speed validation** (max 12 m/s for cycling, 6 m/s for running)
- **Impossible route detection** (teleport check)
- **Duplicate route detection** (exact match within 24h = invalid)
- **Device integrity** (SafetyNet / DeviceCheck)
- **Manual review queue** for top 1% weekly

Build into a **shared `anticheat-service` (port 4966)** that RisaLife, RiderCircle, and Axom Adventure all consume. Don't duplicate.

---

## 6. Shared Components (Build Once, Use Many)

| Component | Service | Used By |
|-----------|---------|---------|
| Auth (JWT) | rez-auth-service :4002 | All 10 apps |
| Wallet/Coins | rez-wallet-service :4004 | All 10 apps |
| Notifications | rez-notifications-service :4011 | All 10 apps |
| Gamification | rez-gamification-service | RisaLife, Axom Adventure, RiderCircle, Karma |
| Place Graph | sync-engine place-graph :4965 | BuzzLocal + all apps (read) |
| User Memory | MemoryOS :4703 | All apps (read user's history) |
| Health Twin | risa-care-human-twin / myrisa-human-twin | RisaLife, MyRisa |
| AI Coach (LLM) | HOJAI LLM :4730 | RisaLife, MyRisa, Axom Adventure |
| Maps/Tiles | map-tile-service (new, port 4967) | BuzzLocal, RisaLife, Axom Adventure, RiderCircle, Go4Food |
| Anti-Cheat | anticheat-service :4966 | RisaLife, Axom Adventure, RiderCircle |
| Image Upload | media-service (new, port 4968) | All apps with photos |
| Search | rez-search-service | All apps |
| Reviews/Ratings | reviews-service (new, port 4969) | Go4Food, StayOwn, BuzzLocal |

**Rule:** if two apps need it, build it as a service. Never duplicate in two apps.

---

## 7. Port Registry (new infra only)

Following the existing 5114-5390 range for relocated AdBazaar services, new infra ports:

| Port | Service | Purpose |
|------|---------|---------|
| 4960 | sync-engine-api | Event ingestion |
| 4961 | sync-enricher | AI tagging |
| 4962 | sync-privacy | Visibility filter |
| 4963 | sync-fanout | Publish to subscribers |
| 4964 | sync-audit | Compliance, deletion |
| 4965 | place-graph-writer | Neo4j place writer |
| 4966 | anticheat-service | GPS / speed / spoof |
| 4967 | map-tile-service | Tiles for all apps |
| 4968 | media-service | Image / video upload |
| 4969 | reviews-service | Ratings + reviews |
| 4970 | leaderboard-service | Cross-app leaderboards |
| 4971 | league-service | Weekly/monthly leagues |
| 4972 | daily-mission-service | Daily mission generator |

**Note:** these collide with the 5114-5390 AdBazaar range? No — AdBazaar relocated to 5114-5199, 5350-5390. New range 4960-4972 is free.

---

## 8. 18-Month Roadmap

### Quarter 1 (now → Q3 2026) — Foundation + 3 apps
- **W1-4:** Build Sync Engine (5 services) + Anti-Cheat + Map Tile Service
- **W5-8:** RisaLife v1 launch in Bangalore
- **W9-12:** BuzzLocal v1 (read-only world map) + RiserCircle v1 polish + wire to Sync

### Quarter 2 (Q3 → Q4 2026) — Expand to 6 apps
- **W13-16:** MyRisa v1 polish + Axom Adventure v1
- **W17-20:** Go4Food v1 + Karma v1 polish
- **W21-24:** REZ-App v1 wallet + StayOwn v1 (5 services)

### Quarter 3 (Q4 2026 → Q1 2027) — All 10 apps at v1
- **W25-28:** Airzy v1 (3 services) + cross-app leaderboards
- **W29-32:** RisaLife v2 + MyRisa v2
- **W33-36:** Axom Adventure v2 + Go4Food v2

### Quarter 4 (Q1 → Q2 2027) — v2 features + scale
- v2 features for all apps
- 2 more city launches
- White-label for Karma (corporate CSR)
- First international market (if validation good)

---

## 9. Critical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Anti-cheat insufficient | High | Kills territory games | P0, dedicated team, 3P audit |
| Too many apps, none polished | High | Brand diluted | Ship v1 of 3 before starting app #4 |
| No user retention after 30 days | High | All apps die | Focus on ONE engagement loop per app |
| Privacy violations (DPDP/GDPR) | Medium | Legal + brand | sync-privacy service mandatory, not optional |
| Burnout (small team) | High | Execution slips | v1 cuts ruthless, no v3 work in v1 |
| Map tile costs explode | Medium | Unit economics fail | Cache aggressively, use OSM for non-touristy areas |
| Place graph data quality | Medium | AI insights bad | Enrichment quality is the actual product |

---

## 10. What This Plan Does NOT Do

- Does not promise "50+ services running" (per honest CLAUDE.md)
- Does not ship 25 modules in any single v1
- Does not start new companies for new apps (Axom Adventure lives inside Axom)
- Does not duplicate place graphs (one Neo4j, shared)
- Does not ship media-heavy features until user base justifies the cost
- Does not skip anti-cheat "for v1 to ship faster"

---

## 11. Success Criteria

After 12 months, we will judge this plan by:

- **3 apps with v1 shipped and 1,000+ DAU each** (RisaLife, BuzzLocal, MyRisa)
- **Sync Engine handling 100K events/day** without loss
- **One verified engagement loop** (daily return) in at least 2 apps
- **No privacy breach** (DPDP/GDPR compliant from day 1)
- **One cross-app viral loop** proven (e.g., RisaLife territory → BuzzLocal memory → Go4Food discovery)

If we hit 2 of 5, plan is on track. If 0 of 5, pivot.

---

## Per-app sub-plans

For each app, a dedicated sub-plan in `/docs/apps/<app>-plan.md`:

1. [`/docs/apps/risalife-plan.md`](./apps/risalife-plan.md) — Activity + territory + AI coach
2. [`/docs/apps/myrisa-plan.md`](./apps/myrisa-plan.md) — Women's health (already 80% built)
3. [`/docs/apps/axom-adventure-plan.md`](./apps/axom-adventure-plan.md) — Outdoor + adventure
4. [`/docs/apps/buzzlocal-plan.md`](./apps/buzzlocal-plan.md) — Read layer + world graph
5. [`/docs/apps/ridercircle-plan.md`](./apps/ridercircle-plan.md) — Motorcycle OS (existing)
6. [`/docs/apps/go4food-plan.md`](./apps/go4food-plan.md) — Food discovery (v1: no delivery)
7. [`/docs/apps/karma-plan.md`](./apps/karma-plan.md) — Social impact + visible Karma Score
8. [`/docs/apps/airzy-plan.md`](./apps/airzy-plan.md) — Travel (pick 3 services, not 20)
9. [`/docs/apps/rez-app-plan.md`](./apps/rez-app-plan.md) — Commerce + wallet
10. [`/docs/apps/stayown-plan.md`](./apps/stayown-plan.md) — Hotels (pick 5 services, not 45)
11. [`/docs/apps/sync-engine-plan.md`](./apps/sync-engine-plan.md) — The keystone

---

## 12. Open Questions (to resolve before writing sub-plans)

1. **Single-tenant vs multi-tenant** place graph? (One shared world graph is the bet — confirm.)
2. **Data ownership** when RisaLife territory appears in BuzzLocal memory? (User owns; apps read with consent.)
3. **REZ Coins unification** — is one wallet across all apps, or per-app? (Recommend: one wallet.)
4. **India-only or global from day 1?** (Recommend: India first, global v2.)
5. **Who owns the Sync Engine?** New company, or under RABTUL? (Recommend: RABTUL — infrastructure company.)
6. **Privacy defaults** — opt-in or opt-out for cross-app memory? (Recommend: opt-in, conservative.)

---

*End of master plan. Sub-plans to be drafted next.*
