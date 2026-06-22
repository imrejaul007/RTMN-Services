# Axom Adventure — Outdoor & Exploration

**Owner:** Axom (new code path, NOT new company)
**Status:** New product
**Recommended name:** **Axom Trails** (clearer than "Adventure")
**Positioning:** "Explore Beyond Limits"
**v1 scope:** 6 weeks

---

## v1 Scope — 4 features

1. **Route discovery** — read-only map of treks, rides, camps (use Sync Engine + OpenStreetMap)
2. **Activity tracking** — trek / hike / motorcycle / cycle / off-road
3. **Community feed** — photos per place (lightweight, optional)
4. **AI Adventure Guide** — weather + safety + skill-level match (rule-based v1)

### Hard cuts
- ❌ Kayak, paragliding, scuba, rafting, skiing (v2)
- ❌ Booking marketplace (v2)
- ❌ Equipment rental (v2)
- ❌ Offline maps (v2 — use cached tiles in v1)
- ❌ AR / drone / 360 video (v3)
- ❌ Group rides / convoy tracking (v2)
- ❌ Adventure Twin (defer to v2 — use Human Twin from MyRisa/RisaLife in v1)

---

## Why Axom Trails, not Axom Adventure

"Adventure" is a vibe. "Trails" is a product. Users searching the app store for "trek app" or "hiking app" won't find "Adventure." The 70/20/10 engagement split (movement / community / rewards) and the AI guide are the differentiators, not the name.

---

## Tech & services

| Service | Port | Purpose | Reuse |
|---------|------|---------|-------|
| `axom-trails-activity` | 4831 | Trek / ride / cycle tracking | shares territory engine with RisaLife |
| `axom-trails-routes` | 4832 | Route discovery, difficulty | OpenStreetMap + place graph |
| `axom-trails-feed` | 4833 | Photos per place | media-service :4968 |
| `axom-trails-ai-guide` | 4834 | Weather, skill match, safety | HOJAI LLM :4730 + anticheat :4966 |
| `axom-trails-app` | 4835 | Mobile app | React Native + Expo |

**Reuse (massive):**
- Territory engine from RisaLife (same hex grid, anti-cheat, decay)
- Sync Engine :4960 (publishes `AdventureCompleted`)
- Place graph :4965
- REZ Wallet :4004 (coins)
- League service :4971 (different league: Top Trekker, Top Photographer)

---

## Engagement loop (v1)

```
User opens app
  → AI Guide: "Weather clear. Beginner-friendly trek in Coorg 3hrs away. Want to plan?"
  → User picks
  → Map shows route, water points, camps
  → User completes trek
  → Territory captured (anti-cheat validated)
  → Community photo (optional, never required)
  → REZ Coins: +75 (trek complete) + 25 (new territory) + 50 (photo)
  → League update
  → Weekly champion in 30 days
```

---

## Differentiator: skill-level matching

RisaLife doesn't have this. Axom Trails should.

- Each route tagged with difficulty (1-5)
- Each user gets a "Trekker Level" based on past activities
- AI Guide warns: "This route is level 4. You're level 2. Consider [easier route] instead."

This is the single feature that prevents user injury → bad reviews → churn.

---

## Mobile app screens (v1 = 12 screens)

1. Onboarding (interests: trek / ride / cycle, skill level)
2. Home (today's suggested route, current territory)
3. Discover (route list, filter by difficulty + distance)
4. Route detail (map, difficulty, photos, reviews)
5. Activity (start/stop, live tracking)
6. Activity summary
7. Map (territory + routes)
8. Feed (photos from your area, optional)
9. AI Guide (chat with weather + skill context)
10. Profile
11. Wallet
12. Settings

---

## Success criteria for v1

- 500 downloads (lower than RisaLife — niche audience)
- 40% D7 retention (higher than RisaLife — niche audiences retain better)
- 1 verified safety case (AI Guide warned a user off a dangerous route)
- < 1% routes flagged as inaccurate by community

---

## What I would NOT do

- Don't build 10+ activity types. Build 4.
- Don't ship booking in v1.
- Don't build offline maps. Cached tiles are fine.
- Don't build a separate auth. Use rez-auth.
- Don't add 25 features. Ship 4.
