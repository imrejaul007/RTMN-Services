# Genie Listening Modes Service

**Version:** 1.0.0  
**Port:** 4768  
**Status:** ✅ Production Ready

---
---

## 🔐 Auth (Phase 7)

This service now requires a **Bearer JWT** (CorpID-issued) on every request except `/health`, `/`, and `/ready`. Auth is enforced via `app.use(requireAuth)` from `@rtmn/shared/auth`.

**Get a token:**

```bash
# Dev shortcut (base64 JSON token — matches what requireAuth verifies):
TOKEN=$(curl -s -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"dev"}' | jq -r .token)
```

**Call this service:**

```bash
curl http://localhost:PORT/health                      # public, no token
curl http://localhost:PORT/your-endpoint \
  -H "Authorization: Bearer $TOKEN"                   # protected
```

**Disable in dev/test:** Set `SERVICE_REQUIRE_AUTH=false` env var.

See [shared/MIGRATION-GUIDE.md](../../shared/MIGRATION-GUIDE.md) for the full `@rtmn/shared/auth` pattern and the canonical thin-shim approach.

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
cd products/genie/genie-listening-modes
npm install
npm start  # Port 4768
```
