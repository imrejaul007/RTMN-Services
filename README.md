# RTMN Industry OS Ecosystem

**Complete unified platform combining 24 industries with Digital Twins, AI Agents, and Business Copilot.**

> **Ready to onboard clients?** See our [Client Ready Guide](CLIENT-ONBOARDING.md) and [Quick Start](docs/getting-started/QUICKSTART.md).

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/RTMN.git
cd RTMN

# Deploy Hotel OS (complete example)
cd industries/hotel-os/deployment
docker-compose -f docker-compose.staging.yml up -d

# Access Hotel OS API
curl http://localhost:3001/health
```

---

## 📦 Industry Coverage (24 Industries)

| # | Industry | Status | Services | Agents | CRM Integration |
|---|----------|--------|----------|--------|-----------------|
| 1 | [Hotel OS](industries/hotel-os/) | ✅ Complete | 6 | 4 | HubSpot, Opera PMS |
| 2 | [Restaurant OS](industries/restaurant-os/) | ✅ Complete | 5 | 4 | Toast, Square |
| 3 | [Retail OS](industries/retail-os/) | ✅ Complete | 3 | 2 | Shopify, WooCommerce |
| 4 | [Healthcare OS](industries/healthcare-os/) | ✅ Complete | 4 | 2 | Epic, Cerner |
| 5 | [Real Estate OS](industries/realestate-os/) | ✅ Complete | 6 | 3 | HubSpot, Salesforce |
| 6 | [Financial OS](industries/financial-os/) | ✅ Complete | 8 | 5 | Core Banking Systems |
| 7 | [Transport OS](industries/transport-os/) | ✅ Complete | 7 | 4 | Fleet Management |
| 8 | [Legal OS](industries/legal-os/) | ✅ Complete | 4 | 4 | Clio, Practice Mgmt |
| 9 | [Education OS](industries/education-os/) | ✅ Complete | 4 | 3 | Canvas, Blackboard |
| 10 | [Fitness OS](industries/fitness-os/) | ✅ Complete | 1 | 1 | Mindbody, Glofox |
| 11 | [Beauty OS](industries/beauty-os/) | ✅ Complete | 1 | 1 | Square, Vagaro |
| 12 | [Professional OS](industries/professional-os/) | ✅ Complete | 1 | 1 | HubSpot, Salesforce |
| 13 | [Manufacturing OS](industries/manufacturing-os/) | ✅ Complete | 1 | 1 | SAP, Oracle |
| 14 | [Travel OS](industries/travel-os/) | ✅ Complete | 1 | 1 | Amadeus, Sabre |
| 15 | [Government OS](industries/government-os/) | ✅ Complete | 1 | 1 | Salesforce Gov |
| 16 | [Non-Profit OS](industries/nonprofit-os/) | ✅ Complete | 1 | 1 | Salesforce NPO |
| 17 | [Agriculture OS](industries/agriculture-os/) | ✅ Complete | 1 | 1 | SAP Agriculture |
| 18 | [Fashion OS](industries/fashion-os/) | ✅ Complete | 1 | 1 | Shopify, Magento |
| 19 | [Sports OS](industries/sports-os/) | ✅ Complete | 1 | 1 | Ticketmaster |
| 20 | [Gaming OS](industries/gaming-os/) | ✅ Complete | 1 | 1 | Steam, Epic |
| 21 | [Construction OS](industries/construction-os/) | ✅ Complete | 1 | 1 | Procore, Autodesk |
| 22 | [Automotive OS](industries/automotive-os/) | ✅ Complete | 1 | 1 | CDK, Reynolds |
| 23 | [Home Services OS](industries/homeservices-os/) | ✅ Complete | 1 | 1 | Jobber, Housecall |
| 24 | [Entertainment OS](industries/entertainment-os/) | ✅ Complete | 2 | 1 | Event Platforms |

---

## 🏛️ Core Platform

### API Gateway
Unified entry point for all services with authentication, rate limiting, and routing.

- **Port:** 3000
- **Location:** [core/api-gateway/](core/api-gateway/)

### TwinOS Hub
Unified digital twin registry connecting all 113 twins across 24 industries.

- **Port:** 4000
- **Location:** [core/twinos-hub/](core/twinos-hub/)

### AgentOS Hub
Orchestration layer for 121+ AI agents across all industries.

- **Port:** 4001
- **Location:** [core/agentos-hub/](core/agentos-hub/)

### Agent Framework
Shared foundation for all AI agents with BaseAgent, ToolRegistry, and Orchestrator.

- **Location:** [core/agent-framework/](core/agent-framework/)

### Business Copilot
Natural language interface with 120+ industry-specific skills across 24 industries.

- **Port:** 4002
- **Location:** [core/business-copilot/](core/business-copilot/)

### REZ CRM Connector
Unified CRM integration supporting HubSpot, Salesforce, Zoho, and industry-specific CRMs.

- **Port:** 4003
- **Location:** [core/rez-crm-connector/](core/rez-crm-connector/)

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RTMN Industry OS                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ Hotel  │ │Restaurant│ │ Retail │ │Healthcare│ │ RealEst │  ...    │
│  │  OS    │ │   OS   │ │   OS   │ │   OS   │ │   OS   │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌──────────────┐  │
│  │    TwinOS Hub       │ │    AgentOS Hub      │ │Business      │  │
│  │    (113 Twins)     │ │   (121+ Agents)     │ │Copilot       │  │
│  └─────────────────────┘ └─────────────────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    REZ CRM Integration                        │  │
│  │         HubSpot • Zoho • Salesforce • Industry CRM           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+, Python 3.11+ |
| Database | MongoDB 7.0, Redis 7 |
| API | REST, GraphQL, gRPC |
| Messaging | Apache Kafka |
| AI/ML | OpenAI GPT-4, TensorFlow |
| Container | Docker, Kubernetes |
| CI/CD | GitHub Actions |

---

## 📁 Project Structure

```
RTMN/
├── core/                   # Core platform modules
│   ├── api-gateway/        # API Gateway (port 3000)
│   ├── twinos-hub/         # TwinOS Hub (113 twins, port 4000)
│   ├── agentos-hub/        # AgentOS Hub (121+ agents, port 4001)
│   ├── agent-framework/    # Agent Base Framework
│   ├── business-copilot/   # Business Copilot (120+ skills, port 4002)
│   └── rez-crm-connector/  # REZ CRM Connector (port 4003)
├── industries/             # 24 Industry OS platforms
│   ├── legal-os/          # Legal OS
│   ├── healthcare-os/      # Healthcare OS
│   ├── finance-os/         # Finance OS
│   ├── retail-os/          # Retail OS
│   ├── education-os/       # Education OS
│   ├── manufacturing-os/   # Manufacturing OS
│   ├── realestate-os/      # Real Estate OS
│   ├── travel-os/          # Travel OS
│   ├── restaurant-os/      # Restaurant OS
│   ├── fitness-os/         # Fitness OS
│   ├── automotive-os/      # Automotive OS
│   ├── entertainment-os/   # Entertainment OS
│   ├── gaming-os/          # Gaming OS
│   ├── agriculture-os/     # Agriculture OS
│   ├── construction-os/    # Construction OS
│   ├── beauty-os/          # Beauty OS
│   ├── fashion-os/         # Fashion OS
│   ├── sports-os/          # Sports OS
│   ├── government-os/      # Government OS
│   ├── homeservices-os/    # Home Services OS
│   ├── professional-os/    # Professional Services OS
│   ├── nonprofit-os/       # Non-Profit OS
│   ├── media-os/           # Media OS
│   └── energy-os/          # Energy OS
├── deployment/             # Deployment configurations
│   └── nginx/              # Nginx configuration
├── docker-compose.yml      # Docker Compose setup
├── Dockerfile              # Root Dockerfile
├── .env.example            # Environment template
└── README.md               # This file
```

---

## 🚢 Deployment

### Docker Compose (All-in-One)
```bash
# Start all core services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Individual Service
```bash
# Start specific service
docker-compose up -d api-gateway

# Start specific industry
docker-compose up -d legal-os
```

### Kubernetes
```bash
kubectl apply -f deployment/kubernetes/
```

### Quick Health Check
```bash
curl http://localhost:3000/health  # API Gateway
curl http://localhost:4000/health  # TwinOS Hub
curl http://localhost:4001/health  # AgentOS Hub
curl http://localhost:4002/health  # Business Copilot
curl http://localhost:4003/health  # REZ CRM
```

---

## 🔌 REZ CRM Integration

All 24 industries connect to **REZ CRM** for unified customer management:

| Industry | Primary CRM | Secondary |
|----------|------------|-----------|
| Hotel | HubSpot | Opera PMS |
| Restaurant | Toast | Square |
| Retail | Shopify | WooCommerce |
| Healthcare | Epic | Cerner |
| Real Estate | HubSpot | Salesforce |
| Legal | Clio | Practice Mgmt |
| Financial | Core Banking | SAP |
| Travel | Amadeus | Sabre |
| Government | Salesforce Gov | - |
| Non-Profit | Salesforce NPO | - |

---

## 📈 Key Metrics

| Metric | Count |
|--------|-------|
| Industries | 24 |
| Digital Twins | 113+ |
| AI Agents | 121+ |
| API Endpoints | 500+ |
| CRM Integrations | 40+ |

---

## 🔗 Service Integration Architecture (Connect, Don't Copy)

**Pattern:** Service Mesh / Event-Driven  
**Philosophy:** Connect services via APIs instead of copying code

### Core Integration Hub

| Service | Port | Description |
|---------|------|-------------|
| **REZ-ecosystem-connector** | 4399 | Service Registry & Discovery |
| **REZ-event-bus** | 4510 | Pub/Sub Event Messaging |
| **REZ-integration-connector** | 4314 | Multi-service API Gateway |

### Integration Patterns

#### REST API (Synchronous)
```typescript
const response = await fetch('http://localhost:4330/api/manufacturing/orders', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Event Bus (Asynchronous)
```typescript
eventBus.publish('order.created', { orderId: 'MO-123' });
eventBus.subscribe('order.*', (event) => { /* handle */ });
```

### RABTUL Services Available

| Service | Port | Purpose |
|---------|------|---------|
| rez-auth-service | 4002 | Authentication |
| rez-wallet-service | 4004 | Payments |
| REZ-manufacturing-os | 4330 | Manufacturing |
| REZ-workflow-executor | TBD | Workflows |
| REZ-knowledge-search | TBD | RAG/Search |

### Full Documentation

See [RTNM-SERVICE-INTEGRATION-ARCHITECTURE.md](RTNM-SERVICE-INTEGRATION-ARCHITECTURE.md)

---

## 📚 Additional Documentation

- [Master Product Map](RTMN-24-INDUSTRY-PRODUCT-MAP.md)
- [CRM Integration Summary](RTNM-CRM-INTEGRATION-SUMMARY.md)
- [Architecture Visual](RTNM-ARCHITECTURE-VISUAL.md)
- [Implementation Roadmap](RTNM-IMPLEMENTATION-ROADMAP.md)
- [Port Registry](PORT-REGISTRY.md)
- [Industry Master Index](INDUSTRY-OS-MASTER-INDEX.md)
- [Service Integration Architecture](RTNM-SERVICE-INTEGRATION-ARCHITECTURE.md)
- [RTNM Companies Audit](RTNM-COMPANIES-AUDIT.md)
- [RTNM Products & Features Audit](RTNM-PRODUCTS-FEATURES-AUDIT.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create your industry feature branch
3. Implement services and agents following the Hotel OS pattern
4. Add REZ CRM integration
5. Submit pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for full contribution guidelines.

---

## 📋 Client-Ready Documentation

This repository contains the **documentation hub** for RTMN. All code lives in company-specific repositories under `companies/`.

### For Clients & Prospects

| Document | Purpose |
|----------|---------|
| [PRICING.md](PRICING.md) | Pricing plans and billing |
| [TERMS.md](TERMS.md) | Terms of Service |
| [PRIVACY.md](PRIVACY.md) | Privacy Policy |
| [DPA.md](DPA.md) | Data Processing Agreement |
| [COOKIES.md](COOKIES.md) | Cookie Policy |
| [SUPPORT.md](SUPPORT.md) | Support options and SLAs |
| [CLIENT-ONBOARDING.md](CLIENT-ONBOARDING.md) | Client onboarding guide |
| [API-KEY-MANAGEMENT.md](API-KEY-MANAGEMENT.md) | API key setup and security |
| [ROI-CALCULATOR.md](ROI-CALCULATOR.md) | ROI calculation for proposals |
| [DEMO-SCRIPT.md](DEMO-SCRIPT.md) | BrandPulse demo script |
| [docs/getting-started/QUICKSTART.md](docs/getting-started/QUICKSTART.md) | 5-minute quick start |
| [docs/tutorials/BRAND-DASHBOARD.md](docs/tutorials/BRAND-DASHBOARD.md) | Build your first dashboard |
| [docs/tutorials/SENTIMENT-ALERTS.md](docs/tutorials/SENTIMENT-ALERTS.md) | Set up alerts |
| [docs/tutorials/CONNECT-SOURCES.md](docs/tutorials/CONNECT-SOURCES.md) | Connect review sources |

### For Operations & DevOps

| Document | Purpose |
|----------|---------|
| [SECURITY.md](SECURITY.md) | Security policy and practices |
| [STATUS-PAGE.md](STATUS-PAGE.md) | Service status and SLA credits |
| [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md) | Incident response playbook |
| [RUNBOOK.md](RUNBOOK.md) | Operations runbook |
| [MONITORING.md](MONITORING.md) | Monitoring and observability |
| [docs/deploy/PRODUCTION.md](docs/deploy/PRODUCTION.md) | Production deployment guide |
| [docs/compliance/GDPR.md](docs/compliance/GDPR.md) | GDPR compliance guide |
| [docs/compliance/SOC2.md](docs/compliance/SOC2.md) | SOC 2 readiness |
| [docs/compliance/DATA-CLASSIFICATION.md](docs/compliance/DATA-CLASSIFICATION.md) | Data classification |

### For Sales & Marketing

| Document | Purpose |
|----------|---------|
| [PITCH-DECK.md](PITCH-DECK.md) | Sales pitch deck |
| [PROPOSAL-TEMPLATE.md](PROPOSAL-TEMPLATE.md) | Proposal template |
| [CASE-STUDY-TEMPLATE.md](CASE-STUDY-TEMPLATE.md) | Case study template |
| [ROI-CALCULATOR.md](ROI-CALCULATOR.md) | ROI calculator |
| [BILLING.md](BILLING.md) | Billing and payments |
| [SUB-PROCESSORS.md](SUB-PROCESSORS.md) | Sub-processor list |

### For Developers

| Document | Purpose |
|----------|---------|
| [docs/SITE-INDEX.md](docs/SITE-INDEX.md) | Documentation index |
| [docs/api-reference/OVERVIEW.md](docs/api-reference/OVERVIEW.md) | API reference |
| [docs/getting-started/CORE-CONCEPTS.md](docs/getting-started/CORE-CONCEPTS.md) | Core concepts |
| [docs/tutorials/HOTEL-INTEGRATION.md](docs/tutorials/HOTEL-INTEGRATION.md) | Hotel OS integration |
| [docs/tutorials/CUSTOM-WORKFLOW.md](docs/tutorials/CUSTOM-WORKFLOW.md) | Custom workflows |
| [PORT-REGISTRY.md](PORT-REGISTRY.md) | Port assignments |
| [RTNM-COMPANIES-AUDIT.md](RTNM-COMPANIES-AUDIT.md) | Company registry |
| [RTNM-PRODUCTS-FEATURES-AUDIT.md](RTNM-PRODUCTS-FEATURES-AUDIT.md) | Product features |

### For Community

| Document | Purpose |
|----------|---------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community code of conduct |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [CLAUDE.md](CLAUDE.md) | Developer guide |

---

## 📄 License

Proprietary - RTMN Group. See [LICENSE](LICENSE) for details.

---

**Built with ❤️ for the Industry OS Ecosystem**
