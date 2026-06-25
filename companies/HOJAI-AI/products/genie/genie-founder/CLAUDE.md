# Genie Founder OS (C6)

> **"Your AI Co-founder. Twin + Dashboard + Weekly Briefing + AI Board Advisor."**
>
> The CEO/co-founder experience for the user-as-founder. Combines Founder Twin, KPI Dashboard, weekly Founder Briefing, and an AI Board of 4 expert personas.

**Service:** `genie-founder`
**Port:** 4738
**Package name:** `@rtmn/genie-founder`
**Status:** ✅ Built (C6, 2026-06-25). 33 readiness tests pass + 22 smoke checks.

---

## What It Does

Solves the **solo founder's hardest problem**: not having a co-founder or board. Genie Founder OS gives you:

### 1. Founder Twin
- Digital twin of your founder journey
- Stage (idea → pre-seed → seed → series-A → … → mature)
- Mission, vision, values
- ARR, MRR (computed), runway, customers, team size

### 2. KPI Dashboard
- Aggregates milestones + OKRs + team
- Milestone counts (done / in-progress / todo)
- OKR average progress
- Team size + total equity + cap table

### 3. Weekly Briefing (LLM-powered)
- Tight, founder-voice weekly briefing
- Sections: STATE → WINS → IN PROGRESS → RISKS → NEXT 7 DAYS
- LLM with structured fallback (works without LLM)
- Configurable: weekly / monthly / quarterly

### 4. AI Board Advisor (4 personas)
- **Patricia (VC)** 💼 — market size, defensibility, return potential
- **Marco (Operator)** ⚙️ — execution speed, focus, leverage
- **Riya (Customer)** 🎯 — why would I pay, magic moment
- **Eleanor (Mentor)** 🦉 — blind spots, character, next-level growth
- Each ask gets tailored LLM advice + persisted in history

### 5. Milestones
- Free-form milestones with title, target date, notes, status
- Mark complete → triggers completion timestamp

### 6. OKRs
- Objectives with N key results
- Per-KR progress (0-100%)
- Quarter tag

### 7. Team / Cap Table
- Members with name, role, equity %, join date
- Total equity validation (caller's responsibility to keep under 100)

---

## Endpoints

```
GET    /health
GET    /                                          — service banner

GET    /founder/get/:userId                       — founder profile
PUT    /founder/update/:userId                    — update profile
GET    /founder/dashboard/:userId                 — aggregated KPIs + recent items
GET    /founder/briefing/:userId                  — weekly briefing (?type=weekly|monthly|quarterly)

GET    /founder/board/:userId                     — list 4 personas
POST   /founder/board/ask/:userId                 — ask a persona (LLM-backed)
GET    /founder/board/history/:userId             — past advice

GET    /founder/milestones/:userId
POST   /founder/milestones/add/:userId
POST   /founder/milestones/complete/:milestoneId/:userId

GET    /founder/okrs/:userId
POST   /founder/okrs/add/:userId

GET    /founder/team/:userId
POST   /founder/team/add/:userId

GET    /api/readiness
```

---

## Seed Data

Ships with a realistic seed-stage founder:
- **Company:** Acme AI (B2B SaaS, seed stage)
- **Mission:** "Make every small business AI-native."
- **Vision:** "A world where 1-person companies have 1,000-person leverage."
- **KPIs:** 14mo runway, $12K ARR, 8 customers, 3-person team
- **6 milestones:** Ship MVP (done), 10 customers (done), pre-seed $250K (done), $1K MRR (in progress), founding engineer (in progress), seed $1.5M (todo)
- **2 OKRs:** Reach $10K MRR by EOY, Build founding team (Q3)
- **3 team members:** You (CEO, 70%), Jamie (CTO, 20%), Sam (Eng, 3%)
- **1 sample board advice:** "Prioritization" from Operator persona

---

## Tests

### `tests/founder-readiness.test.mjs` — 33/33 pass
Covers:
- Health + readiness
- Auth (401 without token)
- Founder profile CRUD (get, update, 404, invalid stage)
- Dashboard KPIs aggregation
- Briefing structure (LLM + fallback)
- Milestones (list, add, complete, ownership validation, status validation)
- OKRs (list, add, KRs validation)
- Team (list, add, equity validation)
- Board (4 personas, ask + source, history, fallback persona)

### `tests/smoke.sh` — 22/22 pass
End-to-end smoke.

Run:
```bash
npm test
JWT_SECRET=test INTERNAL_SERVICE_TOKEN=t node src/index.js &
bash tests/smoke.sh
```

---

## How It Fits

- **C6 of the 40-feature Genie moat roadmap** (Phase C: deeper personal AI).
- Pairs with **Personal Digital Twin (C2)** — your founder twin is a specialized version of your personal twin.
- Pairs with **Personal AI Team (C5)** — your founder's AI Board complements your personal AI team.
- Pairs with **Connected Accounts (C9)** — Pulls ARR data from Stripe; pulls user metrics from Mixpanel/Amplitude once connected.

---

## Web UI

`/founder` route in the Genie PWA → `FounderScreen.tsx` with 4 tabs:
- **Dashboard** — KPIs + recent milestones + cap table
- **Briefing** — this week's briefing with copy-to-clipboard
- **Board** — 4 personas, ask form, history
- **Milestones** — list + add + complete

Accessible from `MeTab` → "Founder OS" card.

---

*Built as part of Phase C (Moat Features) of the 40-feature Genie vision.*