# Organization OS

**Port:** 5280  
**Status:** ✅ Built (June 26, 2026)

Enterprise Organization Management: Org charts, hierarchies, restructuring, governance, compliance, and strategic OKR alignment.

## AI Agents (3)

| Agent | Purpose |
|-------|---------|
| Org Structure Analyzer | Structure analysis, silo detection, reorg simulation |
| Governance Agent | Compliance assessment, audit trails, risk management |
| Strategic Alignment Agent | OKR mapping, progress tracking, alignment scoring |

## Key Features

- **Org Structure**: Hierarchies, departments, teams, roles
- **Governance**: Compliance assessment, audit trails, risk assessment
- **Silo Detection**: Cross-department analysis, collaboration scoring
- **Reorg Simulation**: Impact analysis, cost modeling, risk assessment
- **OKR Tracking**: Objective mapping, progress tracking, alignment scoring

## Endpoints

```
POST /api/organizations              # Create organization
GET  /api/organizations              # List organizations
GET  /api/organizations/:id/structure # Org structure analysis
GET  /api/organizations/:id/silos    # Silo detection
POST /api/departments                # Create department
POST /api/teams                      # Create team
GET  /api/governance/:id/compliance  # Compliance assessment
GET  /api/okrs/:orgId               # OKR mapping
```

## Start

```bash
cd industry-os/services/organization-os
npm start
# http://localhost:5280/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
