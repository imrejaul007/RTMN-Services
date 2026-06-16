# Energy OS

AI Company Platform for Energy Management with 15-Layer RTMN Ecosystem Integration.

## Quick Start

```bash
# Install dependencies
npm install

# Start service
npm start

# Health check
curl http://localhost:5100/health
```

## Features

- **Facilities Management**: Power plants, solar farms, wind farms
- **Smart Metering**: Real-time energy monitoring
- **Billing System**: Automated billing with multiple tariffs
- **Grid Management**: Live grid status and load balancing
- **15-Layer Integration**: Full RTMN ecosystem connection

## API

### Energy Management
```bash
# Get facilities
curl http://localhost:5100/api/facilities

# Submit reading
curl -X POST http://localhost:5100/api/readings \
  -H "Content-Type: application/json" \
  -d '{"meterId":"meter_1","value":150}'

# Get grid status
curl http://localhost:5100/api/grid/status
```

### 15 Layers
```bash
# Get all layers
curl http://localhost:5100/api/layers

# Specific layer
curl http://localhost:5100/api/layer/intelligence
```

## Port

**5100** - Energy OS Service

## Environment Variables

```env
PORT=5100
MONGODB_URI=mongodb://localhost:27017/energy-os
GENIE_URL=http://localhost:4701
COPILOT_URL=http://localhost:4600
CRM_HUB_URL=http://localhost:4056
WALLET_URL=http://localhost:4004
AUTH_URL=http://localhost:4002
CORPID_URL=http://localhost:4702
MEMORY_URL=http://localhost:4703
TWINOS_URL=http://localhost:4705
```