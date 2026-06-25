# Nexha OS Runtime Guide

> **What:** The Docker distribution of Nexha OS. Deploy a complete Nexha network node on your infrastructure in minutes.
> **Who it's for:** Businesses joining the Nexha Federation — from a 10-person startup to a 10,000-employee enterprise.
> **Location:** `nexha-os-runtime/` in the Nexha monorepo.

---

## Overview

**Nexha OS Runtime** bundles the core Nexha services into a single Docker Compose deployment. You run it on your own infrastructure (VM, bare metal, or cloud). Once deployed, your node registers with the federation at `federation.nexha.io` and can participate in autonomous commerce with other Nexha members.

### What runs inside

| Layer | Services | Purpose |
|-------|----------|---------|
| **Foundation** | CorpID, MemoryOS, TwinOS Hub | Universal identity, AI memory, digital twins |
| **SUTAR OS** | Gateway, Trust Engine, Contract OS, Negotiation Engine, Economy OS | Autonomous commerce infrastructure |
| **Network** | Business Directory, Partner Graph, Commerce Runtime | Federation discovery and trading |
| **Enterprise** | CapabilityOS, ACP Messaging, Agent Marketplace, Mission Planner | Advanced AI orchestration |
| **Monitoring** | Prometheus, Grafana | Observability (Enterprise tier only) |

---

## Tiers

| Tier | Services | RAM | Ports | Best For |
|------|----------|-----|-------|---------|
| **Lite** | CorpID, MemoryOS, TwinOS, Gateway | ~1 GB | 4 ports | Test/dev, SMBs wanting to explore |
| **Standard** | All Lite + SUTAR OS + Network services | ~4 GB | 12 ports | Growing businesses, active federation members |
| **Enterprise** | All Standard + Enterprise services + monitoring | ~8 GB | 18 ports | Large networks, mission-critical deployments |

---

## Prerequisites

- **Docker** 24.0+ with Docker Compose v2 plugin
- **RAM:** 1–8 GB depending on tier
- **Ports:** See the [port reference](#ports) below
- **OS:** Linux (Ubuntu 22.04+ recommended), macOS, Windows (WSL2)

### Recommended

- **16 GB RAM** for Enterprise tier under load
- **50 GB SSD** for data volumes
- **TLS certificates** for production (see [TLS setup](#tls-setup))

---

## Quick Start

```bash
# 1. Clone / navigate to the runtime
cd nexha-os-runtime

# 2. Initialize (creates .env, directories, TLS certs)
bash scripts/init.sh --tier standard

# 3. Edit .env with your Nexha identity
nano .env

# 4. Join the federation
bash scripts/join-federation.sh

# 5. Verify everything is healthy
bash scripts/health-check.sh
```

That's it. Your Nexha node is live.

---

## Step-by-Step

### Step 1: Initialize

```bash
bash scripts/init.sh --tier standard --force
```

The init script:
1. Checks Docker and Docker Compose availability
2. Creates `data/`, `logs/`, `certs/`, `config/` directories
3. Writes `.env` (or updates it with `--force`)
4. Generates self-signed TLS certificates for development
5. Pulls Docker images and starts containers

### Step 2: Configure `.env`

Open `.env` and fill in at minimum:

```bash
# Required before joining federation
NEXHA_NAME="Mumbai Steel Collective"
NEXHA_REGION=IN
NEXHA_PUBLIC_KEY="fp:abc123yourkey..."
NEXHA_CONTACT_EMAIL=ops@mumbai-steel.example
NEXHA_CATEGORIES='["manufacturing.steel","logistics"]'

# Federation endpoint (keep default for production)
FEDERATION_URL=https://federation.nexha.io

# Disable auth for dev, enable for production
FEDERATION_OS_REQUIRE_AUTH=true
CORP_ID_REQUIRE_AUTH=true
```

For production, also set:
```bash
NODE_ENV=production
TLS_ENABLED=true
TLS_CERT_PATH=/certs/nexus.crt
TLS_KEY_PATH=/certs/nexus.key
```

### Step 3: Join Federation

```bash
bash scripts/join-federation.sh
```

This calls `POST /api/v1/nexhas/join` on FederationOS. You'll get back a Nexha ID (e.g., `nexha-abc12345`). **Save this** — it's your identity in the federation.

### Step 4: Verify

```bash
bash scripts/health-check.sh
```

All services should show `✓ HEALTHY`. If any show `✗ DOWN`, check logs:
```bash
docker compose logs nexha-gateway --tail 50
```

---

## Switching Tiers

```bash
# Downgrade to Lite
docker compose --profile standard down
docker compose --profile lite up -d

# Upgrade to Enterprise
docker compose --profile enterprise up -d --remove-orphans
```

The data volume persists across tier changes.

---

## Ports

| Port | Service | Lite | Standard | Enterprise |
|------|---------|:----:|:--------:|:----------:|
| 5000 | Nexha Gateway (public API) | ✅ | ✅ | ✅ |
| 4702 | CorpID | ✅ | ✅ | ✅ |
| 4703 | MemoryOS | ✅ | ✅ | ✅ |
| 4705 | TwinOS Hub | ✅ | ✅ | ✅ |
| 4140 | SUTAR Gateway | — | ✅ | ✅ |
| 4291 | Trust Engine | — | ✅ | ✅ |
| 4292 | Contract OS | — | ✅ | ✅ |
| 4293 | Negotiation Engine | — | ✅ | ✅ |
| 4294 | Economy OS | — | ✅ | ✅ |
| 4340 | ACP Messaging | — | — | ✅ |
| 4350 | CapabilityOS | — | — | ✅ |
| 4250 | Agent Marketplace | — | — | ✅ |
| 4360 | Business Directory | — | ✅ | ✅ |
| 4362 | Mission Planner | — | — | ✅ |
| 4363 | Partner Graph | — | ✅ | ✅ |
| 4364 | Commerce Runtime | — | ✅ | ✅ |
| 9090 | Prometheus | — | — | ✅ |
| 3030 | Grafana | — | — | ✅ |

---

## TLS Setup

### Development (self-signed)

`init.sh` auto-generates self-signed certs. They'll show browser warnings — that's expected.

### Production

1. **Let's Encrypt (recommended for cloud):**
   ```bash
   certbot certonly --nginx -d nexha.yourcompany.com
   cp /etc/letsencrypt/live/nexha.yourcompany.com/fullchain.pem certs/nexus.crt
   cp /etc/letsencrypt/live/nexha.yourcompany.com/privkey.pem certs/nexus.key
   chmod 600 certs/nexus.key
   ```

2. **Enterprise CA certs:**
   ```bash
   cp your.crt certs/nexus.crt
   cp your.key certs/nexus.key
   chmod 600 certs/nexus.key
   ```

3. Update `.env`:
   ```bash
   TLS_ENABLED=true
   TLS_CERT_PATH=/certs/nexus.crt
   TLS_KEY_PATH=/certs/nexus.key
   ```

4. Restart:
   ```bash
   docker compose restart
   ```

---

## Backup & Restore

### Backup (run periodically)
```bash
docker compose stop
tar -czf nexha-backup-$(date +%Y%m%d).tar.gz \
  data/ \
  logs/ \
  certs/ \
  .env
docker compose start
```

### Restore
```bash
docker compose stop
rm -rf data/* logs/*
tar -xzf nexha-backup-YYYYMMDD.tar.gz
docker compose up -d
```

---

## Updating

```bash
# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d --remove-orphans

# Check for breaking changes
docker compose logs --tail 100 | grep -i error
```

For major version upgrades, check the [changelog](#) first.

---

## Troubleshooting

### "Port already in use"
```bash
# Find what's using port 5000
lsof -i :5000
# Kill it or change the port in docker-compose.yml
```

### Containers keep restarting
```bash
# Check logs for the crashing service
docker compose logs nexha-gateway --tail 100

# Common causes:
# - Missing .env variables
# - Port conflicts
# - Out of memory (increase Docker RAM limit)
```

### Federation registration fails
```bash
# Verify FederationOS is reachable
curl https://federation.nexha.io/health

# Check your .env NEXHA_PUBLIC_KEY is set
grep NEXHA_PUBLIC_KEY .env

# Retry with verbose output
bash -x scripts/join-federation.sh
```

### Full reset
```bash
docker compose down -v
rm -rf data logs certs .env
bash scripts/init.sh --tier standard
```

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Replace self-signed TLS with real certificates
- [ ] Enable `FEDERATION_OS_REQUIRE_AUTH=true` + configure JWT
- [ ] Enable `CORP_ID_REQUIRE_AUTH=true` + configure JWT
- [ ] Set strong passwords (`GRAFANA_PASSWORD`, etc.)
- [ ] Configure reverse proxy (nginx/Caddy) with HTTPS
- [ ] Enable Prometheus/Grafana (Enterprise tier)
- [ ] Set up automated backups (cron job)
- [ ] Configure log rotation (`logs/` directory)
- [ ] Set up monitoring alerts
- [ ] Restrict port access with firewall (only 5000 publicly, others internal)
- [ ] Use a process manager (systemd) for auto-restart on reboot

### systemd unit example

```ini
[Unit]
Description=Nexha OS Runtime
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/nexha-os-runtime
ExecStart=/usr/bin/docker compose --profile standard up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose --profile standard up -d
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo cp nexha.service /etc/systemd/system/
sudo systemctl enable nexha
sudo systemctl start nexha
```

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Your Nexha Node                     │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ nexha-gateway :5000  (public HTTPS)            │ │
│  └──────────────────────┬─────────────────────────┘ │
│                         │                           │
│  ┌──────────────────────┴─────────────────────────┐ │
│  │         Internal Service Mesh (172.28.x.x)      │ │
│  │                                               │ │
│  │  CorpID      :4702  │  MemoryOS    :4703     │ │
│  │  TwinOS Hub  :4705  │  SUTAR GW    :4140      │ │
│  │  Trust Eng   :4291  │  Contract OS :4292       │ │
│  │  Negotiate   :4293  │  Economy OS  :4294       │ │
│  │  Directory   :4360  │  Partner Gr  :4363        │ │
│  │  Commerce RT :4364  │  CapabilityOS:4350       │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────┘
                           │
              federation.nexha.io
┌──────────────────────────────────────────────────────┐
│               Nexha Federation                        │
│                                                      │
│  FederationOS :4273  │  100+ Nexha nodes             │
│  Governance         │  Handshake registry              │
│  Policy engine      │  Auto-matching engine           │
└──────────────────────────────────────────────────────┘
```

---

## API Reference

After joining, your node exposes a public gateway at port 5000:

```bash
# Gateway health
curl http://localhost:5000/health

# List connected services
curl http://localhost:5000/api/services

# Your Nexha identity
curl http://localhost:5000/api/identity/whoami

# Federation membership
curl http://localhost:5000/api/federation/status
```

Federation API (federation.nexha.io):

```bash
# Your Nexha details
curl https://federation.nexha.io/api/v1/nexhas/your-nexha-id

# Onboarding checklist
curl https://federation.nexha.io/api/v1/onboarding/checklist/your-nexha-id

# Federation health
curl https://federation.nexha.io/api/v1/federation/health

# Auto-match with top partners
curl -X POST https://federation.nexha.io/api/v1/nexhas/your-nexha-id/auto-match \
  -H 'Content-Type: application/json' \
  -d '{"maxHandshakes": 3}'
```

---

## License

Proprietary — Nexha Federation. Contact ops@nexha.io.
