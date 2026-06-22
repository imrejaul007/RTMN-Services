# Federated Learning Coordinator (4871)

Lightweight federated learning orchestration: client registry, rounds, gradient aggregation (FedAvg), model versioning.

## Important Caveat

**This is an orchestration layer only.** Real FL requires secure aggregation, differential privacy, and multi-org GPU coordination — those remain BLOCKED on infrastructure outside this repo. This service provides:

- Client registration + heartbeat
- Round coordination
- Gradient hashing + collection
- FedAvg aggregation
- Global model versioning

## Endpoints

- `GET /health` — health check
- `GET /api/jobs` / `POST /api/jobs` / `GET /api/jobs/:id` — list/create/get jobs
- `GET /api/clients` / `POST /api/clients` / `GET /api/clients/:id` — list/create/get clients
- `POST /api/clients/:id/heartbeat` — client liveness
- `POST /api/jobs/:id/rounds` — start a new round
- `GET /api/rounds` — list rounds (filter `?job_id=`)
- `POST /api/updates` — submit gradient update from a client
- `GET /api/updates` — list updates (filter by job/round/client)
- `POST /api/rounds/:id/aggregate` — aggregate updates with FedAvg

## FedAvg Formula

`global = Σ (samples_i / Σ samples) * gradient_i`

Implemented in `fedAvg()` — weighted average by sample count.

## Run

```bash
npm install
PORT=4871 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```