# DeviceOS - Port 4868

## Overview
Laptops, access control, device lifecycle.

## Purpose
Manages employee devices and physical access.

## Key Features
- Device lifecycle
- Access control
- Offboarding
- Meeting rooms
- Equipment tracking

## API Endpoints

### Devices
- `GET /api/devices` - List devices
- `POST /api/devices` - Register device
- `POST /api/devices/:id/offboard` - Offboard device

### Access Cards
- `GET /api/access-cards` - List cards
- `POST /api/access-cards` - Create card
- `POST /api/access-cards/:id/revoke` - Revoke card

### Meeting Rooms
- `GET /api/meeting-rooms` - List rooms

## Device Types
- `laptop` - Work laptops
- `phone` - Mobile devices
- `tablet` - Tablets
- `access_card` - RFID badges
- `camera` - Security cameras
- `meeting_room` - Conference rooms

## Tests
Vitest tests: `__tests__/device-os.test.ts`

## Environment
- Port: 4868

## Startup
```bash
cd platform/sutar-os/core/device-os && npm run dev
```
