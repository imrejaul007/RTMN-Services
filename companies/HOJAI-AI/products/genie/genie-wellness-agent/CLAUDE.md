# Genie Wellness Agent (D3)

> **"Your personal health HQ. Metrics, workouts, meals, goals, insights."**
>
> Full health tracking replacing the 66-LOC `genie-wellness-os` stub.

**Service:** `genie-wellness-agent`
**Port:** 4741
**Package name:** `@rtmn/genie-wellness-agent`
**Status:** ✅ Built (D3, 2026-06-25). 28 readiness tests + 20 smoke checks.

---

## What It Does

Solves the stub-Wellness problem. The old `genie-wellness-os` was 66 lines and didn't track anything meaningful. This is a proper wellness tracker.

### Modules

1. **Metrics** — daily entries: weight, sleep, steps, water, mood, energy, heart_rate, blood_pressure, custom
2. **Workouts** — cardio / strength / yoga / swimming / cycling / walking / sports / other with duration + calories + intensity
3. **Meals** — food log: name, calories, protein/carbs/fat macros, meal type (breakfast/lunch/dinner/snack)
4. **Goals** — targets with metric, target value, period (daily/weekly/monthly), progress
5. **Insights** — weekly summary with LLM-powered tips
6. **Dashboard** — today's snapshot: metrics + meals + workouts + net calories

---

## Endpoints

```
GET    /health
GET    /                                            — banner

GET    /metrics/:userId (?type, ?from, ?to)         — list metrics
POST   /metrics/:userId                             — log metric
DELETE /metrics/:entryId/:userId                    — delete

GET    /workouts/:userId
POST   /workouts/:userId

GET    /meals/:userId (?day, ?meal)
POST   /meals/:userId

GET    /goals/:userId
POST   /goals/:userId
POST   /goals/:goalId/progress/:userId (?amount=)

GET    /insights/:userId                            — weekly summary + LLM tips
GET    /dashboard/:userId                           — today's snapshot
```

---

## Seed Data (for user-001)

- **42 metrics** (7 days × 6 types): weight, sleep, steps, water, mood, energy
- **3 workouts**: Morning run (cardio), Upper body (strength), Evening yoga (yoga)
- **5 meals** (today + yesterday): Oatmeal+berries, Chicken salad, Salmon+rice, Greek yogurt, Protein shake
- **4 goals**: Sleep 8h, 10K steps, Drink 3L water, Workout 5x/week

---

## Tests

### `tests/wellness-readiness.test.mjs` — 28/28 pass
Covers: health, metrics CRUD + filter + delete, workouts, meals, goals + progress + validation, insights, dashboard, auth.

### `tests/smoke.sh` — 20/20 pass

Run:
```bash
npm test
JWT_SECRET=test INTERNAL_SERVICE_TOKEN=t node src/index.js &
bash tests/smoke.sh
```

---

## How It Fits

- **D3 of the Phase D Agent-Gaps roadmap** — replaces the stub **Health/Wellness Agent** in the 13-agent Genie vision.
- Pairs with **Personal Twin (C2)** — your wellness data feeds your twin ("sleep is averaging 6.5h this week").
- Pairs with **Personal AI Team (C5)** — your Coach / Doctor can read wellness trends.
- Pairs with **Connected Accounts (C9)** — once connected to Apple Health / Fitbit / Garmin, real data syncs in.

---

## Web UI

`/wellness` route in the Genie PWA → `WellnessScreen.tsx` with 4 tabs:
- **Today** — dashboard snapshot: net calories, today's metrics
- **Trends** — 7-day metrics by type
- **Workouts** — list + add
- **Goals** — list + progress bars + add

Accessible from `MeTab` → "Wellness" card.

---

*Built as part of Phase D (Agent Gaps) of the 40-feature Genie vision.*