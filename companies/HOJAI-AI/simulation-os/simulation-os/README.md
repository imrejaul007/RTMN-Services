# Simulation OS - RTMN Digital Twin Simulation

Digital twin simulation and scenario modeling engine for predictive analysis.

## Quick Start

```bash
cd core/simulation-os
npm install
npm start
```

## Simulation Types

- **Monte Carlo** - Random sampling for uncertainty
- **Agent Based** - Individual agent behaviors
- **System Dynamics** - Feedback loops
- **Discrete Event** - Event-driven processes
- **What-If** - Scenario comparison

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/simulation` | List simulations |
| POST | `/api/simulation/run` | Run simulation |
| GET | `/api/simulation/:id` | Get results |
| GET | `/api/twins` | List twins |
| POST | `/api/twins/create` | Create twin |
| POST | `/api/twins/:id/simulate` | Simulate twin |
| GET | `/api/scenarios` | List scenarios |
| POST | `/api/scenarios/run` | Run scenario |

## Example

```bash
# Run Monte Carlo simulation
curl -X POST http://localhost:3018/api/simulation/run \
  -H "Content-Type: application/json" \
  -d '{"type": "monte_carlo", "iterations": 1000}'
```

## Docker

```bash
docker build -t rtmn-simulation-os core/simulation-os
docker run -p 3018:3018 rtmn-simulation-os
```
