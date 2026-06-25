# Genie Household OS (C7)

> **"One household, many people, shared lists + meals + chores + events."**
>
> Multi-user shared family/group space. Multiple Genie users belong to one household and coordinate lists, meals, chores, and events.

**Service:** `genie-household`
**Port:** 4737
**Package name:** `@rtmn/genie-household`
**Status:** ✅ Built (C7, 2026-06-25). 35 readiness tests pass + 13 smoke checks.

---

## What It Does

Solves the **shared-family coordination gap**. Each Genie user is a person, but real life is a *household* with multiple people juggling:

- **Shopping lists** (who added what, who's checked it off)
- **To-do lists** (bills, appointments, kid stuff)
- **Meal plans** (Mon dinner: pasta, Tue dinner: tacos, …)
- **Chores** (assigned to specific members, daily/weekly cadence)
- **Events** (birthdays, anniversaries, trips)

In Genie's vision: each person has their own AI Twin, but the household has a **shared digital twin** that knows everyone's role and orchestrates the family.

---

## Modules

### 1. Households
- Multiple members per household
- Each member has: `userId`, `name`, `role` (owner/adult/child), `avatar`
- Owner's `userId` is the founder

### 2. Lists
- Categories: `shopping`, `todo`, `packing`, `wishlist`, `other`
- Each item: `text`, `addedBy`, `checked`, `checkedBy`, `checkedAt`
- Filter by category via `?category=shopping`

### 3. Meals
- Weekly meal plan
- Each meal: `day` (mon-sun), `meal` (breakfast/lunch/dinner/snack), `title`, `cook` (userId), `notes`
- `/meals/week` returns meals grouped by day

### 4. Chores
- Recurring tasks
- Each chore: `title`, `assignedTo` (userId), `cadence` (daily/weekly/monthly), `done`

### 5. Events
- Shared calendar entries
- Each event: `title`, `date` (ISO), `type` (birthday/anniversary/trip/holiday/other), `addedBy`

---

## Endpoints

```
GET    /health                                   — public health
GET    /                                         — service banner

GET    /household/get/:householdId               — full household (members + counts)
GET    /household/list/:userId                   — user's households
POST   /household/create/:userId                 — create household
POST   /household/:householdId/members/add/:userId    — add member
DELETE /household/:householdId/members/remove/:userId — remove member

POST   /household/:householdId/lists/add/:userId       — add list item
GET    /household/:householdId/lists/list              — list items (?category)
POST   /household/:householdId/lists/check/:itemId/:userId — check off item

POST   /household/:householdId/meals/add/:userId       — add meal
GET    /household/:householdId/meals/week              — week's meals (grouped by day)

POST   /household/:householdId/chores/add/:userId      — add chore
GET    /household/:householdId/chores/list             — list chores

POST   /household/:householdId/events/add/:userId      — add event
GET    /household/:householdId/events/list             — list events

GET    /api/readiness                             — readiness probe
GET    /api/llm-health                            — LLM (if used)
```

---

## Seed Data

The service ships with **1 seeded household** (`hh-shared-001`):

- **Name:** "Our Home"
- **Members:** You (owner 👤), Partner (adult 👩), Kiddo (child 🧒)
- **5 list items:** 2 unchecked shopping (milk/eggs) + 1 checked shopping (bread) + 2 unchecked todos
- **4 meals:** Mon/Tue/Wed/Thu dinners (pasta/tacos/stir fry/pizza)
- **3 chores:** Take out trash (you), Vacuum (partner), Water plants (kiddo, done)
- **3 events:** Kiddo's birthday (Aug 15), Anniversary (Sep 10), Goa trip (Dec 20)

---

## Tests

### `tests/household-readiness.test.mjs` — 35/35 pass
Covers:
- Health + readiness
- Household CRUD (create, get, list)
- Members (add, remove, role validation)
- Lists (add, check, filter by category, count unchecked)
- Meals (add, get-week grouped by day)
- Chores (add, mark done)
- Events (add, list, by date)
- Auth (401 without token, 403 wrong role)

### `tests/smoke.sh` — 13/13 pass
End-to-end smoke against running service.

Run:
```bash
node --test tests/household-readiness.test.mjs
JWT_SECRET=test INTERNAL_SERVICE_TOKEN=t node src/index.js &
bash tests/smoke.sh
```

---

## How It Fits

- **C7 of the 40-feature Genie moat roadmap** (Phase C: deeper personal AI).
- Household data is independent of personal data — your twin doesn't see household events unless you grant access.
- Pairs with **Personal AI Team (C5)** — when you chat with a Coach, they can see your chores ("you're behind on water plants") but not your partner's private notes.
- Pairs with **Connected Accounts (C9)** — Household Calendar syncs with Google Calendar for the family.

---

## Web UI

`/household` route in the Genie PWA → `HouseholdScreen.tsx` with tabs:
- **Home** — members + counts of items/meals/chores/events
- **Lists** — grouped by category, check off
- **Meals** — week view (Mon-Sun)
- **Chores** — assign + done toggle

Accessible from `MeTab` → "Household" card.

---

*Built as part of Phase C (Moat Features) of the 40-feature Genie vision.*