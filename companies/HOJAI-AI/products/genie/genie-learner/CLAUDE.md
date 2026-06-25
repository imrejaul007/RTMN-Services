# genie-learner — Learner Agent (D4)

> **Port:** 4742  
> **Tagline:** *Spaced repetition + curated paths. Remember what you learn.*  
> **Pairs with:** `genie-teacher` (D1) — Teacher is the LMS, Learner is the retention engine.

## What it does

The Learner Agent is a **spaced-repetition flashcard system** with **curated learning paths**. Where Teacher teaches lessons, Learner makes sure the knowledge sticks via daily review with the SM-2-lite algorithm.

## Endpoints

```
GET    /health
GET    /                                       — banner + endpoint list
GET    /paths                                  — list curated paths
GET    /paths/:pathId                          — path detail (weeks + modules)
GET    /decks/by-user/:userId                  — list decks for user
POST   /decks/by-user/:userId                  — create new deck
GET    /decks/:deckId                          — deck + its cards
DELETE /decks/:deckId/:userId                  — delete deck + cascade cards
POST   /decks/:deckId/cards                    — add card (body: {userId, front, back, tags})
DELETE /cards/:cardId                          — delete card (body: {userId})
GET    /decks/:deckId/review?userId=...        — cards due today
POST   /review/:cardId                         — review card (body: {userId, rating})
GET    /users/:userId/streak                   — current streak + stats
```

## SM-2-lite algorithm

```js
function nextSchedule(card, rating) {
  let { interval, ease, reps } = card;
  if (rating === 'again') { interval = 0; ease = max(1.3, ease - 0.2); reps = 0; }
  else if (rating === 'hard') { interval = max(1, round(interval * 1.2 || 1)); ease = max(1.3, ease - 0.15); reps++; }
  else if (rating === 'good') { interval = reps === 0 ? 1 : max(1, round(interval * ease || 1)); reps++; }
  else if (rating === 'easy') { interval = max(1, round((interval || 1) * ease * 1.3)); ease = min(3.5, ease + 0.15); reps++; }
  return { interval, ease: round(ease * 100) / 100, reps, dueAt };
}
```

## Seeded Data

### Paths (3)
- **pth-spanish** — Spanish for Travel (4 weeks, 15 min/day, 20 lessons)
- **pth-pm** — Product Management Foundations (6 weeks, 20 min/day, 30 lessons)
- **pth-mind** — Mindfulness Foundations (4 weeks, 15 min/day, 20 lessons)

### Decks (2)
- **dk-spanish** — Spanish Vocab (4 cards: Hola, Adiós, Gracias, Por favor)
- **dk-pm** — PM Acronyms (2 cards: RICE, AARRR)

## Stores (4 PersistentMaps)

| Store | Purpose |
|-------|---------|
| `decks` | Deck metadata (title, description, owner, cardCount) |
| `cards` | Card front/back/tags + SRS state (interval, ease, reps, dueAt) |
| `reviews` | Review history (rating, timestamp) — powers streak |
| `paths` | Curated multi-week learning paths |

## Run

```bash
PORT=4742 JWT_SECRET=... node src/index.js
```

## Tests

```bash
JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... PORT=4742 node --test tests/learner-readiness.test.mjs
# 31 tests, 0 failures

JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... PORT=4742 node src/index.js &
JWT_SECRET=... INTERNAL_SERVICE_TOKEN=... PORT=4742 bash tests/smoke.sh
# 27 smoke checks pass
```

## Related services

- **genie-teacher** (4739) — LMS with courses + lessons + quizzes
- **genie-research** (4740) — research query + source library

## Status

✅ **D4 Complete** (Phase D — Agent gaps). Built 2026-06-25.
