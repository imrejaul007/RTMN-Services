# RTMZ Monitoring Dashboard

Real-time monitoring for the RTMZ ecosystem.

## Features

- **Service Health Monitoring**: Track all services in real-time
- **Auto-refresh**: Automatic updates every 30 seconds
- **Auth Service Status**: Monitor JWT/SSO services
- **Business Service Status**: Track API and ML services
- **MCP Server Status**: Monitor all 16 AI agent tools
- **Quick Links**: Prometheus, Grafana, and API access

## Services Monitored

### Auth Services
- REZ Auth (4002) - JWT/OTP/TOTP authentication
- REZ SSO (4003) - OAuth2 enterprise SSO

### Business Services
- GraphQL Gateway (5000) - Unified API
- AutoML Pipeline (5001) - ML automation
- Invoice OCR (5002) - Document processing
- Contract Management (5003) - E-signatures
- Legal Document AI (5004) - Legal analysis
- Cosmic Twin (5005) - Digital twin
- Ranking Service (5006) - ML ranking

### MCP Servers
- 16 MCP tool servers (ports 3100-3115)
- Analytics, Identity, Event Bus, Notification
- Order, Payment, Inventory, Logs
- Service Discovery, Agent Invoke
- AutoML, Invoice, Contracts, Legal, Cosmic Twin, Ranking

### Monitoring Stack
- Prometheus (9090) - Metrics collection
- Grafana (3030) - Visualization

## Running

```bash
# Development
cd apps/monitoring
npm install
npm run dev

# Production (Docker)
docker-compose up -d dashboard
```

## Access

- Dashboard: http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3030 (admin/admin)