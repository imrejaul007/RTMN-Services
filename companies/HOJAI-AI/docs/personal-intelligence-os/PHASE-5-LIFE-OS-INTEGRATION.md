# Personal Intelligence OS — Phase 5: Life OS Integration

**Status:** 🟡 Planned (target: end of October 2026)
**Tagline:** *Genie touches every part of your life — not just the app.*

---

## What this phase ships

Genie stops being an app and starts being **the layer under your life**:

| # | Integration | What it does |
|---|-------------|--------------|
| 5.1 | **Health** — Apple Health, Google Fit, Whoop, Oura | Genie reads your steps, sleep, HRV, workouts. Correlates with mood and productivity. |
| 5.2 | **Calendar** — Google, Apple, Outlook | Bi-directional sync. Genie can create, edit, cancel events. |
| 5.3 | **Email** — Gmail, Outlook | Genie reads your inbox (with permission) and surfaces what matters. |
| 5.4 | **Contacts** — phone, Google, Apple | Auto-build the relationship graph from real contact data. |
| 5.5 | **Photos** — iCloud, Google Photos | Find photos of people in your relationship graph; surface "year ago today" moments. |
| 5.6 | **Tasks** — Things, Todoist, Apple Reminders | Genie reads/writes your task list. |

---

## The principle

Genie should know what you know. Not more, not less. If you track your sleep in Oura but not your mood, Genie should know your sleep but not invent a mood score. The goal is **passive completeness**, not invasive surveillance.

Every integration is:
- **Opt-in.** Default OFF.
- **Scoped.** Read-only by default. Write requires explicit "Genie can manage my X" toggle.
- **Auditable.** Every read/write is in the memory-substrate audit log.
- **Revocable.** Disconnect = full data deletion, not just "stop the flow."

---

## Health integration

The existing `genie-wellness-os` (port 4723) is a stub. Phase 5 turns it into a real wellness brain.

### Data sources (5)

| Source | What we get | Auth |
|--------|-------------|------|
| Apple Health | steps, sleep, HR, HRV, workouts, mindful minutes | HealthKit permission |
| Google Fit | steps, sleep, workouts | OAuth |
| Whoop | recovery, strain, sleep | OAuth |
| Oura | readiness, sleep, activity | OAuth |
| Manual entry | mood, energy, food (via Genie chat) | n/a |

### What Genie does with it

- **Correlation engine** — finds patterns ("your mood is highest on days you sleep > 7.5h AND have a morning workout")
- **Predictive nudges** — "you slept 5h 3 nights in a row. Based on your history, your productivity drops 40% on day 4. Want me to block your calendar tomorrow morning?"
- **Goal tracking** — "you said you wanted to run a 5K by June. Your weekly mileage is averaging 8mi, you need 12. Should I find a 5K plan for you?"
- **Recovery awareness** — "your Whoop recovery is in the red. Want me to cancel your 6pm workout class?"

### What Genie does NOT do

- ❌ Diagnose medical conditions
- ❌ Recommend supplements
- ❌ Compare to other users
- ❌ Send health data to advertisers (no data leaves the user's device except via user-initiated sync)

---

## Calendar integration

Genie already has `genie-calendar-service` (port 4709) as an internal specialist. Phase 5 makes it a **real** calendar with the user's actual data.

### Capabilities

- **Read** all events from primary calendar
- **Create** events with natural language ("schedule a call with Reza tomorrow at 3pm")
- **Edit** events ("move my 2pm to 4pm")
- **Cancel** with confirmation
- **Find time** for meetings across multiple calendars
- **Detect conflicts** before creating
- **Respect working hours** (configurable)
- **Travel time** between events (uses current location if shared)

### What makes Genie different

- **It knows context.** "Schedule a call with Reza" → Genie knows who Reza is (frequent contact, mentioned 12 times this month), prefers afternoons, doesn't have a meeting at 3pm Wed.
- **It preps the meeting.** 5 min before, Genie whispers: "Reza — you last spoke 2 weeks ago about the pricing page. He wanted to review the analytics dashboard. Here's the doc."
- **It follows up after.** "How did the call with Reza go? Want me to set a follow-up?"

---

## Email integration

The most sensitive integration. Default OFF. Heavy permissioning.

### Read-only mode (default)

- Genie reads the inbox, surfaces 3 things per day max:
  - "From your mom — wants to know if you're coming for Diwali"
  - "From your boss — Q3 planning, due Friday"
  - "From Stripe — payment received from Acme"
- User can drill down for more
- Genie never reads an email twice unless the user asks
- Genie cannot reply, forward, or delete

### Write mode (opt-in)

- "Reply to Reza's email saying yes, Thursday at 3"
- "Draft a follow-up to the Acme thread"
- "Move all newsletters to a folder"

The user sees the draft before it's sent. Genie never sends without explicit confirmation.

### What Genie does NOT do

- ❌ Read emails from "sensitive" categories (banking, medical, legal) by default
- ❌ Send without confirmation
- ❌ Train on the user's emails
- ❌ Share email content with other services (only the user's own Genie can read it)

---

## Contacts integration

The relationship graph (Phase 3) gets a major upgrade: real contact data.

### What we pull

- Name, phone, email (the basics)
- Last contacted (from call log, message log — with permission)
- Interaction frequency
- Tags (if user has them in Google Contacts / iOS)

### What we DON'T pull

- Contact photos (privacy)
- Notes (user-curated, not for Genie)
- Social profiles (too invasive)
- Address (rarely needed)

### The relationship graph becomes real

- "Who do I talk to most?" → real call/SMS data
- "Who haven't I contacted in 3 months?" → objective, not just chat mentions
- "When's the last time I saw my dad?" → calendar + location data

---

## Photos integration

This is the "life replay" feature from the vision. Lower priority than the others, but high emotional impact.

### What Genie can do

- **"Year ago today"** — surface photos from the same date in previous years
- **"Show me photos of Sarah"** — face-recognition-clustered results from the relationship graph
- **"Make a slideshow for mom's birthday"** — auto-curate the last year
- **"What did I do last summer?"** — month-by-month photo timeline

### What Genie does NOT do

- ❌ Face recognition on people NOT in the relationship graph
- ❌ Share photos with anyone
- ❌ Upload photos to any server (all on-device)
- ❌ Auto-tag people without confirmation

---

## Tasks integration

Read/write to the user's task manager. Genie becomes the front-end for getting things done.

### Capabilities

- "Add 'call mom' to my todo list"
- "What's on my plate today?"
- "Move 'review PR' to tomorrow"
- "Mark the dentist call as done"
- "Show me everything related to the Q3 launch"

### Cross-app awareness

If a task involves an email, Genie can open the email thread.
If a task involves a calendar event, Genie can show the event.
If a task involves a person, Genie can show the relationship.

---

## Success metrics

- **Integration opt-in rate** — Health 40%, Calendar 60%, Email 20%, Contacts 50%, Photos 25%, Tasks 35%
- **Health correlation insights acted on** — > 30% of insights get a user response
- **Calendar "find time" success rate** — > 80% of natural language scheduling requests succeed
- **Email daily digest open rate** — > 50%
- **Tasks created via Genie** — > 20% of user's tasks are Genie-created
- **Integration retention** — > 70% of users who connect a service are still using it 30 days later

---

## Team (5 engineers)

| Engineer | Owns | Timeline |
|----------|------|----------|
| **Eng A** | Health integration (Apple Health + Google Fit) | Month 5 weeks 1-3 |
| **Eng B** | Calendar integration (Google + Apple + Outlook) | Month 5 weeks 1-3 |
| **Eng C** | Email integration (Gmail + Outlook) — read-only first, write opt-in | Month 5 weeks 2-4 |
| **Eng D** | Contacts + Photos integration | Month 5 weeks 2-4 |
| **Eng E** | Tasks integration (Things, Todoist, Reminders) | Month 5 weeks 3-4 |
| **All** | Privacy controls + audit + revocation | Month 5 week 4 |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Privacy backlash from any integration | Default OFF; one-tap disconnect = full data deletion; published privacy policy with audit rights |
| Health data is too sensitive to handle | On-device processing only; no raw data leaves device; opt-in to share with Genie |
| Email integration feels like surveillance | "Sensitive" category filtering; never reads banking/medical/legal; max 3 digests/day |
| Calendar conflict with existing apps | Deep links to native apps for "open in Calendar"; don't try to replace the calendar UI |
| Photos integration creep | Strict on-device processing; no upload; no auto-tagging; year-ago feature only |
| Tasks integration splits user's attention | Genie becomes the single inbox for tasks; cross-app view; respect existing app's data model |

---

*Next: [PHASE-6-AGENTIC-AND-MARKETPLACE.md](PHASE-6-AGENTIC-AND-MARKETPLACE.md) — Month 6*
