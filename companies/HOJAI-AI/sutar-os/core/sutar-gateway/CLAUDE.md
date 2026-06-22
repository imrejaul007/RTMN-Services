# sutar-gateway

> **Service:** SUTAR OS Gateway
> **Port:** 4140
> **Layer:** 2 (Gateway)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

The HTTP entry point for SUTAR OS. All SUTAR consumers (RTMN Hub, REZ,
external apps) should hit this service for `/api/sutar/*` requests.

Three responsibilities:

1. **Service registry** — knows every SUTAR service, its port, status
2. **Request routing** — forwards `/api/sutar/<service>/<path>` to the right port
3. **Aggregation** — `/api/sutar/status` hits every SUTAR service in parallel

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Self + aggregated health of all 25 SUTAR services |
| GET | `/api/sutar/services` | Full registry (count + services dict) |
| GET | `/api/sutar/services/:key` | One service metadata |
| GET | `/api/sutar/layers` | Services grouped by layer (1-7) |
| GET | `/api/sutar/status` | Live status of every service (parallel probes) |
| ALL | `/api/sutar/:service/:path(*)` | Forward to underlying service |

## Wiring

- `ai-intelligence` (4881) advertises `sutarGateway: 'http://localhost:4140'`
- `ai-intelligence` capabilities include `sutarGatewayStatus`, `sutarGatewayServices`
- `unified-os-hub` (4399) routes `/api/sutar/*` → `sutarGateway`

## Next steps

- Add WebSocket support for streaming status updates
- Add OAuth/JWT validation for non-internal callers
- Cache `/api/sutar/status` for 5s to avoid hammering downstream
