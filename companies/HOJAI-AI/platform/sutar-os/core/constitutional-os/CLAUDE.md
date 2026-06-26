# ConstitutionalOS - Port 4855

## Overview
Enterprise governance layer - Mission, Values, Ethics, Red Lines, Authority Boundaries.

## Purpose
ConstitutionalOS defines WHAT the AI workforce should and should NOT do. It's the ethical foundation that PolicyOS enforces.

## Key Features
- Mission statements with priorities
- Red lines (never-cross boundaries)
- Values and principles
- Authority levels per agent type
- Escalation paths
- Audit trail

## API Endpoints

### Missions
- `GET /api/missions` - List active missions
- `POST /api/missions` - Create mission

### Red Lines
- `GET /api/red-lines` - List red lines
- `POST /api/red-lines` - Create red line
- `POST /api/authorize` - Check authorization

### Values
- `GET /api/values` - List values
- `POST /api/values` - Create value

### Audit
- `GET /api/logs` - View audit logs

## Red Line Categories
- `ethics` - Moral boundaries
- `legal` - Compliance requirements
- `safety` - Safety critical
- `compliance` - Regulatory
- `culture` - Company culture

## Red Line Severities
- `hard_stop` - Cannot override
- `warning` - Log and alert
- `approval_required` - Human approval needed

## Tests
Vitest tests: `__tests__/constitutional-os.test.ts`

## Startup
```bash
cd platform/sutar-os/core/constitutional-os && npm run dev
```
