# Physical World OS

IoT device management, telemetry collection, and device command execution service.

**Port:** 4867

## Purpose

Physical World OS bridges the digital and physical worlds by managing IoT devices, collecting telemetry data, and executing remote commands. It provides a unified interface for device lifecycle management.

## Features

- Device registration and management
- Real-time telemetry collection
- Remote device commands
- Webhook support for event notifications
- Device status tracking (online/offline/error/maintenance)
- Location tracking with GPS coordinates
- Battery level monitoring
- Device statistics and aggregation

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/ready` | Readiness probe |
| GET | `/api/devices` | List all devices |
| GET | `/api/devices/:id` | Get device details |
| POST | `/api/devices` | Register new device |
| PUT | `/api/devices/:id` | Update device |
| DELETE | `/api/devices/:id` | Remove device |
| POST | `/api/devices/:id/command` | Send command to device |
| GET | `/api/devices/:id/commands` | Get device command history |
| GET | `/api/devices/:id/status` | Get device status |
| POST | `/api/devices/:id/telemetry` | Submit telemetry data |
| GET | `/api/devices/:id/telemetry` | Get telemetry history |
| POST | `/api/webhooks` | Register webhook |
| POST | `/api/devices/:id/webhook` | Trigger device webhook |
| GET | `/api/stats` | Get statistics |

## Device Types

Devices can be of any type string. Common examples:
- `sensor` - Environmental sensors
- `camera` - Surveillance cameras
- `actuator` - Control devices
- `gateway` - IoT gateways
- `tracker` - GPS trackers

## Request/Response Examples

### Register Device

```bash
curl -X POST http://localhost:4867/api/devices \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "name": "Temperature Sensor 1",
    "type": "sensor",
    "location": "Warehouse A",
    "metadata": {
      "model": "TempPro-3000",
      "manufacturer": "SensorCorp"
    }
  }'
```

### Send Command

```bash
curl -X POST http://localhost:4867/api/devices/{deviceId}/command \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "command": "restart",
    "params": {
      "delay": 5
    }
  }'
```

### Submit Telemetry

```bash
curl -X POST http://localhost:4867/api/devices/{deviceId}/telemetry \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "metrics": {
      "temperature": 23.5,
      "humidity": 65,
      "battery": 87
    },
    "location": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  }'
```

## Telemetry Metrics

The telemetry system accepts any numeric metrics. Common metrics:
- Temperature (Celsius)
- Humidity (percentage)
- Battery (percentage)
- Pressure (hPa)
- Light (lux)
- Motion (boolean)

## Command Types

| Command | Description | Params |
|---------|-------------|--------|
| `restart` | Restart the device | `delay` (seconds) |
| `update` | Update firmware | `version` |
| `calibrate` | Calibrate sensors | `sensor_type` |
| `sleep` | Put device to sleep | `duration` (seconds) |
| `wake` | Wake device from sleep | - |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4867 | Service port |
| `JWT_SECRET` | - | JWT secret for authentication |

## Dependencies

- `@rtmn/shared` - Shared utilities
- `express` - HTTP framework
- `helmet` - Security headers
- `cors` - CORS support
- `zod` - Schema validation
- `uuid` - ID generation

## Commands

```bash
npm install        # Install dependencies
npm start          # Start the service
npm test           # Run tests
```

## Telemetry Retention

- Last 1000 telemetry entries per device
- Automatic cleanup of oldest entries when limit exceeded
- Time-range filtering supported in queries
