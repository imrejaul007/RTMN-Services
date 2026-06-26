# SimulationOS - Port 4874

## Overview
What-if scenarios, digital twins, predictive modeling.

## Purpose
Simulates business scenarios before execution to predict outcomes.

## Key Features
- What-if scenarios
- Monte Carlo simulations
- A/B testing
- Impact analysis
- Risk modeling
- Resource optimization

## API Endpoints

### Scenarios
- `GET /api/scenarios` - List scenarios
- `POST /api/scenarios` - Create scenario
- `GET /api/scenarios/:id` - Get details
- `POST /api/scenarios/:id/run` - Run simulation
- `POST /api/scenarios/:id/compare` - Compare scenarios

### Digital Twins
- `GET /api/twins` - List twins
- `POST /api/twins` - Create twin
- `PATCH /api/twins/:id/state` - Update state
- `POST /api/twins/:id/simulate` - Simulate behavior

### Experiments
- `GET /api/experiments` - List experiments
- `POST /api/experiments` - Create experiment
- `PATCH /api/experiments/:id/status` - Update status
- `POST /api/experiments/:id/results` - Submit results

### Reports
- `GET /api/reports/scenario-history` - History
- `GET /api/reports/summary` - Overview

## Scenario Types
- `whatif` - What-if analysis
- `montcarlo` - Monte Carlo simulation
- `abtest` - A/B testing
- `risk` - Risk modeling
- `optimization` - Resource optimization

## Tests
Vitest tests: `__tests__/simulation-os.test.ts`

## Environment
- Port: 4874

## Startup
```bash
cd platform/sutar-os/core/simulation-os && npm run dev
```
