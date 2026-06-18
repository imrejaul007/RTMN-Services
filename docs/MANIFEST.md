# RTMN Ecosystem - Complete File Manifest

## Documentation Files

| File | Purpose |
|-------|---------|
| `README.md` | Main project README |
| `CLAUDE.md` | Developer context |
| `docs/README.COMPLETE.md` | Complete technical documentation |
| `docs/API-QUICK-REFERENCE.md` | API cheat sheet |
| `docs/TECHNICAL-ARCHITECTURE.md` | System design |
| `docs/DEPLOYMENT-GUIDE.md` | Production deployment |
| `docs/SUMMARY.md` | Executive overview |

## Core Files

| File | Purpose |
|-------|---------|
| `services/unified-os-hub/src/index.js` | Unified Hub (4399) |
| `services/unified-os-hub/src/workflows.js` | 24 industry workflows |
| `docker-compose.unified-hub.yml` | Docker deployment |
| `render.unified-hub.yaml` | Render deployment |

## Industry OS Services (24)

| Service | Port | Purpose |
|---------|------|---------|
| Sales OS | 5055 | CRM, Leads |
| Media OS | 5600 | Content, Streaming |
| Marketing OS | 5500 | Campaigns |
| Hotel OS | 5025 | Bookings |
| Restaurant OS | 5010 | Orders |
| Healthcare OS | 5020 | Patients |
| Retail OS | 5030 | Products |
| Legal OS | 5035 | Cases |
| Education OS | 5060 | Courses |
| Beauty OS | 5090 | Appointments |
| Fitness OS | 5110 | Memberships |
| RealEstate OS | 5230 | Properties |
| Manufacturing OS | 5150 | B2B |
| Travel OS | 5190 | Packages |
| Entertainment OS | 5200 | Events |
| Automotive OS | 5080 | Vehicles |
| Fashion OS | 5095 | Apparel |
| Gaming OS | 5120 | Gaming |
| Government OS | 5130 | Permits |
| Home Services OS | 5140 | Bookings |
| Non-Profit OS | 5160 | Donations |
| Professional OS | 5170 | Consulting |
| Sports OS | 5180 | Academy |
| Construction OS | 5210 | Projects |
| Financial OS | 5220 | Accounts |
| Transport OS | 5240 | Logistics |

## Foundation Services (3)

| Service | Port | Purpose |
|---------|------|---------|
| CorpID | 4702 | Identity |
| MemoryOS | 4703 | Preferences |
| TwinOS | 4705 | Twins |

## REZ Services (4)

| Service | Port | Purpose |
|---------|------|---------|
| REZ Auth | 4002 | Authentication |
| REZ Wallet | 4004 | Payments |
| REZ CRM | 4056 | Contacts |
| REZ Care | 4055 | Support |

## AdBazaar (4)

| Service | Port | Purpose |
|---------|------|---------|
| REZ DSP | 4990 | Ads |
| REZ Audience | 4805 | Segments |
| REZ Attribution | 4803 | Analytics |
| REZ CDP | 4901 | Data |

## HOJAI AI Suite (5)

| Service | Port | Purpose |
|---------|------|---------|
| Intelligence | 4761 | Insights |
| Memory | 4762 | Context |
| Twin | 4763 | Digital Twins |
| Agents | 4764 | Automation |
| Copilot | 4765 | Assistance |

## Workflows (24)

| Workflow | Industry |
|---------|---------|
| Order | Restaurant |
| Booking | Hotel |
| Appointment | Healthcare |
| Inquiry | RealEstate |
| Enrollment | Education |
| Purchase | Automotive |
| Complete Trip | Travel |
| B2B Order | Manufacturing |
| Membership | Fitness |
| Consultation | Professional |
| Case | Legal |
| Quote | Construction |
| Registration | Entertainment |
| Tournament | Gaming |
| Academy | Sports |
| Farm Inputs | Agriculture |
| Permit | Government |
| Shipment | Transport |

## Digital Twins (35+)

| Twin | Purpose |
|------|---------|
| Customer | 360° view |
| Lead | Behavior |
| Order | Lifecycle |
| Campaign | Performance |
| Audience | Segments |
| Booking | Reservations |
| Patient | Health |
| Student | Learning |
| Vehicle | Auto |

## AI Agents (20+)

| Agent | Purpose |
|-------|---------|
| AI CMO | Strategy |
| AI Sales Rep | Leads |
| AI Support | Tickets |
| AI Hotel Concierge | Hospitality |
| AI Doctor | Healthcare |
| AI Tutor | Education |
| AI Legal Assistant | Law |
| AI Fitness Coach | Gym |
| AI Content Writer | Media |
| AI Scheduler | Marketing |
| AI Auditor | Compliance |

## Quick Links

| Resource | URL |
|----------|-----|
| Hub | http://localhost:4399 |
| Docs | docs/README.COMPLETE.md |
| API Ref | docs/API-QUICK-REFERENCE.md |
| Arch | docs/TECHNICAL-ARCHITECTURE.md |
| Deploy | docs/DEPLOYMENT-GUIDE.md |
| Summary | docs/SUMMARY.md |

## Environment Variables

```bash
# Hub
PORT=4399
MONGODB_URI=mongodb://localhost:27017/rtmn

# Industry OS
SALES_OS_URL=http://localhost:5055
MEDIA_OS_URL=http://localhost:5600
MARKETING_OS_URL=http://localhost:5500

# Foundation
CORPID_URL=http://localhost:4702
MEMORY_OS_URL=http://localhost:4703
TWIN_OS_URL=http://localhost:4705

# REZ
REZ_CRM_URL=http://localhost:4056
REZ_WALLET_URL=http://localhost:4004
REZ_CARE_URL=http://localhost:4055

# AdBazaar
ADBAZAAR_DSP_URL=http://localhost:4990
ADBAZAAR_AUDIENCE_URL=http://localhost:4805

# HOJAI
LEVERAGE_INTELLIGENCE_URL=http://localhost:4761
LEVERAGE_COPILOT_URL=http://localhost:4765
```

## Ports Reference

| Range | Services |
|-------|----------|
| 4000-4099 | REZ Core |
| 4300-4399 | Axom/BuzzLocal |
| 4500-4599 | HOJAI |
| 4700-4799 | Foundation |
| 4800-4899 | REZ Merchant |
| 4900-4999 | AdBazaar |
| 5000-5240 | Industry OS |
| 5600 | Media OS |
| 5500 | Marketing OS |
| 5055 | Sales OS |
| 4399 | Unified Hub |

## Success Metrics

| Metric | Value |
|--------|-------|
| Services | 50+ |
| Industries | 24 |
| Twins | 35+ |
| Agents | 20+ |
| Workflows | 24 |
| APIs | 500+ |

---

*Generated: June 17, 2026*
