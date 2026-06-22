# Genie Listening Modes Service

**Version:** 1.0.0  
**Port:** 4768  
**Status:** ✅ Production Ready

---

## Overview

Manages different listening modes for Genie AI across all devices.

## Listening Modes

| Mode | Description | Battery Impact | Privacy |
|------|-------------|----------------|---------|
| **MANUAL** | Tap-to-talk | None | High |
| **CONTINUOUS** | Always listening for wake word | High | Medium |
| **PASSIVE** | Ambient context collection | Low | Low |
| **SMART** | Adaptive based on device/situation | Medium | Adaptive |

## Device Recommendations

| Device | Recommended Mode | Alternative |
|--------|-----------------|--------------|
| Smartphone | Smart | Continuous, Manual |
| Smartwatch | Passive | Manual, Smart |
| Earbuds | Continuous | Passive, Smart |
| Car | Continuous | Smart |
| Laptop | Smart | Manual, Continuous |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/modes` | Get all modes |
| POST | `/api/modes/switch` | Switch mode |
| GET | `/api/devices` | Supported devices |
| GET | `/api/recommend` | Get mode recommendation |
| GET | `/api/history` | Mode switch history |
| WS | `/ws` | WebSocket for real-time |

## Quick Start

```bash
cd companies/HOJAI-AI/services/genie-listening-modes
npm install
npm start  # Port 4768
```
