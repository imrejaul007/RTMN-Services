# Multi-Agent Runtime (4190)

Formalizes 8 multi-agent orchestration patterns. Solves Division 04 OPEN: "Multi-Agent Runtime formalization".

## Pattern Types

- `sequential` — agents run one after another
- `parallel` — agents run simultaneously, results aggregated
- `pipeline` — output of each feeds the next (Retrieve → Augment → Generate)
- `fan-out` — dispatcher sends work to multiple specialists
- `fan-in` — many agents aggregate into one
- `conditional` — branch based on condition
- `debate` — agents argue different positions
- `voting` — agents vote, majority wins

## Endpoints

- `GET /health`
- `GET /api/patterns` / `POST /api/patterns` / `GET /api/patterns/:id`
- `GET /api/collaborations` / `POST /api/collaborations` / `GET /api/collaborations/:id`
- `POST /api/collaborations/:id/run` — execute pattern, produce instances + summary message
- `GET /api/collaborations/:id/messages` / `POST /api/collaborations/:id/messages`
- `GET /api/collaborations/:id/instances` — agent instance records with outputs

## Run

```bash
npm install
PORT=4190 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```