# CrisisOS - Port 4863

## Overview
Incident management, war rooms, continuity planning.

## Purpose
Handles AI agent failures, system incidents, and business continuity.

## Key Features
- Incident management
- War room coordination
- Playbook execution
- Backup management
- Business continuity

## API Endpoints

### Incidents
- `GET /api/incidents` - List incidents
- `POST /api/incidents` - Create incident
- `PATCH /api/incidents/:id` - Update incident

### War Rooms
- `GET /api/war-rooms` - List war rooms
- `POST /api/war-rooms` - Create war room

### Playbooks
- `GET /api/playbooks` - List playbooks
- `POST /api/playbooks/:id/execute` - Execute playbook

## Tests
Vitest tests: `__tests__/crisis-os.test.ts`

## Environment
- Port: 4863

## Startup
```bash
cd platform/sutar-os/core/crisis-os && npm run dev
```
