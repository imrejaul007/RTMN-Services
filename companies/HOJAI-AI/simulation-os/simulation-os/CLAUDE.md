# Simulation OS

## Overview
Digital twin simulation and scenario modeling engine for RTMN.

## Port: 3018

## Features
- **Simulation Types**: Monte Carlo, Agent-based, System Dynamics, Discrete Event, What-If
- **Digital Twins**: Create, simulate, and analyze digital twins
- **Scenarios**: Built-in scenarios (market expansion, cost optimization, risk assessment, demand forecast)
- **Analytics**: Comprehensive simulation analytics

## Routes
- `simulation.js` - Simulation engine and session management
- `twins.js` - Digital twin CRUD and simulation
- `scenarios.js` - Scenario management
- `analytics.js` - Analytics and trends

## API Endpoints
- `GET /api/simulation` - List simulations
- `POST /api/simulation/run` - Run simulation
- `GET /api/twins` - List twins
- `POST /api/twins/create` - Create twin
- `GET /api/scenarios` - List scenarios
- `POST /api/scenarios/run` - Run scenario
- `GET /api/analytics` - Analytics overview

## Usage
```javascript
// Run a Monte Carlo simulation
POST /api/simulation/run
{
  "type": "monte_carlo",
  "config": {
    "outcomes": [100, 200, 300],
    "probabilities": [0.2, 0.5, 0.3]
  },
  "iterations": 1000
}
```

## Dependencies
- express, cors, helmet, redis, uuid, winston
