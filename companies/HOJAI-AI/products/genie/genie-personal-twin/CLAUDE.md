# genie-personal-twin — Personal Digital Twin (C2)

> **"The avatar that knows you."** Aggregates the user's data across the Genie
> ecosystem into a single digital twin that other specialists consult.
> One source of truth for: identity, mood, energy, focus, traits, life moments.

| Aspect | Value |
|---|---|
| **Service name** | `genie-personal-twin` |
| **Port** | `4733` |
| **Category** | C2 — Personal Digital Twin (Phase C moat) |
| **Status** | ✅ Production-ready |
| **Auth** | Bearer JWT + `x-internal-token` |
| **Persistence** | Three JSON-file stores: `personal-twins`, `traits`, `moments` |
| **AI** | Not used directly — synthesizes from internal state + future upstream aggregation |
| **Owner** | HOJAI-AI / genie product line |

## Quick start

```bash
npm install
JWT_SECRET=test PORT=4733 INTERNAL_SERVICE_TOKEN=demo node src/index.js
# in another shell
bash tests/smoke.sh
node tests/personal-twin-readiness.test.mjs
```

## Endpoints

### Twin (the avatar)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/twin/get/:userId` | Full twin (base + traits + moments) |
| GET | `/twin/summary/:userId` | Quick summary card (headline, mood, top 3 traits) |
| GET | `/twin/mood/:userId` | 30-day mood trajectory (synthesized) |
| POST | `/twin/update/:userId` | Update base attributes (name, age, mood, focus, …) |

### Traits (single attributes)

| Method | Path | Description |
|---|---|---|
| POST | `/traits/add/:userId` | Add a trait `{category, name, strength, examples}` |
| GET | `/traits/list/:userId` | List traits (`?category=value\|skill\|interest\|goal\|fear`), grouped |
| DELETE | `/traits/remove/:userId/:traitId` | Remove a trait (403 if not yours) |

### Moments (turning points)

| Method | Path | Description |
|---|---|---|
| POST | `/moments/add/:userId` | Add a moment `{type, title, date, description, impact}` |
| GET | `/moments/list/:userId` | List moments in reverse-chronological order |
| GET | `/moments/get/:momentId` | Get a specific moment |

## Data model

### Twin (one per user)
```js
{
  id: 'twin-user-001',
  userId: 'user-001',
  name: 'You',
  pronouns: 'they/them',
  age: 32,
  location: 'Bengaluru, India',
  timezone: 'Asia/Kolkata',
  occupation: 'Founder & Engineer',
  relationshipStatus: 'Single',
  householdSize: 1,
  headline: 'Building something that matters.',
  bio: '...',
  mood:    { current: 'focused', trend: 'up', score: 7.2 },
  energy:  { current: 'high', score: 8.1 },
  focus:   ['company', 'health', 'relationships'],
  updatedAt: '...'
}
```

### Trait
```js
{
  id: 'tr-1', userId: 'user-001',
  category: 'value',   // value | skill | interest | goal | fear
  name: 'Curiosity',
  strength: 9,          // 1-10
  examples: ['Loves reading', 'Asks why'],
  addedAt: '...'
}
```

### Moment
```js
{
  id: 'mmt-1', userId: 'user-001',
  type: 'milestone',   // milestone | relationship | learning | loss | win | travel | health | career
  title: 'First startup exit',
  date: '2019-06-15',  // YYYY-MM-DD
  description: '...',
  impact: 'high',      // low | medium | high | transformative
  createdAt: '...'
}
```

## Why C2 matters

The Personal Digital Twin is the **connective tissue** of the Genie ecosystem:

- **Every other specialist** can ask `GET /twin/get/:userId` to know "who is this user?"
- **Briefings** read headline + mood to greet the user correctly
- **Spiritual** uses `focus` + `traits` to suggest the right reflection
- **Future Self** reads `traits` + `moments` to give age-appropriate advice
- **Simulation** uses `location` + `occupation` as defaults
- **Lock-screen widgets** display `mood` + top trait at a glance

Without a twin, every service has to ask the user the same questions. With one,
the user fills it out once and everyone benefits.

## Architecture

```
genie-personal-twin (4733)
├── src/index.js                       # Express + 3 PersistentMaps + seed
├── src/routes/twin.js                 # get, update, summary, mood
├── src/routes/traits.js               # add, list, remove
└── src/routes/moments.js              # add, list, get
        │
        ├─→ @rtmn/shared/auth          # Bearer JWT (CorpID-backed)
        ├─→ @rtmn/shared/lib/genie-readiness  # installReadinessRoutes + autoSeed
        └─→ PersistentMap              # JSON-file-backed stores
              ├── personal-twins/      # one entry per user
              ├── traits/              # categorized attributes
              └── moments/             # dated life events
```

## Seed data (Phase A)

- **1 user twin**: `twin-user-001` — name "You", age 32, Bengaluru founder
- **8 traits** across 5 categories: 2 values, 2 skills, 2 interests, 1 goal, 1 fear
- **4 moments**: 2 milestones, 1 relationship, 1 learning

## Tests

| Suite | File | Assertions | Status |
|---|---|---|---|
| Readiness (Node, in-process) | `tests/personal-twin-readiness.test.mjs` | 42 | ✅ |
| Smoke (curl) | `tests/smoke.sh` | 8 checks | ✅ |

```bash
JWT_SECRET=test PORT=4733 INTERNAL_SERVICE_TOKEN=demo node src/index.js &
node tests/personal-twin-readiness.test.mjs
bash tests/smoke.sh
```

## Roadmap (future)

- [ ] Aggregate live data from genie-wellness, genie-calendar, genie-finance
- [ ] "Twin coherence" check — flag contradictions in profile data
- [ ] Public twin API — let friends see (parts of) your twin
- [ ] Multi-user households (households share a twin)
- [ ] "Twin snapshot" — export a JSON of your full twin for portability

## Related

- `genie-spiritual-os` (4729), `genie-life-replay` (4730), `genie-future-self` (4731),
  `genie-simulation` (4732) — all read from this twin to personalize
- Web UI: `genie-os/frontend/web/src/screens/PersonalTwinScreen.tsx`
