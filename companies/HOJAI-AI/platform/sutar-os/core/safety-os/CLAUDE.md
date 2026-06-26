# SafetyOS - Port 4862

## Overview
Kill switches, rate limits, behavior monitoring, containment.

## Purpose
Emergency controls for AI agents - stop everything if needed.

## Key Features
- Global kill switches
- Per-agent kill switches
- Rate limiting
- Containment (isolate misbehaving agents)
- Emergency stop

## API Endpoints

### Kill Switches
- `GET /api/killswitches` - List switches
- `POST /api/killswitches` - Create switch
- `POST /api/killswitches/:id/trigger` - Trigger switch

### Emergency
- `POST /api/emergency/stop` - Stop ALL agents

### Containment
- `POST /api/contain/:agentId` - Isolate agent
- `GET /api/contain/:agentId` - Check containment

## Default Kill Switches
- Bulk email blaster
- Auto-pay without approval
- Customer data export
- Auto hire/fire
- Sanctioned entities

## Tests
Vitest tests: `__tests__/safety-os.test.ts`

## Environment
- Port: 4862

## Startup
```bash
cd platform/sutar-os/core/safety-os && npm run dev
```
