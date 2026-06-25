# genie-ai-team — Personal AI Team (C5)

> **"Your personal roster of AI specialists."** Hire a Coach, Doctor, Lawyer,
> Therapist, Tutor, Chef, or any specialist you want. Each has a persona,
> area of expertise, and stays in character across conversations.
> Like having a whole team of advisors in your pocket.

| Aspect | Value |
|---|---|
| **Service name** | `genie-ai-team` |
| **Port** | `4735` |
| **Category** | C5 — Personal AI Team (Phase C moat) |
| **Status** | ✅ Production-ready |
| **Auth** | Bearer JWT + `x-internal-token` |
| **Persistence** | Two JSON-file stores: `ai-team`, `ai-team-conversations` |
| **AI** | `@rtmn/shared/lib/llm` with persona-aware system prompt + template fallback |
| **Owner** | HOJAI-AI / genie product line |

## Quick start

```bash
npm install
JWT_SECRET=test PORT=4735 INTERNAL_SERVICE_TOKEN=demo node src/index.js
bash tests/smoke.sh
node tests/ai-team-readiness.test.mjs
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/team/list/:userId` | List all hired specialists |
| GET | `/team/get/:memberId` | Get one specialist (with persona + system prompt) |
| POST | `/team/hire/:userId` | Hire a new specialist |
| DELETE | `/team/fire/:userId/:memberId` | Remove a specialist |
| POST | `/team/chat/:userId/:memberId` | Send a message, get a persona-aware reply |
| GET | `/team/history/:userId/:memberId` | Get the conversation log |
| GET | `/team/recommend/:userId?message=...` | Recommend a specialist for a query |

## Valid roles

`coach | doctor | lawyer | therapist | tutor | chef | trainer | advisor | creative | mentor`

## Seed data (Phase A)

5 starter specialists with rich personas:
1. **Maya the Coach** 🏋️ — executive coaching, habits, leadership
2. **Dr. Aris** 🩺 — general medicine, sleep, longevity
3. **Counsel** ⚖️ — contracts, IP, employment
4. **Sage** 🌿 — CBT, anxiety, life transitions
5. **Avi** 📚 — math, CS, systems thinking

## Sample chat

```bash
curl -X POST http://localhost:4735/team/chat/user-001/mem-coach-001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"message":"I am thinking about quitting my job to start something new."}'
```

Returns:
```json
{
  "success": true,
  "data": {
    "userMessage": { "role": "user", "content": "..." },
    "reply":      { "role": "assistant", "content": "Maya: Good question...", "aiUsed": true },
    "conversationLength": 2
  }
}
```

## Architecture

```
genie-ai-team (4735)
├── src/index.js                       # Express + 2 PersistentMaps + 5 seeded specialists
└── src/routes/team.js                 # list, get, hire, fire, chat, history, recommend
        │
        ├─→ @rtmn/shared/auth          # Bearer JWT (CorpID-backed)
        ├─→ @rtmn/shared/lib/llm       # LLM gateway :4746 with stub fallback
        ├─→ @rtmn/shared/lib/genie-readiness  # installReadinessRoutes + autoSeed
        └─→ PersistentMap              # JSON-file-backed stores
              ├── ai-team/             # per-user specialist roster
              └── ai-team-conversations/  # per-pair conversation logs
```

## Why C5 matters

One general-purpose assistant can't be everything. People have different
questions for different experts:

- "Should I take this job offer?" → **Coach**
- "I've been sleeping poorly for 3 weeks" → **Doctor**
- "Is this NDA fair?" → **Lawyer**
- "I feel stuck in my life" → **Therapist**
- "Explain gradient descent" → **Tutor**

A "team" framing makes each conversation tighter because the persona
narrows the response space. A coach doesn't give medical advice.
A therapist doesn't give legal opinions. Boundaries are the feature.

Plus: the user *chooses* who to talk to. That's agency.

## Recommendation algorithm

`GET /team/recommend/:userId?message=...`

Naive keyword scoring:
- For each keyword in the user's message (length > 3), check if it appears
  in `name + role + specialty + expertise` of each specialist. +2 per match.
- Add the specialist's rating as a tiebreaker.
- Return top 3.

In production: replace with embedding similarity + persona-affinity model.

## Tests

| Suite | File | Assertions | Status |
|---|---|---|---|
| Readiness (Node, in-process) | `tests/ai-team-readiness.test.mjs` | 31 | ✅ |
| Smoke (curl) | `tests/smoke.sh` | 7 checks | ✅ |

## Roadmap (future)

- [ ] "Hire from marketplace" — pull from BLR AI Marketplace catalog
- [ ] Multi-member collaboration (3 specialists discuss a question together)
- [ ] Voice mode — talk to each specialist with TTS
- [ ] Specialty ratings — let the user rate each reply 1-5
- [ ] Auto-suggest specialist in briefings based on mood/energy

## Related

- BLR AI Marketplace — source of "hire from catalog" flow
- `genie-briefing` — could recommend a specialist each morning
- `genie-personal-twin` — uses traits to pick the right specialist
- Web UI: `genie-os/frontend/web/src/screens/AITeamScreen.tsx`
