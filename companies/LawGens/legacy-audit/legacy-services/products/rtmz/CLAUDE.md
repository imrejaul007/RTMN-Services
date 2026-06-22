# RTMZ - Context for AI Assistants

## What is RTMZ?

RTMZ (Real-Time Management eXtended) is an AI-powered business operating system built on microservices architecture. It's designed for:

- **Real-time intelligence** - Live data processing and analysis
- **AI Agent orchestration** - 24 MCP (Model Context Protocol) servers for AI tools
- **Enterprise automation** - Business workflows and ML pipelines
- **Forensic intelligence** - Evidence management and investigation support

## Repository Structure

```
rtmz/
├── apps/
│   ├── services/           # 10 business microservices
│   │   ├── rez-auth-service/         # JWT/OTP/TOTP auth (port 4002)
│   │   ├── REZ-sso-service/          # OAuth2/SSO (port 4003)
│   │   ├── REZ-graphql-federation/   # GraphQL API gateway (port 5000)
│   │   ├── REZ-automl-pipeline/      # ML automation (port 5001)
│   │   ├── REZ-invoice-ocr/          # Document OCR (port 5002)
│   │   ├── REZ-contract-management/  # E-signatures (port 5003)
│   │   ├── REZ-legal-document-ai/     # Legal AI (port 5004)
│   │   ├── REZ-cosmic-twin/          # Digital twin (port 5005)
│   │   ├── REZ-ranking-service/       # ML ranking (port 5006)
│   │   └── REZ-forensics-gateway/    # Unified forensics orchestration (port 5100)
│   ├── mcp/                # 24 MCP tool servers for AI agents
│   │   # Business MCPs (16)
│   │   ├── rez-mcp-analytics/        # (3100)
│   │   ├── rez-mcp-identity/         # (3101)
│   │   ├── rez-mcp-event-bus/        # (3102)
│   │   ├── rez-mcp-notification/     # (3103)
│   │   ├── rez-mcp-order/            # (3104)
│   │   ├── rez-mcp-payment/          # (3105)
│   │   ├── rez-mcp-inventory/        # (3106)
│   │   ├── rez-mcp-logs/             # (3107)
│   │   ├── rez-mcp-service-discovery/ # (3108)
│   │   ├── rez-mcp-agent-invoke/     # (3109)
│   │   ├── rez-mcp-automl/           # (3110)
│   │   ├── rez-mcp-invoice/          # (3111)
│   │   ├── rez-mcp-contracts/        # (3112)
│   │   ├── rez-mcp-legal/            # (3113)
│   │   ├── rez-mcp-cosmic-twin/      # (3114)
│   │   └── rez-mcp-ranking/          # (3115)
│   │   # Forensics MCPs (8)
│   │   ├── rez-mcp-evidence-ingestion/   # (3120) WhatsApp, Email, CCTV
│   │   ├── rez-mcp-deepfake-detector/     # (3121) AI content detection
│   │   ├── rez-mcp-chain-of-custody/     # (3122) Legal evidence tracking
│   │   ├── rez-mcp-digital-forensics/    # (3123) Disk/mobile forensics
│   │   ├── rez-mcp-social-intelligence/  # (3130) OSINT, contact network
│   │   ├── rez-mcp-financial-forensics/  # (3131) Invoice, fraud detection
│   │   ├── rez-mcp-location-intelligence/ # (3132) GPS, cell tower, IP
│   │   └── rez-mcp-expert-reports/       # (3133) Court-ready reports
│   └── monitoring/          # Web dashboard (port 3000)
├── packages/
│   ├── sdk/                 # TypeScript SDK (@rtmz/sdk)
│   │   ├── index.ts         # Main client + auth/business methods
│   │   └── forensics.ts     # ForensicsClient for investigation workflows
│   └── shared/              # Shared types (@rtmz/shared)
│       ├── index.ts         # Main exports
│       └── types/
│           ├── api.ts       # Core API types
│           ├── health.ts     # Health check types
│           ├── errors.ts     # Error types
│           └── forensics.ts  # Investigation, evidence, deepfake, custody types
├── infra/
│   ├── docker-compose.prod.yml    # Production (all 34 services)
│   ├── docker-compose.dev.yml      # Development
│   ├── docker-compose.monitoring.yml # Prometheus/Grafana
│   ├── prometheus.yml             # Metrics (includes forensics MCPs)
│   ├── deploy.sh                  # Deployment script
│   └── verify-deployment.sh       # Health check script
├── docs/
│   ├── openapi/                   # API specifications
│   │   ├── forensics-gateway.yaml  # Forensics gateway API spec
│   │   └── ...                    # Other service specs
│   └── runbooks/                  # Operations guides
├── ci/
│   ├── integration/               # Integration tests
│   │   └── forensics.test.ts      # Forensics MCP tests
│   └── workflows/                 # GitHub Actions
│       └── forensics-integration.yml
└── .github/workflows/            # CI/CD pipelines
```

## Key Concepts

### Authentication

RTMZ uses layered authentication:

1. **User Auth** (port 4002): JWT tokens with OTP/TOTP support
2. **SSO** (port 4003): OAuth2 for Okta/Google enterprise login
3. **Service Auth**: Internal tokens for service-to-service calls

```
User → Login → JWT Token
User → JWT → GraphQL Gateway → Business Services
Service → Internal Token → Other Services
```

### MCP (Model Context Protocol)

MCP servers provide tools for AI agents. Each server:
- Exposes tools via HTTP or STDIO
- Has health endpoint at `/health`
- Can be called by AI agents (Claude, GPT, etc.)

Example MCP tool call:
```typescript
// Using MCP SDK
const result = await mcpClient.callTool({
  name: "analytics.get_metrics",
  arguments: { metric: "requests", period: "1h" }
});
```

### GraphQL Gateway

All services (including forensics) are accessible via unified GraphQL API (port 5000):

```graphql
# Investigation queries
query {
  investigation(id: "case-001") {
    id, title, status, results
  }
  forensicsTools {
    name, description, capabilities, mcpPort
  }
}

# Start cross-MCP investigation
mutation {
  runFullInvestigation(
    query: "investigate john@email.com"
    priority: high
  ) {
    investigationId
    status
  }
}
```

### Forensics Gateway

Unified orchestration service (port 5100) for 8 forensics MCPs:

| MCP | Port | Purpose |
|-----|------|---------|
| Evidence Ingestion | 3120 | WhatsApp, Email, CCTV import |
| Deepfake Detector | 3121 | AI content, voice cloning detection |
| Chain of Custody | 3122 | Legal-grade evidence tracking |
| Digital Forensics | 3123 | Disk imaging, mobile forensics |
| Social Intelligence | 3130 | OSINT, contact network analysis |
| Financial Forensics | 3131 | Invoice fraud, anomaly detection |
| Location Intelligence | 3132 | GPS, cell tower, IP geolocation |
| Expert Reports | 3133 | Court-ready PDF/HTML reports |

## SDK Usage

### Basic Client
```typescript
import { RTMZClient, createClient } from '@rtmz/sdk';

const client = createClient({
  apiUrl: 'http://localhost:5000',
  authUrl: 'http://localhost:4002'
});

await client.login('user@example.com', 'password');
```

### Forensics Client
```typescript
import { ForensicsClient, createForensicsClient } from '@rtmz/sdk';

const forensics = createForensicsClient({
  gatewayUrl: 'http://localhost:5100'
});

// Start investigation
const investigation = await forensics.startInvestigation({
  query: 'investigate@email.com',
  type: 'full',
  priority: 'high'
});

// Ingest evidence
const evidence = await forensics.ingestEvidence({
  type: 'email',
  filename: 'suspicious-email.eml',
  fileData: base64String,
  source: 'evidence-team'
});

// Analyze deepfake
const analysis = await forensics.analyzeDeepfake({
  fileId: 'video-001',
  fileType: 'video',
  analysisType: 'video'
});

// Generate expert report
const report = await forensics.generateReport(
  investigation.investigationId,
  'final',
  'pdf'
);
```

### Shared Types
```typescript
import {
  Investigation,
  InvestigationStatus,
  InvestigationPriority,
  Evidence,
  EvidenceType,
  DeepfakeAnalysis,
  DeepfakeVerdict,
  CustodyChain,
  FinancialAnalysis,
  SocialProfile,
  LocationData,
  ForensicsTool
} from '@rtmz/shared';
```

## Quick Commands

```bash
# Deploy production (all 34 services)
cd infra && docker-compose -f docker-compose.prod.yml up -d --build

# Deploy with monitoring
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d

# Verify deployment
./verify-deployment.sh

# Check forensics gateway
curl http://localhost:5100/health
curl http://localhost:5100/api/tools

# Check all forensics MCPs
curl http://localhost:3120/health  # Evidence
curl http://localhost:3121/health  # Deepfake
curl http://localhost:3122/health  # Custody
curl http://localhost:3123/health  # Forensics
curl http://localhost:3130/health  # Social
curl http://localhost:3131/health  # Financial
curl http://localhost:3132/health  # Location
curl http://localhost:3133/health  # Reports

# View logs
docker-compose -f docker-compose.prod.yml logs -f forensics-gateway

# Stop all
docker-compose -f docker-compose.prod.yml down
```

## Environment Variables

### Required
```bash
JWT_SECRET=your-secret-here
MONGODB_URI=mongodb://localhost:27017/rtmz
REDIS_URL=redis://localhost:6379
INTERNAL_SERVICE_TOKENS={"service":"token"}
```

### Forensics Specific
```bash
MCP_EVIDENCE_URL=http://localhost:3120
MCP_DEEPFAKE_URL=http://localhost:3121
MCP_CUSTODY_URL=http://localhost:3122
MCP_FORENSICS_URL=http://localhost:3123
MCP_SOCIAL_URL=http://localhost:3130
MCP_FINANCIAL_URL=http://localhost:3131
MCP_LOCATION_URL=http://localhost:3132
MCP_REPORTS_URL=http://localhost:3133
FORENSICS_GATEWAY_URL=http://localhost:5100
```

## Port Reference

| Port | Service | Type |
|------|---------|------|
| 3000 | Dashboard | Web UI |
| 3030 | Grafana | Monitoring |
| 4002 | REZ Auth | Auth API |
| 4003 | REZ SSO | OAuth2 |
| 5000 | GraphQL | API Gateway |
| 5001-5006 | Business Services | REST |
| 5100 | Forensics Gateway | REST |
| 9090 | Prometheus | Metrics |
| 9093 | Alertmanager | Alerts |
| 3100-3115 | Business MCPs | AI Tools |
| 3120-3123 | Forensics MCPs (P0) | Forensics |
| 3130-3133 | Forensics MCPs (P1) | Forensics |

## Adding New Services

### 1. Create service directory
```bash
mkdir apps/mcp/rez-mcp-new-service
cd apps/mcp/rez-mcp-new-service
```

### 2. Add package.json
```json
{
  "name": "rez-mcp-new-service",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  }
}
```

### 3. Add Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3XXX
CMD ["node", "dist/index.js"]
```

### 4. Add to docker-compose.prod.yml
```yaml
mcp-new-service:
  build: ../apps/mcp/rez-mcp-new-service
  ports:
    - "3XXX:3XXX"
  environment:
    - PORT=3XXX
```

### 5. Add to prometheus.yml
```yaml
- job_name: 'mcp-servers'
  static_configs:
    - targets: ['mcp-new-service:3XXX']
```

### 6. Add README.md
Include purpose, tools, environment variables.

### 7. Add GraphQL integration (if needed)
Add resolver in `apps/services/REZ-graphql-federation/src/schema/resolvers/`

### 8. Add SDK method (if needed)
Add client in `packages/sdk/src/`

### 9. Add shared types (if needed)
Add types in `packages/shared/src/types/`

## HOJAI Ecosystem

RTMZ is part of larger HOJAI ecosystem:

- **RTMZ**: Business operations, forensic intelligence
- **HOJAI**: Core AI platform (12 services)
- **REZ Intelligence**: Consumer/merchant AI (186+ services)
- **GENIE**: Personal AI (16 services)
- **RABTUL**: Legal/forensics specific services

See `/Users/rejaulkarim/Documents/hojai-ai/` for HOJAI core.

## Known Patterns

### Service Authentication

All services use `AUTH_SERVICE_URL` and `INTERNAL_SERVICE_TOKEN`:

```typescript
// Verify internal call
const token = req.headers['x-internal-token'];
if (token !== process.env.INTERNAL_SERVICE_TOKEN) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Health Endpoint

All services implement:

```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});
```

### MCP Tool Pattern

```typescript
import { Server } from '@modelcontextprotocol/sdk';

const server = new Server({
  name: 'rez-mcp-example',
  version: '1.0.0'
});

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [{
      name: 'example_tool',
      description: 'Does something',
      inputSchema: { type: 'object', properties: {} }
    }]
  };
});
```

## Common Issues

### Docker Build Fails
- Check Node version in Dockerfile (use `node:20-alpine`)
- Ensure `npm ci --omit=dev` runs before `npm run build`

### Service Can't Connect
- Verify same Docker network
- Check service name matches exactly
- Verify MongoDB/Redis are running

### Auth Errors
- Check JWT_SECRET matches across services
- Verify INTERNAL_SERVICE_TOKENS JSON format
- Ensure AUTH_SERVICE_URL is correct

### Forensics Gateway Issues
- Verify all 8 forensics MCPs are running
- Check MCP URLs in environment variables
- Review logs: `docker-compose logs forensics-gateway`

## Documentation

- **SPEC.md**: System specification, architecture, API contracts
- **README.md**: Deployment, quick start, full service list
- **SOT.md**: State of things, gap analysis, forensics details
- **docs/runbooks/OPERATIONS.md**: Operational procedures
- **docs/runbooks/TROUBLESHOOTING.md**: Common issues and solutions
- **docs/openapi/forensics-gateway.yaml**: Forensics API spec

## GitHub

https://github.com/imrejaul007/rtmz

## Version

Current: 1.0.0
Last Updated: June 2026
