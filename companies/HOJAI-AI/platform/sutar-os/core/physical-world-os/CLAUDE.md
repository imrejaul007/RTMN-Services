# PhysicalWorldOS - Port 4867

## Overview
IoT, sensors, robots, factories, warehouses.

## Purpose
Connects AI agents to physical world: IoT devices, robots, sensors.

## Key Features
- IoT device management
- Sensor readings
- Robot control
- Factory integration
- Warehouse automation

## API Endpoints

### Devices
- `GET /api/devices` - List devices
- `POST /api/devices` - Register device
- `PATCH /api/devices/:id/status` - Update status

### Sensors
- `POST /api/sensors/:deviceId/readings` - Record reading
- `GET /api/sensors/:deviceId/readings` - Get readings

### Robots
- `POST /api/robots` - Register robot
- `PATCH /api/robots/:id` - Update robot

### Alerts
- `POST /api/alerts` - Create alert

## Device Types
- `sensor` - Environmental sensors
- `robot` - Robotic systems
- `camera` - Vision systems
- `printer` - 3D printers
- `vehicle` - AGVs
- `iot` - Generic IoT

## Tests
Vitest tests: `__tests__/physical-world-os.test.ts`

## Environment
- Port: 4867

## Startup
```bash
cd platform/sutar-os/core/physical-world-os && npm run dev
```
