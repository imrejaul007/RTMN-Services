# Nexha OS Runtime

> Self-hostable Nexha OS Docker bundle. Run a complete Nexha network node in minutes.

## TL;DR

```bash
git clone https://github.com/imrejaul007/nexha-os-runtime.git
cd nexha-os-runtime

# Quick start (Lite tier)
bash scripts/init.sh --tier lite

# Or Standard with all network services
bash scripts/init.sh --tier standard

# Join the federation
bash scripts/join-federation.sh
```

---

## What is this?

**Nexha OS Runtime** is the Docker distribution of Nexha OS — a self-hostable runtime that lets any business join the **Nexha Federation**: the autonomous business network powered by HOJAI AI, SUTAR OS, and RTMN infrastructure.

You get:
- **CorpID** — Universal identity (port 4702)
- **MemoryOS** — Multi-tier AI memory (port 4703)
- **TwinOS Hub** — Digital twins platform (port 4705)
- **SUTAR OS** (Standard/Enterprise) — Autonomous commerce engine
- **Nexha Network Services** (Enterprise) — Business directory, partner graph, commerce runtime
- **Prometheus + Grafana** (Enterprise) — Observability

## Tiers

| Tier | Services | RAM | Best For |
|------|----------|-----|---------|
| **Lite** | CorpID, MemoryOS, TwinOS, Gateway | ~1 GB | SMBs, test/dev |
| **Standard** | All Lite + SUTAR OS, Trust Engine, Contract OS, Negotiation, Economy OS, Directory, Partner Graph, Commerce | ~4 GB | Growing businesses |
| **Enterprise** | All Standard + CapabilityOS, ACP Messaging, Agent Marketplace, Mission Planner, Prometheus, Grafana | ~8 GB | Large networks |

## Requirements

- Docker 24.0+
- Docker Compose v2 (or `docker-compose` plugin)
- 1–8 GB RAM depending on tier
- Ports 4270, 4280, 4285–4288, 4291, 4292, 4294, 4295, 4340, 4250, 4360, 4362–4364, 4702, 4703, 4705, 5000, 4140, 9090, 3001 available

## Quick Start

### 1. Initialize

```bash
bash scripts/init.sh --tier standard
```

This creates directories, generates self-signed TLS certs (dev), writes `.env`, and starts containers.

### 2. Configure your identity

Edit `.env`:

```bash
NEXHA_NAME="Mumbai Steel Collective"
NEXHA_REGION=IN
NEXHA_PUBLIC_KEY="fp:abc123def456..."
NEXHA_CONTACT_EMAIL=ops@mumbai-steel.example
NEXHA_CATEGORIES='["manufacturing.steel","logistics"]'
```

### 3. Join the federation

```bash
bash scripts/join-federation.sh
```

You'll receive a Nexha ID. You're now a member of the federation as `observer` tier.

### 4. Verify health

```bash
bash scripts/health-check.sh

# Or watch mode:
bash scripts/health-check.sh --watch
```

## Docker Compose Profiles

```bash
# Lite (Foundation only)
docker compose --profile lite up -d

# Standard (Foundation + SUTAR + Network)
docker compose --profile standard up -d

# Enterprise (everything)
docker compose --profile enterprise up -d

# Stop
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v
```

## Environment Variables

See [`.env.example`](.env.example) for all configurable variables. Key ones:

| Variable | Default | Description |
|----------|---------|-------------|
| `FEDERATION_URL` | `https://federation.nexha.io` | Federation endpoint |
| `NEXHA_NAME` | — | Your Nexha's display name |
| `NEXHA_REGION` | — | ISO country code (IN, SG, US, etc.) |
| `NEXHA_PUBLIC_KEY` | — | Public key fingerprint for federation handshake |
| `NODE_ENV` | `development` | `production` for production deployments |

## Ports

| Port | Service | Tier |
|------|---------|------|
| 5002 | Nexha Gateway | All |
| 4702 | CorpID | All |
| 4703 | MemoryOS | All |
| 4705 | TwinOS Hub | All |
| 4140 | SUTAR Gateway | Standard+ |
| 4291 | Trust Engine | Standard+ |
| 4292 | Contract OS | Standard+ |
| 4295 | Negotiation Engine | Standard+ |
| 4294 | Economy OS | Standard+ |
| 4270 | CapabilityOS | Enterprise |
| 4280 | Supplier Network | Standard+ |
| 4285 | Distribution Network | Standard+ |
| 4286 | Pricing Network | Standard+ |
| 4287 | Trade Finance | Standard+ |
| 4288 | Warehouse Network | Standard+ |
| 4340 | ACP Messaging | Enterprise |
| 4250 | Agent Marketplace | Enterprise |
| 4360 | Business Directory | Standard+ |
| 4362 | Mission Planner | Enterprise |
| 4363 | Partner Graph | Standard+ |
| 4364 | Commerce Runtime | Standard+ |
| 9090 | Prometheus | Enterprise |
| 3001 | Grafana | Enterprise |

## Federation API

Once registered, your Nexha talks to `federation.nexha.io`:

```bash
# List all federation members
curl https://federation.nexha.io/api/v1/nexhas

# Browse by tier
curl https://federation.nexha.io/api/v1/nexhas?tier=founding

# Initiate a handshake
curl -X POST https://federation.nexha.io/api/v1/handshakes \
  -H 'Content-Type: application/json' \
  -d '{
    "initiatorId": "your-nexha-id",
    "targetId": "nexha-maya-collective",
    "terms": {
      "mutualCapabilities": ["manufacturing.steel"],
      "dataSharing": "aggregated",
      "paymentTerms": "standard"
    }
  }'

# Check federation health
curl https://federation.nexha.io/api/v1/federation/health

# View onboarding checklist
curl https://federation.nexha.io/api/v1/onboarding/checklist/your-nexha-id
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Replace self-signed TLS certs with real certificates
- [ ] Set `FEDERATION_OS_REQUIRE_AUTH=true` and configure JWT
- [ ] Set strong passwords in `.env`
- [ ] Configure reverse proxy (nginx/Caddy) with HTTPS
- [ ] Enable Prometheus/Grafana (Enterprise)
- [ ] Set up log aggregation
- [ ] Configure backup for `/data` volume

## Troubleshooting

**Containers won't start:**
```bash
docker compose logs <service-name>
```

**Ports already in use:**
```bash
# Find and kill the process using the port
lsof -i :5000
```

**Reset everything:**
```bash
docker compose down -v
rm -rf data logs certs .env
bash scripts/init.sh --tier standard
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Your Nexha OS Runtime               │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  nexha-gateway :5000  (public API)         │ │
│  └──────────────────┬─────────────────────────┘ │
│                     │                            │
│  ┌──────────────────┴─────────────────────────┐ │
│  │  Internal Service Mesh (172.28.x.x)         │ │
│  │                                            │ │
│  │  CorpID :4702  │ MemoryOS :4703           │ │
│  │  TwinOS  :4705  │ SUTAR Gateway :4140     │ │
│  │  Trust   :4291  │ Contract OS  :4292      │ │
│  │  Negotiate:4295 │ Economy OS   :4294       │ │
│  │  Supplier :4280  │ Distribution :4285      │ │
│  │  Pricing  :4286  │ TradeFinance :4287      │ │
│  │  Warehouse:4288  │ CapabilityOS :4270      │ │
│  │  Directory:4360  │ Partner Graph :4363      │ │
│  │  Commerce :4364  │ ACP Messaging :4340      │ │
│  │  Marketplace:4250 │ Mission Planr :4362     │ │
│  └────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────┘
                         │
                         ▼ federation.nexha.io
┌─────────────────────────────────────────────────┐
│           Nexha Federation (federation.nexha.io)│
│                                                  │
│  FederationOS :4273  │ 100+ Nexha nodes          │
│  Governance Policies │ Handshake registry        │
└─────────────────────────────────────────────────┘
```

## License

Proprietary — Nexha Federation. Contact ops@nexha.io for licensing.
