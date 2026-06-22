# Hojai AI - Deployment Guide

## Quick Start

```bash
cd hojai-ai
./deploy/start.sh
```

## Services

| Service | Port | Status |
|---------|------|---------|
| API Gateway | 4500 | ✅ |
| Governance | 4501 | ✅ |
| Event | 4510 | ✅ |
| Memory | 4520 | ✅ |
| Intelligence | 4530 | ✅ |
| Agents | 4550 | ✅ |
| Workflows | 4560 | ✅ |
| Communications | 4570 | ✅ |
| Hyperlocal | 4580 | ✅ |
| Data | 4590 | ✅ |
| Identity | 4600 | ✅ |
| Analytics | 4610 | ✅ |
| Industry | 4700 | ✅ |

## Products

| Product | Status |
|---------|--------|
| Admin Panel | ✅ |
| Monitoring | ✅ |
| Consent UI | ✅ |
| Governance UI | ✅ |
| WhatsApp AI | ✅ |
| Merchant AI | ✅ |

## Health Check

```bash
curl localhost:4500/health
```

## Stop

```bash
docker compose down
```
