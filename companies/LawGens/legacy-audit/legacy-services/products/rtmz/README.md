# RTMZ - AI-Powered Business Operating System

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Docker](https://img.shields.io/badge/docker-ready-blue)

RTMZ is an AI-native platform for businesses combining agents, intelligence, and automation. Built for the AI-first era with **34 microservices** including comprehensive forensic intelligence capabilities.

## 🚀 Quick Start

### One-Command Deploy

```bash
git clone https://github.com/imrejaul007/rtmz && cd rtmz/infra && ./deploy.sh
```

### Manual Deploy

```bash
git clone https://github.com/imrejaul007/rtmz
cd rtmz/infra
docker-compose -f docker-compose.prod.yml up -d --build
```

### Verify Deployment

```bash
./verify-deployment.sh
# Or manually:
curl http://localhost:4002/health   # Auth
curl http://localhost:5000/health   # GraphQL
curl http://localhost:5100/health   # Forensics Gateway
```

## 📦 Services

### Auth Services
| Port | Service | Description |
|------|---------|-------------|
| 4002 | REZ Auth | JWT/OTP/TOTP authentication |
| 4003 | REZ SSO | OAuth2 SSO (Okta, Google) |

### Business Services
| Port | Service | Description |
|------|---------|-------------|
| 5000 | GraphQL Gateway | Unified GraphQL API |
| 5001 | AutoML Pipeline | ML automation |
| 5002 | Invoice OCR | Document processing |
| 5003 | Contract Management | E-signatures |
| 5004 | Legal Document AI | Legal analysis |
| 5005 | Cosmic Twin | Digital twin |
| 5006 | Ranking Service | ML ranking |
| 5100 | Forensics Gateway | Unified forensics orchestration |

### MCP Servers - Business (16)
| Port | Server | Description |
|------|--------|-------------|
| 3100 | Analytics | Metrics and analytics |
| 3101 | Identity | User identity |
| 3102 | Event Bus | Pub/sub events |
| 3103 | Notification | Email/SMS/Push |
| 3104 | Order | Order management |
| 3105 | Payment | Payment processing |
| 3106 | Inventory | Inventory tracking |
| 3107 | Logs | Centralized logging |
| 3108 | Service Discovery | Service registry |
| 3109 | Agent Invoke | Cross-service orchestration |
| 3110 | AutoML | ML pipeline control |
| 3111 | Invoice | Invoice OCR |
| 3112 | Contracts | Contract management |
| 3113 | Legal | Legal document AI |
| 3114 | Cosmic Twin | Digital twin control |
| 3115 | Ranking | ML ranking control |

### MCP Servers - Forensics (8)
| Port | Server | Description |
|------|--------|-------------|
| 3120 | Evidence Ingestion | WhatsApp, Email, CCTV import |
| 3121 | Deepfake Detector | AI content, voice cloning |
| 3122 | Chain of Custody | Legal evidence tracking |
| 3123 | Digital Forensics | Disk imaging, mobile |
| 3130 | Social Intelligence | OSINT, contact network |
| 3131 | Financial Forensics | Invoice, fraud detection |
| 3132 | Location Intelligence | GPS, cell tower, IP |
| 3133 | Expert Reports | Court-ready reports |

### Monitoring
| Port | Service | Description |
|------|---------|-------------|
| 3000 | Dashboard | Web dashboard + Investigation Workspace |
| 3030 | Grafana | Metrics visualization |
| 9090 | Prometheus | Metrics collection |
| 9093 | Alertmanager | Alert routing |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Clients                                              │
│              (Web, Mobile, AI Agents, Investigators)                     │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────────────────┐
│              GraphQL Gateway (5000)                                      │
│                  Auth Middleware                                          │
└────┬─────────────────────────────────────────────────┬──────────────────┘
     │                                                 │
┌────▼────────────┐  ┌────────────┐  ┌─────────────────▼─────────────────┐
│ Auth Services   │  │ Business   │  │    MCP Servers (AI Agent Tools)    │
│ ┌─────────────┐│  │ Services   │  │                                   │
│ │REZ Auth 4002││  │            │  │   Business MCPs: 3100-3115        │
│ │REZ SSO  4003││  │ 5001-5006  │  │   Forensics MCPs: 3120-3123      │
│ └─────────────┘│  │            │  │                3130-3133          │
└─────────────────┘  └────────────┘  └───────────────────────────────────┘
                            │
                     ┌──────▼──────┐
                     │ Forensics   │
                     │ Gateway     │
                     │ (5100)      │
                     └─────────────┘
                            │
┌─────────────────────────────────────────────────────────────────────────┐
│                  Infrastructure                                             │
│              MongoDB          Redis                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔍 Investigation Workspace

RTMZ includes a comprehensive investigation workspace for forensic intelligence:

```bash
# Open dashboard with investigation tools
open http://localhost:3000
```

### Features:
- Investigation form with case search
- Tabbed interface: Evidence, Deepfake, OSINT, Financial, Location, Chain of Custody, Reports
- Quick access to all 8 forensic MCP tools
- Real-time service health monitoring
- Stats: Total Cases, Active Investigations, Evidence Items, Reports

## 📁 Project Structure

```
rtmz/
├── apps/
│   ├── services/              # 10 microservices
│   │   ├── rez-auth-service/        # Authentication (4002)
│   │   ├── REZ-sso-service/        # SSO/OAuth (4003)
│   │   ├── REZ-graphql-federation/ # API Gateway (5000)
│   │   ├── REZ-automl-pipeline/    # ML Automation (5001)
│   │   ├── REZ-invoice-ocr/        # Document OCR (5002)
│   │   ├── REZ-contract-management/ # Contracts (5003)
│   │   ├── REZ-legal-document-ai/  # Legal AI (5004)
│   │   ├── REZ-cosmic-twin/       # Digital Twin (5005)
│   │   ├── REZ-ranking-service/    # ML Ranking (5006)
│   │   └── REZ-forensics-gateway/  # Forensics Orchestration (5100)
│   ├── mcp/                   # 24 MCP tool servers
│   │   # Business MCPs (16)
│   │   ├── rez-mcp-analytics/         # (3100)
│   │   ├── rez-mcp-identity/          # (3101)
│   │   ├── rez-mcp-event-bus/         # (3102)
│   │   ├── rez-mcp-notification/      # (3103)
│   │   ├── rez-mcp-order/             # (3104)
│   │   ├── rez-mcp-payment/           # (3105)
│   │   ├── rez-mcp-inventory/         # (3106)
│   │   ├── rez-mcp-logs/              # (3107)
│   │   ├── rez-mcp-service-discovery/ # (3108)
│   │   ├── rez-mcp-agent-invoke/      # (3109)
│   │   ├── rez-mcp-automl/            # (3110)
│   │   ├── rez-mcp-invoice/           # (3111)
│   │   ├── rez-mcp-contracts/         # (3112)
│   │   ├── rez-mcp-legal/             # (3113)
│   │   ├── rez-mcp-cosmic-twin/       # (3114)
│   │   └── rez-mcp-ranking/            # (3115)
│   │   # Forensics MCPs (8)
│   │   ├── rez-mcp-evidence-ingestion/     # (3120)
│   │   ├── rez-mcp-deepfake-detector/      # (3121)
│   │   ├── rez-mcp-chain-of-custody/       # (3122)
│   │   ├── rez-mcp-digital-forensics/       # (3123)
│   │   ├── rez-mcp-social-intelligence/    # (3130)
│   │   ├── rez-mcp-financial-forensics/    # (3131)
│   │   ├── rez-mcp-location-intelligence/   # (3132)
│   │   └── rez-mcp-expert-reports/         # (3133)
│   └── monitoring/            # Dashboard + Investigation Workspace (3000)
├── packages/
│   ├── shared/                # @rtmz/shared - Shared types
│   │   └── types/
│   │       ├── api.ts
│   │       ├── health.ts
│   │       ├── errors.ts
│   │       └── forensics.ts    # Investigation, Evidence, Deepfake types
│   └── sdk/                   # @rtmz/sdk - TypeScript SDK
│       ├── index.ts           # Main client + auth/business methods
│       └── forensics.ts       # ForensicsClient for investigation workflows
├── infra/
│   ├── docker-compose.prod.yml      # Production (34 services)
│   ├── docker-compose.dev.yml       # Development
│   ├── docker-compose.monitoring.yml # Prometheus/Grafana
│   ├── prometheus.yml              # Metrics (includes forensics)
│   ├── deploy.sh                   # Deployment script
│   └── verify-deployment.sh         # Health checks
├── docs/
│   ├── openapi/                    # API specifications
│   │   ├── forensics-gateway.yaml  # Forensics gateway spec
│   │   └── ...
│   └── runbooks/                   # Operational runbooks
├── ci/
│   ├── integration/
│   │   └── forensics.test.ts       # Forensics MCP integration tests
│   └── workflows/                  # GitHub Actions
│       └── forensics-integration.yml
└── .github/workflows/              # CI/CD pipelines
```

## 🔐 Authentication

RTMZ uses JWT-based authentication with role-scoped secrets.

### Login Flow

```bash
# Get token
curl -X POST http://localhost:4002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token
curl -H "Authorization: Bearer <token>" http://localhost:5000/graphql
```

### OAuth2 SSO

Supports Okta and Google OAuth for enterprise SSO.

## 🔬 Forensics API

### Start Investigation (via REST)

```bash
curl -X POST http://localhost:5100/api/investigation \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fraud Investigation",
    "query": "investigate@email.com",
    "type": "full",
    "priority": "high"
  }'
```

### Start Investigation (via GraphQL)

```bash
curl -X POST http://localhost:5000/graphql \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "mutation {
      runFullInvestigation(
        query: \"investigate@email.com\"
        priority: high
      ) {
        investigationId
        status
      }
    }"
  }'
```

### Generate Expert Report

```bash
curl -X POST http://localhost:5100/api/report/generate \
  -H "Content-Type: application/json" \
  -d '{
    "investigationId": "inv_abc123",
    "type": "final",
    "format": "pdf"
  }'
```

## 🛠️ Development

### Local Development

```bash
# Clone and install
git clone https://github.com/imrejaul007/rtmz
cd rtmz
npm install

# Run all services
npm run dev

# Run specific service
cd apps/services/REZ-graphql-federation
npm run dev
```

### Run with Docker

```bash
# Full stack
cd infra
docker-compose -f docker-compose.prod.yml up -d

# With monitoring
docker-compose -f docker-compose.prod.yml \
                -f docker-compose.monitoring.yml up -d
```

### Environment Variables

```bash
# Auth
JWT_SECRET=your-jwt-secret
INTERNAL_SERVICE_TOKENS={"service":"token"}

# Database
MONGODB_URI=mongodb://localhost:27017/rtmz
REDIS_URL=redis://localhost:6379

# AI Services
ANTHROPIC_API_KEY=sk-ant-...

# OAuth (optional)
OKTA_CLIENT_ID=
GOOGLE_CLIENT_ID=

# Forensics MCP URLs
MCP_EVIDENCE_URL=http://localhost:3120
MCP_DEEPFAKE_URL=http://localhost:3121
MCP_CUSTODY_URL=http://localhost:3122
MCP_FORENSICS_URL=http://localhost:3123
MCP_SOCIAL_URL=http://localhost:3130
MCP_FINANCIAL_URL=http://localhost:3131
MCP_LOCATION_URL=http://localhost:3132
MCP_REPORTS_URL=http://localhost:3133
```

## 📊 Monitoring

### Dashboard

```bash
# Open web dashboard with investigation workspace
open http://localhost:3000
```

### Prometheus

```bash
# View metrics
open http://localhost:9090
```

### Grafana

```bash
# Open Grafana
open http://localhost:3030
# Default: admin/admin
```

### Forensics Health Checks

```bash
curl http://localhost:3120/health  # Evidence
curl http://localhost:3121/health  # Deepfake
curl http://localhost:3122/health  # Custody
curl http://localhost:3123/health  # Forensics
curl http://localhost:3130/health  # Social
curl http://localhost:3131/health  # Financial
curl http://localhost:3132/health  # Location
curl http://localhost:3133/health  # Reports
curl http://localhost:5100/health  # Gateway
```

## 🔧 Configuration

### Scale Services

```bash
# Scale to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale automl=3
```

### Add Custom OAuth Provider

1. Configure provider credentials in environment
2. Restart REZ SSO service
3. Test SSO flow

## 📚 Documentation

- [DEPLOYMENT.md](./infra/DEPLOYMENT.md) - Complete deployment guide
- [docs/runbooks/OPERATIONS.md](./docs/runbooks/OPERATIONS.md) - Operations manual
- [docs/runbooks/TROUBLESHOOTING.md](./docs/runbooks/TROUBLESHOOTING.md) - Troubleshooting
- [docs/openapi/forensics-gateway.yaml](docs/openapi/forensics-gateway.yaml) - Forensics API spec
- [infra/terraform/README.md](infra/terraform/README.md) - Cloud deployment
- [SPEC.md](SPEC.md) - System specification
- [CLAUDE.md](CLAUDE.md) - AI context for assistants
- [SOT.md](SOT.md) - State of things

## 🚢 Deployment Options

### Docker Compose (Recommended for Dev/Testing)

```bash
cd infra
docker-compose -f docker-compose.prod.yml up -d
```

### Docker Compose + Monitoring

```bash
docker-compose -f docker-compose.prod.yml \
                -f docker-compose.monitoring.yml up -d
```

### Kubernetes

```bash
kubectl apply -f infra/k8s/
```

### Terraform (AWS)

```bash
cd infra/terraform
terraform init
terraform apply
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run forensics integration tests
npx jest ci/integration/forensics.test.ts

# Run specific service tests
cd apps/services/REZ-graphql-federation
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Built With

- Node.js 20
- TypeScript
- Docker
- MongoDB
- Redis
- GraphQL
- MCP (Model Context Protocol)
- Prometheus & Grafana

---

Built with ❤️ for the AI-native future
