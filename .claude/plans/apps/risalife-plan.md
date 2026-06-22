# RisaLife — Activity + Territory + AI Coach

**Owner:** RisaCare
**Status:** New product (vision doc has 25 modules — this is the ruthless cut)
**Positioning:** "Your AI Companion for a Healthier, Happier Life"
**Tagline:** v1 = "Move. Capture. Level up."

---

## v1 Scope (8 weeks) — Bangalore only

### 4 features, nothing else
1. **Activity tracking** — walk / run / cycle only
2. **Territory capture** — hex grid, GPS, anti-cheat
3. **AI Coach** — daily plan based on sleep + activity (rule-based v1, LLM v2)
4. **REZ Coins** — 3 earn paths, 1 redeem path

### Hard cuts
- ❌ Yoga, gym, swimming, sports (v2)
- ❌ Nutrition, water, meals (v2)
- ❌ Sleep tracking (use Apple Health / Google Fit read-only v1, own sleep v2)
- ❌ Mental wellness, meditation, journaling (v2)
- ❌ Health records, doctor booking, pharmacy (v3, already in RisaCare elsewhere)
- ❌ Family, corporate, kids, seniors (v3)
- ❌ Wearable integration (Apple Health auto-import only v1; Garmin/Fitbit v2)
- ❌ Marketplace (v3)
- ❌ Multi-city launch (Bangalore only v1)

---

## Tech & services to build

| Service | Port | Purpose | Reuse |
|---------|------|---------|-------|
| `risalife-activity` | 4826 | Walk/run/cycle tracking | new |
| `risalife-territory` | 4827 | Hex grid, capture logic | new |
| `risalife-ai-coach` | 4828 | Daily plan generator | HOJAI LLM :4730 |
| `risalife-league` | 4829 | Weekly city champions | league-service :4971 |
| `risalife-app` | 4830 | Mobile app | React Native + Expo |

**Reuse (don't rebuild):**
- rez-auth :4002, rez-wallet :4004, rez-notifications :4011
- MemoryOS :4703 (user history)
- myrisa-human-twin :4824 (Health Twin for cross-domain)
- anticheat-service :4966
- sync-engine :4960 (every territory event published)

---

## Engagement loop (v1)

```
User opens app
  → AI Coach: "Good morning. You slept 6h12m. Today: 6,500 steps, 20 min yoga (deferred to v2), 2.8L water (deferred to v2)."
  → v1: "Today: 6,500 steps OR run 3km. Pick one."
  → User runs
  → GPS captures territory (hex)
  → Anti-cheat validates
  → REZ Coins: +50
  → Leaderboard updates
  → Tomorrow: 6,500 steps again
```

**Daily mission** is the single retention lever. The 70/20/10 split (from Runiverse doc 2) applies:
- 70% movement
- 20% community (see who else is in your area)
- 10% rewards (REZ Coins)

---

## Territory mechanics

- **Hex size:** 30m (urban) — adjustable per city density
- **Capture:** first user to traverse a hex owns it (until decay)
- **Defense:** if you don't return within 14 days, your claim weakens 50%/week
- **Capture limit:** max 500 hexes per user per day (anti-grind)
- **Capture rate:** 1 hex per 10m of activity (not per GPS ping — anti-spam)

**Anti-cheat (mandatory):** every territory event goes through `anticheat-service :4966`. No exceptions. Build mock-location detection into the mobile client itself (pre-flight check before GPS event is published).

---

## AI Coach (v1 = rule-based, v2 = LLM)

v1 daily plan inputs:
- Last 7 days activity (steps, distance, active minutes)
- Last night sleep duration (from Apple Health)
- Yesterday's RPE (rate of perceived exertion, user-reported 1-10)
- Current streak

v1 daily plan output:
- 1 movement goal (steps OR distance)
- 1 consistency nudge (streak, rest day, etc.)
- 0 nutrition, 0 sleep advice (not in v1)

v2 adds:
- LLM-generated natural language explanation
- Personalized intensity recommendations
- Cross-domain (sleep → activity correlation)

---

## REZ Coins (v1)

**Earn:**
- Complete daily mission: +20
- Capture new hex: +5 per hex (capped 50/day)
- 7-day streak: +100 bonus
- Weekly city top 100: +500

**Redeem (v1 = 1 path only):**
- REZ Wallet transfer to REZ-App (use rez-wallet :4004)

**Deferred to v2:** brand rewards, gym discounts, insurance benefits.

---

## Mobile app screens (v1 = 10 screens)

1. Onboarding (interests, location, CorpID login)
2. Home (today's mission, current territory, streak)
3. Activity (start/stop tracking, live map)
4. Activity summary (distance, pace, hex captured, coins)
5. Territory (your map, your hexes)
6. Leaderboard (your city, this week)
7. AI Coach (today's plan, history)
8. Profile (badges, streak, coins)
9. Wallet (REZ Coins, history)
10. Settings (visibility, anti-cheat status)

**No** feed, no social, no photos in v1. Adding feeds invites engagement inflation.

---

## Success criteria for v1

- 1,000 downloads in Bangalore
- 30% D7 retention (industry avg for fitness apps is ~25%)
- < 0.5% territory events flagged as cheated
- < 2s cold-start to first GPS lock
- 1 verifiable engagement loop (daily mission completion)

---

## What I would NOT do

- Don't ship 25 modules. Ship 4.
- Don't add social/feed in v1.
- Don't add photos / video in v1.
- Don't launch in multiple cities. Bangalore, prove, then expand.
- Don't promise "AI coach" if it's just an if-else. Either it's real or call it "Daily Plan."
- Don't ship without anti-cheat.
