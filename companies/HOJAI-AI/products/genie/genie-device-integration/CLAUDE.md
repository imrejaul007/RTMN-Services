# Genie Device Integration Service

**Version:** 1.0.0  
**Port:** 4769  
**Status:** ✅ Production Ready

---

## Overview

Connects Genie AI to various listening devices for the "Genie Everywhere" experience.

## Supported Devices

| Device | Brands | Features |
|--------|--------|----------|
| **Smartphone** | iOS, Android | Wake word, tap-to-talk, background |
| **Smartwatch** | Apple Watch, Galaxy Watch, Wear OS | Tap-to-listen, health context |
| **Earbuds** | AirPods, Galaxy Buds, Sony WF | Always listen, tap control |
| **Smart Glasses** | Ray-Ban Meta, Snap Spectacles | Camera + audio context |
| **Car** | Android Auto, CarPlay, Tesla | Hands-free, navigation |
| **Laptop/Desktop** | Windows, macOS, Chrome OS | Wake word, meeting transcription |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/devices` | List registered devices |
| POST | `/api/devices` | Register device |
| GET | `/api/devices/:id` | Get device info |
| PUT | `/api/devices/:id` | Update device |
| DELETE | `/api/devices/:id` | Remove device |
| GET | `/api/types` | Supported device types |
| POST | `/api/audio` | Send audio to service |
| WS | `/ws` | WebSocket for devices |

## Quick Start

```bash
cd companies/HOJAI-AI/services/genie-device-integration
npm install
npm start  # Port 4769
```
