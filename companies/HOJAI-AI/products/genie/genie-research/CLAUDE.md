# Genie Research Agent (D2)

> **"Your personal research analyst. Queries → sources → synthesis."**
>
> Personal research assistant. Lets users run research queries, get LLM-synthesized answers with cited sources, and save findings.

**Service:** `genie-research`
**Port:** 4740
**Package name:** `@rtmn/genie-research`
**Status:** ✅ Built (D2, 2026-06-25). 19 readiness tests pass + 18 smoke checks.

---

## What It Does

Fills the **missing Research Agent** in the 13-agent Genie vision. The deep audit (`GENIE-DEEP-AUDIT.md`) flagged Research as the only completely missing named agent. This service is the implementation.

### Modules

1. **Sources** — catalog of academic / encyclopedia / medical sources (OpenAlex, arXiv, Wikipedia, PubMed, Google Scholar)
2. **Research queries** — POST a question → get LLM-backed synthesis with key points + caveats
3. **Persistence** — every query is stored, listable, gettable, deletable
4. **Source ranking** — simple keyword match ranks sources by relevance, picks top 3 per query
5. **Topics** — auto-aggregated from past queries, with counts

### Endpoints

```
GET    /health
GET    /                                             — service banner

GET    /sources                                      — list source catalog

POST   /research/query/:userId                       — run a query (LLM + sources)
GET    /research/list/:userId                        — list past (?topic filter)
GET    /research/get/:researchId                     — full record + hydrated sources
DELETE /research/delete/:researchId/:userId          — delete
POST   /research/:researchId/save/:userId            — save as note (mark saved)

GET    /topics/:userId                               — topic counts
```

---

## Source Catalog (Seeded)

| ID | Source | Type | Description |
|---|---|---|---|
| src-1 | OpenAlex | academic | 200M+ scholarly works, free API |
| src-2 | arXiv | academic | Pre-prints in physics, CS, math, biology |
| src-3 | Wikipedia | encyclopedia | General knowledge baseline |
| src-4 | PubMed | medical | Biomedical literature |
| src-5 | Google Scholar | academic | Broad academic search |

Plus 1 seeded research item on intermittent fasting.

---

## How a Query Works

1. User POSTs `{ question: "...", topic: "..." }`
2. Service tokenizes the question, scores each source by keyword overlap
3. Picks top 3 sources by relevance
4. Calls LLM with structured prompt (summary + key points + caveats)
5. Falls back to template if LLM unavailable
6. Returns `{ summary, keyPoints, sources, source }`
7. Persists with `createdAt`, returns id

---

## Tests

### `tests/research-readiness.test.mjs` — 19/19 pass
Covers:
- Health + readiness + auth
- Sources: list 5 seeded
- Research: create / list / get / save / delete
- Validation: short question, missing question
- Authz: delete rejects wrong user, save rejects wrong user
- Topics: aggregation + counts + sort

### `tests/smoke.sh` — 18/18 pass

Run:
```bash
npm test
JWT_SECRET=test INTERNAL_SERVICE_TOKEN=t node src/index.js &
bash tests/smoke.sh
```

---

## How It Fits

- **D2 of the Phase D Agent-Gaps roadmap** — fills the missing **Research Agent** in the 13-agent Genie vision.
- Pairs with **Personal AI Team (C5)** — your Researcher is a hired team member backed by this service.
- Pairs with **Memory Inbox** — saved research can become memory items in your personal twin.
- Future: wire real source APIs (OpenAlex, PubMed) instead of LLM synthesis.

---

## Web UI

`/research` route in the Genie PWA → `ResearchScreen.tsx` with 3 tabs:
- **Ask** — submit a research question, get synthesis + sources
- **History** — past research, filter by topic, view details
- **Topics** — aggregated topic counts

Accessible from `MeTab` → "Research" card.

---

*Built as part of Phase D (Agent Gaps) of the 40-feature Genie vision.*