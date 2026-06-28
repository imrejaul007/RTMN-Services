# Device OS

Device fleet management, group organization, firmware management, and bulk operations.

**Port:** 4868

## Purpose

Device OS provides enterprise-grade device fleet management with support for grouping, configuration management, firmware updates, and bulk operations across thousands of devices.

## Features

- Device fleet registration and management
- Device grouping with color coding
- Firmware version management
- Device configuration with history tracking
- Bulk operations (config, status, group, firmware updates)
- Device heartbeat monitoring
- Tag-based organization
- Location tracking
- Device statistics by status and group

## API Endpoints

### Devices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices |
| GET | `/api/devices/:id` | Get device details |
| POST | `/api/devices` | Register new device |
| PUT | `/api/devices/:id` | Update device |
| DELETE | `/api/devices/:id` | Remove device |
| POST | `/api/devices/:id/heartbeat` | Device heartbeat |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | List all groups |
| GET | `/api/groups/:id` | Get group details |
| POST | `/api/groups` | Create group |
| PUT | `/api/groups/:id` | Update group |
| DELETE | `/api/groups/:id` | Delete group |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices/:id/config` | Get device config |
| PUT | `/api/devices/:id/config` | Update config |
| GET | `/api/devices/:id/config/history` | Config history |

### Firmware

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/firmware` | List firmware versions |
| GET | `/api/firmware/:version` | Get firmware details |
| POST | `/api/firmware` | Add new firmware |
| POST | `/api/devices/:id/firmware` | Update device firmware |
| GET | `/api/devices/firmware-update` | Devices needing update |

### Bulk Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/devices/bulk` | Execute bulk action |

## Request/Response Examples

### Register Device

```bash
curl -X POST http://localhost:4868/api/devices \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "name": "Production Sensor Alpha",
    "type": "sensor",
    "group": "production",
    "tags": ["critical", "temperature"],
    "location": "Factory Floor 1"
  }'
```

### Bulk Update Config

```bash
curl -X POST http://localhost:4868/api/devices/bulk \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "deviceIds": ["device-1", "device-2", "device-3"],
    "action": "update_config",
    "params": {
      "config": {
        "reportingInterval": 60,
        "powerMode": "low"
      }
    }
  }'
```

### Firmware Update

```bash
curl -X POST http://localhost:4868/api/firmware \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "version": "2.1.0",
    "type": "release",
    "size": 8500000,
    "releaseNotes": "Security patches and performance improvements"
  }'
```

## Device Statuses

| Status | Description |
|--------|-------------|
| `active` | Device is operational |
| `inactive` | Device is temporarily disabled |
| `error` | Device has errors |

## Default Groups

| ID | Name | Color |
|----|------|-------|
| `default` | Default | #888888 |
| `production` | Production | #0066FF |
| `staging` | Staging | #FF6B35 |

## Default Firmware Versions

| Version | Release Date | Size |
|---------|--------------|------|
| 1.0.0 | 2024-01-01 | 5 MB |
| 1.1.0 | 2024-02-01 | 5.5 MB |
| 2.0.0 | 2024-03-01 | 8 MB |

## Bulk Actions

| Action | Description |
|--------|-------------|
| `update_config` | Update device configuration |
| `update_status` | Change device status |
| `update_group` | Move devices to another group |
| `update_firmware` | Update device firmware version |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4868 | Service port |
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
