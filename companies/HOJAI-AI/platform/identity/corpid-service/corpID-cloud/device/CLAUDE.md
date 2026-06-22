# Device Identity

**Service:** Device Registration and Trust
**Port:** 4702 (via gateway)
**Prefix:** `/api/devices`

---

## Overview

The Device Identity service provides device registration, fingerprinting, and trust management. It enables users to manage their trusted devices and helps detect suspicious activity.

## Features

- **Device Fingerprinting:** Browser, OS, hardware detection
- **Trust Levels:** Trusted, unverified, blocked
- **Device History:** First seen, last seen, login counts
- **Location Tracking:** IP history with geolocation
- **Auto-Registration:** Devices auto-register on login
- **Trust Management:** Trust, block, unblock operations
- **Capabilities Detection:** Biometric, secure enclave
- **Session Limits:** Per-device session limits

## Device Types

| Type | Description |
|------|-------------|
| `desktop` | Desktop computer |
| `mobile` | Mobile phone |
| `tablet` | Tablet device |
| `iot` | IoT device |
| `tv` | Smart TV |
| `car` | Vehicle |
| `watch` | Smartwatch |
| `speaker` | Smart speaker |

## Trust Levels

| Level | Description |
|-------|-------------|
| `trusted` | User-verified device |
| `unverified` | Default for new devices |
| `blocked` | Blocked by user or system |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/devices` | Register device |
| GET | `/api/devices` | List my devices |
| GET | `/api/devices/:id` | Get device details |
| PUT | `/api/devices/:id` | Update device (rename) |
| POST | `/api/devices/:id/trust` | Trust device |
| POST | `/api/devices/:id/block` | Block device |
| POST | `/api/devices/:id/unblock` | Unblock device |
| DELETE | `/api/devices/:id` | Delete device |
| GET | `/api/devices/:id/history` | Trust history |
| GET | `/api/devices/:id/capabilities` | Device capabilities |

## Usage Example

### Register Device
```bash
curl -X POST http://localhost:4702/api/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My MacBook",
    "type": "desktop",
    "make": "Apple",
    "model": "MacBook Pro",
    "os": "macOS",
    "osVersion": "14.5",
    "browser": "Chrome",
    "browserVersion": "125.0"
  }'
```

### Trust Device
```bash
curl -X POST http://localhost:4702/api/devices/DEVICE_ID/trust \
  -H "Authorization: Bearer $TOKEN"
```

### Block Device
```bash
curl -X POST http://localhost:4702/api/devices/DEVICE_ID/block \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Suspicious activity"}'
```

## Device Fingerprint

Devices are identified by a SHA-256 fingerprint of:
- User Agent
- OS + Version
- Browser + Version
- Make + Model
- Device Type

## Auto-Registration

Devices are automatically registered on every authenticated request. No explicit registration required.

## File Structure

```
device/
├── src/
│   ├── models/
│   │   └── device.model.js
│   └── routes/
│       └── device.routes.js
└── CLAUDE.md
```