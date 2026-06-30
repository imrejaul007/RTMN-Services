# 🗺️ GENIE INTEGRATION MAP
**Date:** June 30, 2026
**Architecture:** 14 services + Genie Runtime + RTMN Hub

---

## Architecture Flow

```
External Request
       ↓
┌─────────────────────────────────────┐
│  RTMN Unified Hub (Port 4399)           │
│  services/rtmn-unified-hub/             │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  Genie OS Runtime (Port 7100)           │
│  products/genie/genie-os/runtime/         │
│                                           │
│  Routes: /api/genie/*                    │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  14 Genie Services (4740-4755)          │
│  products/genie/genie-*/               │
└─────────────────────────────────────┘
```

## URL Routes

### RTMN Hub (4399)

| Path | Service | Port |
|------|---------|------|
| `/api/genie/dashboard/:userId` | Unified dashboard | 4399 |
| `/api/genie/decisions/*` | Decision Intelligence | 4740 |
| `/api/genie/learning/*` | Learning Loop | 4742 |
| `/api/genie/anticipation/*` | Anticipation | 4745 |
| `/api/genie/ambient/*` | Ambient | 4746 |
| `/api/genie/constitution/*` | Constitution | 4743 |
| `/api/genie/financial/*` | Financial Life | 4747 |
| `/api/genie/health/*` | Health Intelligence | 4748 |
| `/api/genie/household/*` | Household | 4749 |
| `/api/genie/travel/*` | TravelOS | 4750 |
| `/api/genie/spiritual/*` | SpiritualOS | 4751 |
| `/api/genie/simulation/*` | Life Sim | 4752 |
| `/api/genie/focus/*` | FocusOS | 4753 |
| `/api/genie/dreams/*` | Dreams | 4754 |
| `/api/genie/legacy/*` | Legacy | 4755 |
| `/api/wishes/*` | Wish Fulfillment | 4001 |

---

## Quick Start

```bash
# Install + build RTMN Hub
cd services/rtmn-unified-hub
npm install && npm run build && npm start

# Start services
cd ../..
bash scripts/start-genie-services.sh

# Verify
curl http://localhost:4399/health
```

---

*Integration complete — June 30, 2026*