# Platform Economy — Canonical Home

**Layer:** Platform / Economy
**Path:** `companies/HOJAI-AI/platform/economy/`

This directory is the **canonical home** for SUTAR's economic infrastructure
services. Services that used to live under `sutar-os/agents/agent-economy/` and
`sutar-os/agents/agent-wallets/` were moved here as part of the **Phase 5
refactor** (2026-06-22) so that economic concerns are colocated, named with
their purpose, and reusable outside the SUTAR context.

## Services

| Service | Package | Port | Purpose |
|---------|---------|------|---------|
| **wallet-service** | `@hojai/wallet-service` | 4840 | Multi-currency digital wallets for agents. Per-tx / daily / monthly limits enforced. |
| **economy-os** | `@hojai/economy-os` | 4251 | Karma points, agent payments, economy-wide analytics. |

## Why Consolidate Here

- **Wallet logic** is reusable outside SUTAR — any RTMN service that needs
  agent-to-agent payments can import `@hojai/wallet-service`.
- **Economy OS** is the home for the karma/SLB (Service-Level Bonus) system
  that rewards agents for participating in the economy.
- **Cross-cutting visibility** — having economy services at `platform/economy/`
  makes it obvious they're platform-level (not SUTAR-specific).

## Migration Notes

- All callers now reference services by **URL** (e.g.
  `process.env.WALLET_SERVICE_URL || 'http://localhost:4840'`), not by
  package import. No cross-service `require()` was broken by the move.
- The legacy `sutar-os/agents/agent-wallets/` and
  `sutar-os/agents/agent-economy/` paths **no longer exist**. Update any
  scripts or docs that referenced them.
- Default ports are unchanged (4840, 4251) so existing deployments don't
  need to update config.

## Directory Layout

```
platform/economy/
├── CLAUDE.md              ← you are here
├── wallet-service/        ← @hojai/wallet-service (port 4840)
│   ├── CLAUDE.md
│   ├── src/index.js
│   ├── tests/limits.test.cjs
│   └── package.json
└── economy-os/            ← @hojai/economy-os (port 4251)
    ├── CLAUDE.md
    ├── src/
    │   ├── index.js
    │   └── routes/
    │       ├── economy.js
    │       └── payments.js
    └── package.json
```

## See Also

- [Platform Trust](../trust/CLAUDE.md) — reputation + dispute + trust-network
- [SUTAR Gateway](../../sutar-os/core/sutar-gateway/CLAUDE.md) — routes to these services
- [Agent Wallets CLAUDE.md](./wallet-service/CLAUDE.md) — wallet service details