# BuzzLocal — World Discovery Graph (READ LAYER)

**Owner:** Axom
**Status:** Code exists, services unverified live (per CLAUDE.md audit 2026-06-22)
**v1 = READ ONLY**: No user-generated content from inside BuzzLocal. Just consume from Sync Engine.

---

## The Strategy (this is the new positioning)

**BuzzLocal is the world's discovery feed for our ecosystem.** It's not a social app. It's not a city app. It's the **read layer** that turns the other 9 apps' writes into a coherent map of the world.

Think: **Waze for the world's places**, but the data comes from RisaLife runs, RiderCircle rides, Go4Food meals, StayOwn stays, Karma impacts.

---

## v1 Scope (8 weeks) — Read-only world map

### 3 features only
1. **World map** — every place with activity (RisaLife territory + Go4Food reviews + StayOwn stays + Karma events)
2. **Activity feed** — your friends' + your own events across all apps
3. **Place detail** — tap a place, see everything: photos, activities, reviews, ratings

### Hard cuts
- ❌ No "Create Post" inside BuzzLocal (other apps create, BuzzLocal reads)
- ❌ No Ask Buzz AI (defer to v2)
- ❌ No Society OS / Apartments (defer to v2)
- ❌ No REZ Safe / SOS (defer to v2 — RisaLife has SOS)
- ❌ No Crisis mode (defer to v3)
- ❌ No Marketplace (defer to v3 — Go4Food has food)
- ❌ No Merchant dashboard (defer to v3)
- ❌ No Coin rewards for BuzzLocal (REZ Wallet is in REZ-App, not here)

---

## Why this is the right cut

The original BuzzLocal vision had 8 layers (Community / Safety / Commerce / AI / Trust / Society / Density / Civic). That's a city app. **That's not what wins.** What wins is: open BuzzLocal, see your friend's run, your mom's karma event, your colleague's StayOwn check-in, all in one place. That's the moat.

The city app features can come later. The world graph is the priority.

---

## Services to build (v1)

| Service | Port | Purpose | Reuse |
|---------|------|---------|-------|
| `buzzlocal-read-api` | 4040 | Query place graph + events | sync-engine :4960 |
| `buzzlocal-feed` | 4041 | Build personalized feed | memory + sync |
| `buzzlocal-place` | 4042 | Place detail page | place-graph :4965 |
| `buzzlocal-app` | 4043 | Mobile app shell | React Native + Expo |

**Reuse (massive):**
- Sync Engine :4960 (events come in)
- Place graph :4965 (places come from)
- MemoryOS :4703 (user's history)
- REZ Auth :4002
- Map tile service :4967
- Media service :4968 (photos only, not uploads from BuzzLocal)

---

## Read API contract (v1)

```typescript
GET /api/v1/places?lat=&lng=&radius=   // places in viewport
GET /api/v1/places/:id                 // place detail
GET /api/v1/places/:id/events          // all events at this place
GET /api/v1/feed?cursor=               // personalized feed
GET /api/v1/feed?type=run              // filtered feed
```

No write endpoints. No `POST /api/v1/posts`. Read-only.

---

## The Place Detail Page (the killer feature)

When you tap a place in BuzzLocal, you see:

```
Cubbon Park, Bangalore
─────────────────────────
📍 12.9763°N, 77.5927°E

🟢 RisaLife: 18,000 runs, 460 active users this month
🏍 RiderCircle: 5,200 bike visits
🥾 Axom Trails: 220 treks logged
🍜 Go4Food: 12 nearby restaurants (4.7⭐ avg)
🏨 StayOwn: 8 hotels within 2km
💚 Karma: 12 cleanup events

📸 120 photos
🎥 14 videos
📖 8 journals
⭐ 4.9 from 800 users

Best Sunrise Spot ⭐ (community voted)

[See your visits] ← from MemoryOS
```

**This is the moat.** No competitor has this view. It's only possible because 9 apps write to the same graph.

---

## Engagement loop (v1)

```
User opens BuzzLocal
  → Map shows their city, color-coded by activity density
  → Tap place → see all activity (their own + community)
  → Tap "See your visits" → memory from 3 weeks ago (RisaLife run)
  → Tap "Open in RisaLife" → jumps to RisaLife app, that specific activity
  → User shares a place → friends see it in their feed
  → Returns next week to see new activity
```

---

## The "Open in [App]" deep-link pattern

BuzzLocal never creates content. It **links out to** the app that owns the action:
- "See this run" → RisaLife
- "See this ride" → RiderCircle
- "See this stay" → StayOwn
- "Order this food" → Go4Food

This is critical. BuzzLocal doesn't compete with the writing apps — it amplifies them.

---

## Mobile app screens (v1 = 8 screens)

1. Onboarding (CorpID login, location, interests — sync from other apps)
2. World Map (color-coded by activity)
3. Place Detail (the killer screen)
4. Feed (personalized, cross-app)
5. Search (places, events, friends)
6. Profile (your cross-app activity, pulled from place graph)
7. Notifications (when friends visit places you recommended)
8. Settings (visibility, deep-link permissions)

**No** create-post button. **No** upload photo. **No** direct message. Read-only.

---

## Success criteria for v1

- 5,000 downloads (BuzzLocal is the entry door — should be highest of all)
- 50% D7 retention (place detail is sticky)
- 1 verifiable "aha" moment: user sees their own data from another app in BuzzLocal
- < 1s map load for city viewport
- Zero user-generated content moderation burden (none exists)

---

## What I would NOT do

- Don't ship the 8-layer City OS in v1. Ship the read layer.
- Don't let users post from BuzzLocal. Period.
- Don't add Ask Buzz AI (LLM cost not justified for v1).
- Don't add Society / Apartments / Crisis (massive scope).
- Don't try to be Nextdoor + Citizen + Google Maps in v1.
