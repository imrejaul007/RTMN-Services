# RTMN Platform Hub

**Status:** ✅ BUILT - June 14, 2026  
**Port:** 8000  
**Location:** `platform/rtmn-hub/`

## Overview

The RTMN Platform Hub is the central orchestration layer for the Real-Time Multi-Industry Network. It connects all 24 Industry Operating Systems with core platform services (BOA, SUTAR, Genie, AgentOS).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RTMN Platform Hub (Port 8000)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Core Services          │  Platform Services      │  Industry OS (24)         │
│  ─────────────         │  ────────────────      │  ────────────────          │
│  • API Gateway         │  • BOA OS              │  • Restaurant (5010)       │
│  • AgentOS Hub         │  • SUTAR OS            │  • Healthcare (5020)      │
│  • TwinOS Hub          │  • Genie OS            │  • Retail (5030)          │
│  • Knowledge Graph     │  • Agent OS            │  • ... all 24 industries  │
│  • Business Copilot   │                        │                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Service Registry

### Core Services
| Service | URL | Port |
|---------|-----|------|
| api-gateway | http://localhost:3000 | 3000 |
| agentos-hub | http://localhost:3010 | 3010 |
| twinos-hub | http://localhost:3011 | 3011 |
| knowledge-graph | http://localhost:3012 | 3012 |
| business-copilot | http://localhost:3002 | 3002 |

### Platform Services
| Service | URL | Port |
|---------|-----|------|
| boa-os | http://localhost:3001 | 3001 |
| sutar-os | http://localhost:4002 | 4002 |
| genie-os | http://localhost:4001 | 4001 |
| agent-os | http://localhost:4003 | 4003 |

### Economic Network (RTNM-Group)
| Service | URL | Port | Purpose |
|---------|-----|------|---------|
| company-registry | http://localhost:6000 | 6000 | Company registration, trust scores, services |
| inter-company-graph | http://localhost:6001 | 6001 | Relationship mapping (pays, provides, consumes) |
| company-twins | http://localhost:6002 | 6002 | Company digital twins with budget, policies |
| company-trust | http://localhost:6003 | 6003 | Trust score calculation |
| inter-company-ledger | http://localhost:6004 | 6004 | Financial transactions between companies |

### Industry OS (24 Industries)
| Industry | Port | Twins |
|----------|------|-------|
| Restaurant | 5010 | Order, Menu, Kitchen, Table, Inventory |
| Healthcare | 5020 | Patient, Appointment, Doctor, Billing, Inventory |
| Retail | 5030 | Customer, Product, Inventory, Order, Revenue |
| Hospitality | 5040 | Guest, Room, Booking, Revenue, Service |
| Legal | 5050 | Case, Client, Document, Contract, Court |
| Education | 5060 | Course, Student, Teacher, Institution |
| Agriculture | 5070 | Farm, Crop, Livestock, Weather, Soil |
| Automotive | 5080 | Vehicle, Engine, Customer, Service |
| Beauty | 5090 | Client, Service, Staff, Inventory |
| Fashion | 5100 | Product, Collection, Inventory, Trend |
| Fitness | 5110 | Member, Trainer, Equipment, Class |
| Gaming | 5120 | Game, Player, Tournament, Match |
| Government | 5130 | Citizen, Service, Department, Permit |
| HomeServices | 5140 | Provider, Customer, Booking, Service |
| Manufacturing | 5150 | Product, Machine, Production, Inventory |
| NonProfit | 5160 | Donor, Campaign, Beneficiary, Volunteer |
| Professional | 5170 | Consultant, Client, Project, Invoice |
| Sports | 5180 | Team, Player, Match, Venue |
| Travel | 5190 | Destination, Package, Booking, Traveler |
| Entertainment | 5200 | Event, Venue, Ticket, Artist |
| Construction | 5210 | Project, Contractor, Worker, Material |
| Financial | 5220 | Account, Transaction, Customer, Loan |
| RealEstate | 5230 | Property, Buyer, Agent, Market |
| Transport | 5240 | Vehicle, Driver, Rider, Route |
| Hotel | 5025 | Guest, Room, Property, Booking |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /` | - | Platform overview |
| `GET /health` | - | Health check |
| `GET /services` | - | Full service registry |
| `GET /industries` | - | All Industry OS list |
| `GET /industries/:id` | - | Specific industry details |
| `GET /twins` | - | All Digital Twins across industries |
| `GET /agents` | - | All AI Agents across industries |
| `POST /query` | POST | Universal service query |
| `GET /search?q=` | GET | Platform-wide search |
| `GET /api/:industry` | PROXY | Proxy to industry service |

## Quick Start

```bash
# Install and start
cd platform/rtmn-hub && npm install && node src/index.js

# Access platform overview
curl http://localhost:8000/

# Get all services
curl http://localhost:8000/services

# Get all industries
curl http://localhost:8000/industries

# Search across platform
curl "http://localhost:8000/search?q=restaurant"

# Query specific service
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"service": "restaurant-os", "endpoint": "/health"}'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8000 | Hub port |
| API_GATEWAY_URL | http://localhost:3000 | API Gateway URL |
| AGENTOS_HUB_URL | http://localhost:3010 | AgentOS Hub URL |
| TWINOS_HUB_URL | http://localhost:3011 | TwinOS Hub URL |
| KG_URL | http://localhost:3012 | Knowledge Graph URL |
| BUSINESS_COPILOT_URL | http://localhost:3002 | Business Copilot URL |
| BOA_OS_URL | http://localhost:3001 | BOA OS URL |
| SUTAR_OS_URL | http://localhost:4002 | SUTAR OS URL |
| GENIE_OS_URL | http://localhost:4001 | Genie OS URL |
| AGENT_OS_URL | http://localhost:4003 | Agent OS URL |

## Key Features

1. **Service Registry** - Central registry mapping all RTMN services
2. **Industry Orchestration** - Unified access to all 24 Industry OS
3. **Digital Twin Hub** - Aggregate view of all twins across industries
4. **AI Agent Registry** - Central agent discovery and routing
5. **Universal Query** - Query any service through the hub
6. **Platform Search** - Cross-industry search capability
7. **Proxy Routing** - Route requests to specific industry services
8. **Health Monitoring** - Centralized health checks for all services

## File Structure

```
platform/rtmn-hub/
├── package.json
└── src/
    └── index.js                    # Main entry (port 8000)
```

## Dependencies

- express - Web framework
- cors - CORS middleware
- helmet - Security headers
- axios - HTTP client for service queries
