# RTMN Port Registry

## Overview

This document consolidates all port allocations across the 24 industry verticals in the RTMN platform. Each industry operates independent microservices with dedicated port ranges to ensure isolation, scalability, and clear dependency mapping.

**Total Port Allocations:** 200+ ports across 24 industries + Core Services

---

## Platform Hub

| Port | Service | Description |
|------|---------|-------------|
| 8000 | RTMN Platform Hub | Central orchestration for all services |

## Core Services

| Port | Service | Description |
|------|---------|-------------|
| 3000 | API Gateway | Unified entry point |
| 3001 | BOA OS | Business Operating Assistant |
| 3002 | Business Copilot OS | AI-Powered Business Intelligence |
| 3010 | AgentOS Hub | Agent orchestration |
| 3011 | Twinos Hub | Digital twin management |
| 3012 | Knowledge Graph OS | Entity relationships |
| **3013** | **Capability Matrix** | **Formal capability inheritance model** |
| **3014** | **Unified Twin OS** | **Cross-industry twin federation** |
| **3015** | **Memory Network** | **Personal/Business/Industry/Ecosystem memory** |
| **3016** | **BOA Council** | **Multi-BOA synthesis & decisions** |
| **3017** | **Economic Graph** | **Value flow mapping & network analysis** |
| **3018** | **Simulation OS** | **Digital twin simulation & scenarios** |
| **3020** | **Marketing OS** | **Multi-industry marketing orchestration** |
| **3021** | **Workforce OS** | **AI workforce management** |
| **3022** | **Commerce OS** | **Unified commerce transactions** |
| **3023** | **Finance OS** | **Financial operations & reporting** |
| **3030** | **Industry AI Company** | **AI company packaging for 24 industries** |
| **3031** | **Marketplace Network** | **Unified marketplace across industries** |
| **3032** | **Revenue Network** | **Revenue stream orchestration** |
| **3040** | **Developer Cloud** | **Unified API platform & SDKs** |

## Platform Services

| Port | Service | Description |
|------|---------|-------------|
| 4001 | Genie OS | AI Wish Fulfillment |
| 4002 | SUTAR OS | Transaction & Accounting (27 services) |
| 4003 | Agent OS | Universal Agent Orchestration |

---

## Port Allocation Strategy

### Port Range Guidelines

| Range | Purpose |
|-------|---------|
| 3000-3999 | Education, Legal, Gaming services |
| 4000-4999 | Construction, Beauty, Professional services |
| 5000-5999 | Agriculture, Legal, Fashion, Sports services |
| 6000-6999 | Government, Non-Profit cross-industry services |
| 7000-7999 | Entertainment, Automotive, Home Services |
| 8000-8999 | Integration services, API gateways |
| 8500-8999 | Restaurant, Hotel, Healthcare services |
| 9000-9999 | Financial, Real Estate, Transport services |

---

## Industry Port Allocations

### Agriculture OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 5001 | Agriculture Gateway | gRPC/REST | Primary API gateway |
| 5012 | Crop Twin | gRPC | Crop monitoring and management |
| 5034 | Soil Twin | gRPC | Soil analysis and conditions |
| 5045 | Weather Twin | gRPC | Weather integration |
| 5056 | Equipment Twin | gRPC | Farm equipment tracking |

**File:** [industries/agriculture-os/INTEGRATION-SPEC.md](./industries/agriculture-os/INTEGRATION-SPEC.md)

---

### Automotive OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 7501 | Vehicle Twin | gRPC | Vehicle state and telemetry |
| 7502 | Driver Twin | gRPC | Driver profile and credentials |
| 7503 | Dealer Twin | gRPC | Dealer network management |
| 7504 | Service Twin | gRPC | Service scheduling and history |
| 8102 | Automotive Gateway | REST | API gateway |
| 8205 | Vehicle Diagnostics | gRPC | Real-time diagnostics |
| 8206 | Driver Authentication | gRPC | OAuth2/JWT auth |
| 8207 | Dealer Integration | gRPC | DMS integration |
| 8208 | Service Scheduling | gRPC | Workshop scheduling |
| 8209 | Parts Inventory | gRPC | Parts management |

**File:** [industries/automotive-os/INTEGRATION-SPEC.md](./industries/automotive-os/INTEGRATION-SPEC.md)

---

### Beauty OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 3100 | Beauty Gateway | REST | Primary API gateway |
| 3200 | Customer Twin | gRPC | Customer profiles |
| 3400 | Product Twin | gRPC | Product catalog |
| 3500 | Stylist Twin | gRPC | Stylist management |
| 4004 | Appointment Twin | gRPC | Booking management |
| 4142 | Inventory Twin | gRPC | Inventory tracking |
| 4300 | Service Twin | gRPC | Service definitions |

**File:** [industries/beauty-os/INTEGRATION-SPEC.md](./industries/beauty-os/INTEGRATION-SPEC.md)

---

### Construction OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 4001 | Construction Gateway | REST | Primary API gateway |
| 4022 | Project Twin | gRPC | Project management |
| 4023 | Worker Twin | gRPC | Workforce management |
| 4034 | Equipment Twin | gRPC | Equipment tracking |
| 4045 | Material Twin | gRPC | Material inventory |

**File:** [industries/construction-os/INTEGRATION-SPEC.md](./industries/construction-os/INTEGRATION-SPEC.md)

---

### Education OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 3000 | Education Gateway | REST | Primary API gateway |
| 3100 | Student Twin | gRPC | Student records |
| 4142 | Course Twin | gRPC | Course management |
| 4200 | Instructor Twin | gRPC | Instructor profiles |
| 5100 | Assignment Twin | gRPC | Assignment tracking |

**File:** [industries/education-os/INTEGRATION-SPEC.md](./industries/education-os/INTEGRATION-SPEC.md)

---

### Entertainment OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 7001 | Content Twin | gRPC | Content metadata |
| 7002 | Viewer Twin | gRPC | Viewer profiles |
| 7003 | Creator Twin | gRPC | Creator management |
| 7004 | Platform Twin | gRPC | Platform analytics |
| 7005 | Event Twin | gRPC | Event management |
| 8101 | Entertainment Gateway | REST | API gateway |
| 8201 | Streaming Service | gRPC | CDN integration |
| 8202 | Recommendation Engine | gRPC | ML recommendations |
| 8203 | Engagement Tracker | gRPC | User engagement |
| 8204 | Monetization Service | gRPC | Payment processing |
| 8210 | License Manager | gRPC | DRM/licensing |

**File:** [industries/entertainment-os/INTEGRATION-SPEC.md](./industries/entertainment-os/INTEGRATION-SPEC.md)

---

### Fashion OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 5543 | Style Twin | gRPC | Style matching |
| 5544 | Wardrobe Twin | gRPC | Wardrobe management |
| 5545 | Trend Twin | gRPC | Trend analysis |
| 5546 | Designer Twin | gRPC | Designer profiles |
| 5547 | Retail Twin | gRPC | Retail integration |
| 5548 | Fashion Gateway | REST | API gateway |
| 5553 | Inventory Twin | gRPC | Inventory tracking |
| 5554 | Collection Twin | gRPC | Collection management |
| 5555 | Sizing Twin | gRPC | Size recommendations |
| 5556 | Sustainability Twin | gRPC | ESG tracking |
| 5843 | Fashion Agent | gRPC | Orchestration agent |
| 5853 | Style Agent | gRPC | Style recommendations |
| 5903 | Trend Agent | gRPC | Trend forecasting |
| 5948 | Commerce Agent | gRPC | Commerce operations |

**File:** [industries/fashion-os/INTEGRATION-SPEC.md](./industries/fashion-os/INTEGRATION-SPEC.md)

---

### Financial OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 8943 | Account Twin | gRPC | Account management |
| 8944 | Transaction Twin | gRPC | Transaction processing |
| 8945 | Customer Twin | gRPC | Customer profiles |
| 8946 | Product Twin | gRPC | Financial products |
| 8947 | Portfolio Twin | gRPC | Investment portfolios |
| 8948 | Compliance Twin | gRPC | Regulatory compliance |
| 8949 | Risk Twin | gRPC | Risk assessment |
| 8950 | Trading Twin | gRPC | Trading operations |
| 8951 | Loan Twin | gRPC | Loan management |
| 8952 | Financial Gateway | REST | API gateway |

**File:** [industries/financial-os/INTEGRATION-SPEC.md](./industries/financial-os/INTEGRATION-SPEC.md)

---

### Fitness OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 3100 | Fitness Gateway | REST | Primary API gateway |
| 3200 | Body Twin | gRPC | Body metrics |
| 4142 | Fitness Twin | gRPC | Workout tracking |
| 4300 | Trainer Twin | gRPC | Trainer matching |
| 4400 | Goal Twin | gRPC | Goal setting |

**File:** [industries/fitness-os/INTEGRATION-SPEC.md](./industries/fitness-os/INTEGRATION-SPEC.md)

---

### Gaming OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 3001 | Player Twin | gRPC | Player profiles |
| 3002 | Game Twin | gRPC | Game state |
| 3003 | Match Twin | gRPC | Match management |
| 3011 | Achievement Twin | gRPC | Achievement tracking |
| 3023 | Leaderboard Twin | gRPC | Rankings |
| 3030 | Tournament Twin | gRPC | Tournament management |

**File:** [industries/gaming-os/INTEGRATION-SPEC.md](./industries/gaming-os/INTEGRATION-SPEC.md)

---

### Government OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 5443 | Citizen Twin | gRPC | Citizen registry |
| 6443 | Service Twin | gRPC | Service delivery |
| 7443 | Department Twin | gRPC | Government departments |
| 7444 | Permit Twin | gRPC | Permit processing |
| 7445 | Complaint Twin | gRPC | Grievance handling |
| 7446 | Payment Twin | gRPC | Fee collection |
| 7447 | Document Twin | gRPC | Document verification |
| 8443 | Government Gateway | REST | API gateway |
| 9443 | Compliance Twin | gRPC | Regulatory compliance |

**File:** [industries/government-os/INTEGRATION-SPEC.md](./industries/government-os/INTEGRATION-SPEC.md)

---

### Healthcare OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 8643 | Patient Twin | gRPC | Patient records |
| 8644 | Doctor Twin | gRPC | Provider profiles |
| 8645 | Staff Twin | gRPC | Staff management |
| 8646 | Facility Twin | gRPC | Facility management |
| 8647 | Insurance Twin | gRPC | Insurance verification |
| 8648 | Appointment Twin | gRPC | Scheduling |
| 8649 | Medical Record Twin | gRPC | Clinical records |

**File:** [industries/healthcare-os/INTEGRATION-SPEC.md](./industries/healthcare-os/INTEGRATION-SPEC.md)

---

### Home Services OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 7601 | Home Twin | gRPC | Home profiles |
| 7602 | Service Provider Twin | gRPC | Provider directory |
| 7603 | Job Twin | gRPC | Job management |
| 7604 | Customer Twin | gRPC | Customer profiles |
| 8103 | Home Services Gateway | REST | API gateway |
| 8209 | Booking Service | gRPC | Service booking |
| 8210 | Dispatch Service | gRPC | Dispatch optimization |
| 8211 | Quality Service | gRPC | Service quality |
| 8212 | Payment Service | gRPC | Payment processing |
| 8213 | Review Service | gRPC | Review management |

**File:** [industries/homeservices-os/INTEGRATION-SPEC.md](./industries/homeservices-os/INTEGRATION-SPEC.md)

---

### Hotel OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 8443 | Guest Twin | REST | Guest profiles, preferences, loyalty, sentiment |
| 8444 | Room Twin | REST | Room management with IoT integration |
| 8445 | Property Twin | REST | Property operations and venues |
| 8446 | Predictive Housekeeping Agent | REST | Intelligent room scheduling and maintenance prediction |
| 8447 | Guest Memory | REST | Guest Memory integration with TwinOS Hub |
| 8448 | Property Twin Service | REST | Multi-property digital twins (Guest/Room/Property) |
| 8449 | REZ POS | REST | Transaction hub |
| 8450 | REZ Loyalty | REST | Points/tiers management |
| 8451 | BrandPulse | REST | Sentiment analysis |
| 8452 | AI Concierge Agent | REST | Virtual concierge with hotel-specific skills |
| 4142 | Hotel Integration | REST | Cross-service integration |

**File:** [industries/hotel-os/INTEGRATION-SPEC.md](./industries/hotel-os/INTEGRATION-SPEC.md)

**Business Copilot Skills:**
- [industries/hotel-os/skills/](./industries/hotel-os/skills/)
- [industries/hotel-os/skills/guest-twin-service/](./industries/hotel-os/skills/guest-twin-service/) - Guest profiles, preferences, loyalty, stay history, sentiment
- [industries/hotel-os/skills/room-twin-service/](./industries/hotel-os/skills/room-twin-service/) - Room status, IoT state, occupancy, features
- [industries/hotel-os/skills/property-twin-service-core/](./industries/hotel-os/skills/property-twin-service-core/) - Property venues, amenities, policies, revenue centers

**Guest Twin Service:** [industries/hotel-os/services/guest-twin-service/](./industries/hotel-os/services/guest-twin-service/)

**Room Twin Service:** [industries/hotel-os/services/room-twin-service/](./industries/hotel-os/services/room-twin-service/)

**Property Twin Service:** [industries/hotel-os/services/property-twin-service/](./industries/hotel-os/services/property-twin-service/)

**Integration:** [industries/hotel-os/integrations/guest-memory-twinos/](./industries/hotel-os/integrations/guest-memory-twinos/)

**Agents:**
- [industries/hotel-os/agents/ai-concierge/](./industries/hotel-os/agents/ai-concierge/)
- [industries/hotel-os/agents/predictive-housekeeping/](./industries/hotel-os/agents/predictive-housekeeping/)
- [industries/hotel-os/agents/upsell-engine/](./industries/hotel-os/agents/upsell-engine/)

#### Hotel OS Business Copilot APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/twins/guest` | Create guest twin |
| GET | `/api/twins/guest/:id` | Get guest twin |
| PUT | `/api/twins/guest/:id/preferences` | Update preferences |
| GET | `/api/twins/guest/:id/upsell-eligibility` | Check upsell eligibility |
| POST | `/api/twins/room` | Create room twin |
| GET | `/api/twins/room/:id/status` | Get room status |
| PUT | `/api/twins/room/:id/iot` | Update IoT state |
| PUT | `/api/twins/room/:id/status` | Update room status |
| POST | `/api/twins/property` | Create property twin |
| GET | `/api/twins/property/:id` | Get property twin |
| PUT | `/api/twins/property/:id/venues` | Update venue |
| GET | `/api/twins/property/:id/performance` | Get performance summary |

---

### Legal OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 4190 | Legal Gateway | REST | Primary API gateway |
| 5004 | Client Twin | gRPC | Client management |
| 4180 | Matter Twin | gRPC | Case/matter tracking |
| 4181 | Document Twin | gRPC | Document management |
| 4182 | Attorney Twin | gRPC | Attorney profiles |
| 4183 | Court Twin | gRPC | Court scheduling |
| 4184 | Billing Twin | gRPC | Invoice management |
| 4185 | Conflict Twin | gRPC | Conflict checking |
| 4142 | Legal Integration | REST | Cross-service integration |
| 3000 | Legal WebSocket | WebSocket | Real-time updates |

**File:** [industries/legal-os/INTEGRATION-SPEC.md](./industries/legal-os/INTEGRATION-SPEC.md)

---

### Manufacturing OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 6001 | Plant Twin | gRPC | Manufacturing plant |
| 6002 | Machine Twin | gRPC | Machine monitoring |
| 6003 | Inventory Twin | gRPC | Inventory management |
| 6004 | Vendor Twin | gRPC | Supplier management |
| 6005 | Product Twin | gRPC | Product definitions |
| 6006 | Quality Twin | gRPC | Quality control |

**File:** [industries/manufacturing-os/INTEGRATION-SPEC.md](./industries/manufacturing-os/INTEGRATION-SPEC.md)

---

### Non-Profit OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 8343 | Donor Twin | gRPC | Donor management |
| 8344 | Beneficiary Twin | gRPC | Beneficiary tracking |
| 8345 | Organization Twin | gRPC | Organization profiles |
| 8346 | Campaign Twin | gRPC | Fundraising campaigns |
| 8347 | Impact Twin | gRPC | Impact measurement |
| 8348 | Volunteer Twin | gRPC | Volunteer management |
| 7343 | Non-Profit Gateway | REST | API gateway |
| 6343 | Grant Twin | gRPC | Grant management |
| 7443 | Compliance Twin | gRPC | Regulatory compliance |

**File:** [industries/nonprofit-os/INTEGRATION-SPEC.md](./industries/nonprofit-os/INTEGRATION-SPEC.md)

---

### Professional Services OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 6101 | Professional Twin | gRPC | Professional profiles |
| 6102 | Client Twin | gRPC | Client management |
| 6103 | Project Twin | gRPC | Project tracking |
| 6104 | Resource Twin | gRPC | Resource allocation |
| 6105 | Invoice Twin | gRPC | Billing management |
| 6106 | Professional Gateway | REST | API gateway |
| **5170** | **REZ SalesMind** | REST | **AI Sales Intelligence Platform** |
| 4100 | REZ Merchant | REST | Merchant services |
| 4200 | REZ Consumer | REST | Consumer app |

**File:** [industries/professional-os/INTEGRATION-SPEC.md](./industries/professional-os/INTEGRATION-SPEC.md)

---

### Real Estate OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 8843 | Property Twin | gRPC | Property listings |
| 8844 | Agent Twin | gRPC | Agent profiles |
| 8845 | Buyer Twin | gRPC | Buyer profiles |
| 8846 | Deal Twin | gRPC | Deal management |
| 8847 | Area Twin | gRPC | Area analytics |
| 8848 | Referral Twin | gRPC | Referral tracking |
| 8849 | Showing Twin | gRPC | Property showings |
| 8850 | Real Estate Gateway | REST | API gateway |
| 4142 | Real Estate Integration | REST | Cross-service integration |

**File:** [industries/realestate-os/INTEGRATION-SPEC.md](./industries/realestate-os/INTEGRATION-SPEC.md)

---

### Restaurant OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 8543 | Table Twin | gRPC | Table management |
| 8544 | Kitchen Twin | gRPC | Kitchen operations |
| 8545 | Menu Twin | gRPC | Menu management |
| 8546 | Customer Twin | gRPC | Customer profiles |
| 8547 | Staff Twin | gRPC | Staff scheduling |
| 8548 | Order Twin | gRPC | Order management |
| 8549 | Reservation Twin | gRPC | Reservations |
| 8550 | Inventory Twin | gRPC | Inventory tracking |
| 8551 | Restaurant Gateway | REST | API gateway |
| 4007 | Restaurant Integration | REST | Cross-service integration |

**File:** [industries/restaurant-os/INTEGRATION-SPEC.md](./industries/restaurant-os/INTEGRATION-SPEC.md)

---

### Retail OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 8743 | Shopper Twin | gRPC | Shopper profiles |
| 8744 | Store Twin | gRPC | Store management |
| 8745 | Product Twin | gRPC | Product catalog |
| 8746 | Basket Twin | gRPC | Shopping cart |
| 8747 | Order Twin | gRPC | Order processing |
| 8748 | Inventory Twin | gRPC | Inventory management |
| 8749 | Loyalty Twin | gRPC | Loyalty program |
| 8750 | Payment Twin | gRPC | Payment processing |
| 8751 | Fulfillment Twin | gRPC | Order fulfillment |
| 8752 | Retail Gateway | REST | API gateway |

**File:** [industries/retail-os/INTEGRATION-SPEC.md](./industries/retail-os/INTEGRATION-SPEC.md)

---

### Sports OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 5643 | Fan Twin | gRPC | Fan engagement |
| 5644 | Athlete Twin | gRPC | Athlete profiles |
| 5645 | Team Twin | gRPC | Team management |
| 5646 | Venue Twin | gRPC | Venue operations |
| 5647 | Event Twin | gRPC | Event management |
| 5648 | Ticket Twin | gRPC | Ticket management |
| 5649 | Media Twin | gRPC | Media rights |
| 5650 | Fantasy Twin | gRPC | Fantasy sports |
| 5651 | Sponsorship Twin | gRPC | Sponsorship deals |
| 5652 | Stats Twin | gRPC | Statistics |
| 5653 | Training Twin | gRPC | Training programs |
| 5654 | Contract Twin | gRPC | Athlete contracts |
| 5655 | Performance Twin | gRPC | Performance tracking |
| 5656 | Sports Gateway | REST | API gateway |
| 5543 | Sports Agent | gRPC | Orchestration agent |
| 5546 | Media Agent | gRPC | Media operations |
| 7343 | Sports Integration | REST | Cross-service integration |

**File:** [industries/sports-os/INTEGRATION-SPEC.md](./industries/sports-os/INTEGRATION-SPEC.md)

---

### Transport OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 9043 | Vehicle Twin | gRPC | Vehicle tracking |
| 9044 | Driver Twin | gRPC | Driver management |
| 9045 | Rider Twin | gRPC | Rider profiles |
| 9046 | Fleet Twin | gRPC | Fleet management |
| 9047 | Journey Twin | gRPC | Trip tracking |
| 9048 | Order Twin | gRPC | Order management |
| 9049 | Traveler Twin | gRPC | Traveler profiles |

**File:** [industries/transport-os/INTEGRATION-SPEC.md](./industries/transport-os/INTEGRATION-SPEC.md)

---

### Travel OS

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 6501 | Traveler Twin | gRPC | Traveler profiles |
| 6502 | Destination Twin | gRPC | Destination info |
| 6503 | Package Twin | gRPC | Travel packages |
| 6504 | Booking Twin | gRPC | Booking management |
| 6505 | Experience Twin | gRPC | Experience booking |
| 6506 | Travel Gateway | REST | API gateway |

**File:** [industries/travel-os/INTEGRATION-SPEC.md](./industries/travel-os/INTEGRATION-SPEC.md)

---

## Shared/Common Ports

| Port | Service | Industries | Description |
|------|---------|------------|-------------|
| 4142 | Integration Port | Beauty, Education, Fitness, Legal, Hotel, Real Estate | Cross-industry integration |
| 3000 | WebSocket Gateway | Education, Legal | Real-time communication |
| 7343 | Compliance Port | Non-Profit, Sports | Regulatory compliance |

---

## Port Allocation Summary

| Industry | Port Count | Port Range |
|----------|------------|------------|
| Agriculture | 5 | 5001-5056 |
| Automotive | 10 | 7501-7504, 8102, 8205-8209 |
| Beauty | 7 | 3100-4300 |
| Construction | 5 | 4001-4045 |
| Education | 5 | 3000-5100 |
| Entertainment | 10 | 7001-7005, 8101, 8201-8204, 8210 |
| Energy | 2 | 4514-5100 |
| Fashion | 19 | 5543-5948 |
| Financial | 10 | 8943-8952 |
| Fitness | 5 | 3100-4400 |
| Gaming | 6 | 3001-3030 |
| Government | 10 | 4511, 5443-9443 |
| Healthcare | 7 | 8643-8649 |
| Home Services | 10 | 7601-7604, 8103, 8209-8213 |
| Hotel | 11 | 8443-8452, 4142 |
| Legal | 11 | 4510, 3000-5004 |
| Manufacturing | 6 | 6001-6006 |
| Media | 2 | 4515, 5600 |
| Non-Profit | 9 | 6343-8348 |
| Professional Services | 6 | 6101-6106 |
| Real Estate | 9 | 8843-8850, 4142 |
| Restaurant | 10 | 8543-8551, 4007 |
| Retail | 10 | 8743-8752 |
| Sports | 18 | 4513, 5543-5656, 7343 |
| Transport | 7 | 9043-9049 |
| Travel | 6 | 6501-6506 |
| **HOJAI AI** | 18 | 4500-4780 |

---

### HOJAI AI (Intelligence Platform)

**Location:** `companies/hojai-ai/` and `products/brandpulse/`
**Description:** AI infrastructure providing services to all ecosystem companies

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| 4500 | HOJAI Gateway | REST | Primary API gateway |
| 4510 | **Legal AI** | REST | AI-powered legal management |
| 4511 | **Government AI** | REST | AI-powered government services |
| 4512 | **Agriculture AI** | REST | Smart agriculture intelligence |
| 4513 | **Sports AI** | REST | AI-powered sports management |
| 4514 | **Energy AI** | REST | Smart energy intelligence |
| 4515 | **Media AI** | REST | AI-powered media intelligence |
| 4520 | Memory Service | REST | Multi-tier memory infrastructure |
| 4521 | TwinOS | REST | Digital twin management |
| 4530 | Intelligence | REST | AI intelligence services |
| 4550 | ExpertOS | REST | Professional AI marketplace |
| 4595 | Web Intelligence | REST | Market signals, competitor analysis |
| 4751 | Merchant Intel | REST | Business intelligence |
| 4752 | Lead Service | REST | Lead scoring and enrichment |
| 4786 | Knowledge Graph | REST | Entity relationships |
| 4702 | CorpID (Identity Hub) | REST | Universal identity |
| 4703 | Genie Memory | REST | Personal AI memory |
| 4704 | Genie Relations | REST | Relationship tracking |
| 4706 | Genie Briefing | REST | Daily briefings |
| 4760 | Genie Voice | REST | Email, SMS, WhatsApp, Calls |
| **4770** | **BrandPulse API** | REST | Brand intelligence & sentiment |
| **4780** | **BrandPulse Dashboard** | REST | React analytics dashboard |
| 4850 | VoiceOS | REST | Voice AI platform |

**File:** [docs/hojai-ai/BRANDPULSE.md](./docs/hojai-ai/BRANDPULSE.md)

---

### Industry OS Services

**Location:** `services/`

| Port | Service | Industry | Description |
|------|---------|----------|-------------|
| 5100 | **Energy OS** | Energy | Smart energy management platform |
| 5600 | **Media OS** | Media | Digital media & content management |

**File:** [services/energy-os/](./services/energy-os/) | [services/media-os/](./services/media-os/)

---

## Document Metadata

| Attribute | Value |
|-----------|-------|
| Document | PORT-REGISTRY.md |
| Version | 1.1 |
| Last Updated | 2026-06-15 |
| Total Industries | 24 |
| Total Ports | 220+ |
| Port Ranges | 3000-9999 |

---

## Related Documents

- [INDUSTRY-OS-MASTER-INDEX.md](./INDUSTRY-OS-MASTER-INDEX.md) - Master index with all industry specs
