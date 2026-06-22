# CLAUDE.md - Dental Expansion Agent

## Overview

**Service:** HOJAI Dental Expansion Agent  
**Port:** 4555  
**Purpose:** Multi-agent orchestration for "Open 20 Clinics"  
**Story:** SmileCraft Dental Clinic - Dr. Meera's expansion plan

## Quick Commands

```bash
# Install and start
cd companies/hojai-ai/services/hojai-dental-expansion-agent
npm install
npm start

# Health check
curl http://localhost:4555/health

# Create expansion goal
curl -X POST http://localhost:4555/api/expansion/goal \
  -H "Content-Type: application/json" \
  -d '{"owner": "dr_meera", "targetCount": 20}'

# Execute expansion
curl -X POST http://localhost:4555/api/expansion/execute/:goalId

# Get report
curl http://localhost:4555/api/expansion/:goalId/report
```

## Architecture

```
Dental Expansion Agent (4555)
├── index.js                    # Main entry
│   ├── Goal Management         # Create/execute goals
│   ├── Agent Configuration     # 5 agent configs
│   ├── Clinic Setup Workflow   # executeClinicSetup()
│   ├── Agent Calling          # callAgent() simulation
│   └── Reports               # Progress & financial reports
└── FEATURES.md               # Service documentation
```

## Agent Configuration

| Agent | Endpoint | Role | Purpose |
|-------|----------|------|---------|
| RisnaEstate | localhost:4400 | Location | Find clinic locations |
| CorpPerks | localhost:4450 | Staffing | Hire dentists, assistants |
| Nexha | localhost:5002 | Equipment | Source dental equipment |
| AdBazaar | localhost:4007 | Marketing | Launch campaigns |
| RIDZA | localhost:4300 | Finance | Create financial models |

## Target Locations (20 Areas)

| # | Area | # | Area |
|---|------|---|------|
| 1 | Whitefield | 11 | Marathahalli |
| 2 | Koramangala | 12 | Indiranagar |
| 3 | HSR Layout | 13 | JP Nagar |
| 4 | Electronic City | 14 | BTM Layout |
| 5 | Hebbal | 15 | Malleswaram |
| 6 | Sarjapur | 16 | Yelahanka |
| 7 | Rajajinagar | 17 | RT Nagar |
| 8 | HBR Layout | 18 | Kalyan Nagar |
| 9 | Kammanahalli | 19 | Frazer Town |
| 10 | Ulsoor | 20 | Whitefield |

## Clinic Setup Per Location

| Task | Agent | Output | Cost |
|------|-------|--------|------|
| Find Location | RisnaEstate | 1500 sqft | ₹80K/month |
| Plan Staffing | CorpPerks | 9 staff | ₹2.95L/month |
| Source Equipment | Nexha | Suppliers | ₹13.5L |
| Plan Marketing | AdBazaar | Campaigns | ₹1.3L |
| Financial Model | RIDZA | Investment | ₹50L |

## Story Flow

```
Dr. Meera: "Open 20 clinics"
  │
  ├── SUTAR GoalOS: Decompose goal
  │
  ├── Dental Expansion Agent: Coordinate agents
  │
  ├── RisnaEstate: Find 20 locations
  ├── CorpPerks: Hire 180 staff
  ├── Nexha: Source equipment
  ├── AdBazaar: Launch campaigns
  └── RIDZA: Financial models
```

## Testing

```bash
# Test health
curl http://localhost:4555/health

# Create goal
curl -X POST http://localhost:4555/api/expansion/goal \
  -H "Content-Type: application/json" \
  -d '{"owner": "dr_meera", "targetCount": 20}'

# Get goal status
curl http://localhost:4555/api/expansion

# List all goals
curl http://localhost:4555/api/expansion
```

## Notes

- Simulated agent responses (replace with actual endpoints)
- In-memory storage (use Redis/DB for production)
- Parallel execution of all 20 clinics
- Financial modeling based on SmileCraft economics
