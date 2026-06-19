# RTMN Unified Hub

> **Version:** 1.0.0  
> **Port:** 4399  
> **Status:** ✅ **CONNECTED TO 50+ SERVICES**

---

## Overview

RTMN Unified Hub is the **single API gateway** that connects ALL RTMN ecosystem services:
- Sales OS
- Media OS
- Marketing OS
- 24 Industry OS
- Foundation services
- AI services
- REZ services
- AdBazaar

---

## Connected Services (50+)

### Core OS (3)
| Service | Port | Purpose |
|---------|------|---------|
| Sales OS | 5055 | CRM, Leads, Pipeline |
| Media OS | 5600 | Content, Streaming |
| Marketing OS | 5500 | Campaigns, Journey |

### Foundation (3)
| Service | Port | Purpose |
|---------|------|---------|
| CorpID | 4702 | Identity |
| MemoryOS | 4703 | AI Memory |
| TwinOS | 4705 | Digital Twins |

### HOJAI AI (5)
| Service | Port | Purpose |
|---------|------|---------|
| Intelligence | 4761 | Analytics |
| Memory | 4762 | AI Memory |
| Twin | 4763 | Digital Twins |
| Agents | 4764 | AI Agents |
| Copilot | 4765 | Business Copilot |

### Industry OS (24)
| Industry | Port |
|----------|------|
| Restaurant | 5010 |
| Hotel | 5025 |
| Healthcare | 5020 |
| Retail | 5030 |
| Legal | 5035 |
| Education | 5060 |
| Agriculture | 5070 |
| Automotive | 5080 |
| Beauty | 5090 |
| Fashion | 5095 |
| Fitness | 5110 |
| Gaming | 5120 |
| Government | 5130 |
| Home Services | 5140 |
| Manufacturing | 5150 |
| Non-Profit | 5160 |
| Professional | 5170 |
| Sports | 5180 |
| Travel | 5190 |
| Entertainment | 5200 |
| Construction | 5210 |
| Financial | 5220 |
| Real Estate | 5230 |
| Transport | 5240 |

---

## API Endpoints

### Health
```
GET /health          # Hub health
GET /ready          # Readiness
GET /live           # Liveness
```

### Service Registry
```
GET /api/services                    # All services
GET /api/services/:category         # By category
GET /api/services/:serviceId        # Single service
```

### Proxy Routes
```
GET /api/{service}/:path    # Proxy to any service
POST /api/{service}/:path
```

### 360 Views
```
GET /api/customer360/:id    # Customer from all systems
```

### Workflows
```
POST /api/workflow/lead-to-revenue     # Lead → Marketing → Sales
POST /api/workflow/campaign-launch     # Campaign → Media → Ads
POST /api/workflow/hotel-booking       # Hotel booking workflow
POST /api/workflow/restaurant-order    # Restaurant workflow
```

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/unified-os-hub
npm install
npm start  # Port 4399

# Test
curl http://localhost:4399/health
curl http://localhost:4399/api/services
```

---

## Example Usage

### Get Customer 360
```bash
curl http://localhost:4399/api/customer360/user123
```

### Create Lead
```bash
curl -X POST http://localhost:4399/api/marketing/leads \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Launch Campaign
```bash
curl -X POST http://localhost:4399/api/workflow/campaign-launch \
  -H "Content-Type: application/json" \
  -d '{"name":"Summer Sale","budget":50000}'
```

---

*Last Updated: June 17, 2026*
