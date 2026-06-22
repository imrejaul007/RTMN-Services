# RTMN Documentation

**Welcome to RTMN** — the operating system for every industry.

---

## Quick Navigation

### Getting Started
- [Quick Start](getting-started/QUICKSTART.md) — Up and running in 5 minutes
- [Installation](getting-started/INSTALLATION.md) — Install the SDK
- [First Integration](getting-started/FIRST-INTEGRATION.md) — Your first API call
- [Core Concepts](getting-started/CORE-CONCEPTS.md) — Key terms and architecture

### Products
- [BrandPulse](products/BRANDPULSE.md) — Brand intelligence & sentiment analysis
- [Hotel OS](products/HOTEL-OS.md) — Hotel management platform
- [Restaurant OS](products/RESTAURANT-OS.md) — Restaurant management platform
- [Healthcare OS](products/HEALTHCARE-OS.md) — Healthcare management platform
- [All Products](products/INDEX.md) — Complete product catalog

### API Reference
- [Overview](api-reference/OVERVIEW.md) — API basics, authentication, rate limits
- [BrandPulse API](api-reference/BRANDPULSE-API.md) — BrandPulse endpoints
- [Hotel OS API](api-reference/HOTEL-OS-API.md) — Hotel OS endpoints
- [Foundation Services](api-reference/FOUNDATION-SERVICES.md) — CorpID, MemoryOS, GoalOS
- [RTNM SDK](api-reference/RTNM-SDK.md) — TypeScript & Python SDKs
- [Webhooks](api-reference/WEBHOOKS.md) — Real-time event handling
- [OpenAPI Spec](api-reference/OPENAPI.md) — Auto-generated API docs

### Tutorials
- [Build Your First Brand Dashboard](tutorials/BRAND-DASHBOARD.md)
- [Connect Review Sources](tutorials/CONNECT-SOURCES.md)
- [Set Up Sentiment Alerts](tutorials/SENTIMENT-ALERTS.md)
- [Integrate with Hotel OS](tutorials/HOTEL-INTEGRATION.md)
- [Build a Custom Workflow](tutorials/CUSTOM-WORKFLOW.md)

### Concepts
- [Digital Twins](concepts/DIGITAL-TWINS.md) — What they are, how they work
- [RTNM SDK](concepts/RTNM-SDK.md) — Unified SDK architecture
- [Agent Economy](concepts/AGENT-ECONOMY.md) — Karma, payments, agent marketplace
- [SUTAR OS](sutar-os/README.md) — Autonomous economic infrastructure
- [Event Bus](concepts/EVENT-BUS.md) — Real-time event streaming

### Deployment
- [Production Deployment](deploy/PRODUCTION.md) — Deploy to production
- [Environments](deploy/ENVIRONMENTS.md) — Dev, staging, production
- [Docker](deploy/DOCKER.md) — Container deployment
- [Kubernetes](deploy/KUBERNETES.md) — K8s deployment
- [Monitoring](deploy/MONITORING.md) — Set up observability
- [Backup & DR](deploy/BACKUP-DR.md) — Disaster recovery

### Compliance
- [GDPR](compliance/GDPR.md) — GDPR compliance guide
- [SOC 2](compliance/SOC2.md) — SOC 2 readiness
- [Data Classification](compliance/DATA-CLASSIFICATION.md) — Data handling
- [Security](compliance/SECURITY.md) — Security practices

### Resources
- [Status Page](https://status.rtmn.io) — Service status
- [Changelog](CHANGELOG.md) — What's new
- [Roadmap](docs/roadmap/ROADMAP.md) — What's coming next
- [Support](SUPPORT.md) — Get help

---

## Popular Topics

| Topic | Description |
|-------|-------------|
| [Authentication](api-reference/OVERVIEW.md#authentication) | API keys, OAuth, JWT |
| [Rate Limits](api-reference/OVERVIEW.md#rate-limits) | Request limits and retry logic |
| [Pagination](api-reference/OVERVIEW.md#pagination) | Cursor-based pagination |
| [Error Handling](api-reference/OVERVIEW.md#errors) | Error codes and handling |
| [Webhooks](api-reference/WEBHOOKS.md) | Real-time events |
| [Digital Twins](concepts/DIGITAL-TWINS.md) | 35+ digital twin types |
| [RTNM SDK](concepts/RTNM-SDK.md) | Multi-language SDK |

---

## Code Examples

### TypeScript

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

const brands = await rtmn.brands.list();
console.log(brands);
```

### Python

```python
from rtmn import RTMNClient

rtmn = RTMNClient(api_key=os.environ['RTMN_API_KEY'])
brands = rtmn.brands.list()
print(brands)
```

### cURL

```bash
curl https://api.rtmn.io/api/v1/brands \
  -H "Authorization: Bearer rtmn_prod_xxxxx"
```

---

## System Status

| Service | Status |
|---------|--------|
| API | 🟢 Operational |
| Dashboard | 🟢 Operational |
| BrandPulse | 🟢 Operational |
| Hotel OS | 🟢 Operational |
| Foundation Services | 🟢 Operational |

[Check full status →](https://status.rtmn.io)

---

## Need Help?

- **Documentation:** docs.rtmn.io
- **Support:** support@rtmn.com
- **Status:** status.rtmn.io
- **GitHub:** github.com/rtmn-group (TBD)

---

*Last updated: June 15, 2026*
