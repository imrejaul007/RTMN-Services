# ACN Hub Gateway

**Port:** 4852 (default)
**Layer:** Agents (gateway)
**Version:** 1.0.0

Unified gateway for the Agent Commerce Network (ACN). Routes requests
to any of the 15 ACN services through a single endpoint, and provides
cross-service aggregations (network-wide stats, top merchants, etc.).

## Why This Service

The ACN has 15 services spread across 3 phases. Without a hub, a
caller (Genie, RTMN Hub, etc.) needs to know all 15 ports and their
URL patterns. The hub gives them **one port and one routing convention**:

```
/api/acn/<service>/<path>  →  http://localhost:<service-port>/<path>
```

So `GET /api/acn/network/agents` proxies to `acn-network:4801/api/agents`,
`POST /api/acn/wallets` proxies to `agent-wallets:4840/api/wallets`, etc.

## Services Routed

| Phase | Service | Port |
|-------|---------|------|
| 1 | `acp-protocol` | 4800 |
| 1 | `acn-network` | 4801 |
| 1 | `genie-shopping-agent` | 4716 |
| 1 | `merchant-agents` | 4810 |
| 1 | `agent-reputation` | 4820 |
| 1 | `agent-contracts` | 4830 |
| 1 | `agent-wallets` | 4840 |
| 2 | `agent-marketplace` | 4845 |
| 2 | `agent-learning` | 4846 |
| 2 | `dispute-resolution` | 4847 |
| 2 | `agent-analytics` | 4848 |
| 2 | `acn-integration` | 4849 |
| 3 | `negotiation-ai` | 4850 |
| 3 | `agent-orchestration` | 4851 |

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/api/services` | List all 15 ACN service URLs |
| `GET` | `/api/network/stats` | Aggregated ACN-wide stats |
| `GET` | `/api/network/top-merchants` | Top merchants by reputation |
| `GET` | `/api/network/recent-transactions` | Recent cross-agent transactions |
| `ANY` | `/api/acn/<service>/<path>` | Proxy to the named service |

## Configuration

Each downstream service URL is configurable via env var:

```bash
ACP_PROTOCOL_URL=http://acp.example.com:4800
ACN_NETWORK_URL=http://acn.example.com:4801
# ... etc
```

If unset, defaults to `http://localhost:<port>`.

## See Also

- [SUTAR Gateway](../../core/sutar-gateway/CLAUDE.md) — higher-level gateway for all of SUTAR (including ACN)
- [RTMN Unified Hub](../../../../services/unified-os-hub/CLAUDE.md) — ecosystem-level gateway that fronts the SUTAR gateway