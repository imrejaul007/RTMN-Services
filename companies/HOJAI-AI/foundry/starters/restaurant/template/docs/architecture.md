# {{PROJECT_TITLE}} — Architecture

> Restaurant OS: menu, tables, KOT, billing, delivery.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend  (apps/frontend — :3000)  Static HTML + vanilla JS │
└────────────────────────────┬────────────────────────────────┘
                             │ /api/*
┌────────────────────────────▼────────────────────────────────┐
│  Backend   (apps/backend — :4001)   Express + ESM            │
│  ├── routes/      REST endpoints                             │
│  ├── services/    domain logic (catalog, order, …)           │
│  ├── agents/      SUTAR agent registry                       │
│  └── middleware/  error handling                             │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  Foundation  (HOJAI SDKs)                                    │
│  ├── @hojai/foundation  CorpID + MemoryOS                    │
│  ├── @hojai/sutar       Agent runtime                        │
│  ├── @hojai/nexha       Federation                           │
│  ├── @hojai/commerce    Payments + cart                      │
│  ├── @hojai/payment     RABTUL payment rails                 │
│  ├── @hojai/logistics   KHAIRMOVE fleet                      │
│  ├── @hojai/reputation  Trust + scoring                      │
│  └── @hojai/discovery   Nexha directory                      │
└─────────────────────────────────────────────────────────────┘
```

## Data flow

1. Frontend renders from in-memory store via REST.
2. SUTAR agents are invoked at `POST /api/agents/<name>` with a JSON body.
3. The backend reads/writes the in-memory store synchronously (v0).
4. Nexha federation profile is exposed at `GET /api/nexha/profile`.

## What to replace first

1. **Store** — swap in-memory Maps for Mongo/Postgres at `services/store.js`.
2. **Agents** — replace stub returns in `agents/index.js` with `@hojai/sutar` BaseAgent calls.
3. **Auth** — wire `@hojai/foundation` CorpID into the `requireAuth` middleware.
4. **Webhooks** — connect `/api/webhooks/*` to payment + logistics providers.
