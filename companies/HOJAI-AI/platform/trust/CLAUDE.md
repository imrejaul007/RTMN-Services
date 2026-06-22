# Platform Trust — Canonical Home

**Layer:** Platform / Trust
**Path:** `companies/HOJAI-AI/platform/trust/`

This directory is the **canonical home** for SUTAR's trust and reputation
infrastructure services. Three services that used to live under `sutar-os/`
were moved here as part of the **Phase 5 refactor** (2026-06-22) so that
trust concerns are colocated and reusable outside the SUTAR context.

## Services

| Service | Package | Port | Purpose |
|---------|---------|------|---------|
| **agent-reputation** | `@hojai/agent-reputation` | 4820 | Trust scores per agent (0-100), with badges (Iron → Platinum). |
| **trust-network** | `@hojai/trust-network` | 4252 | Social-reputation graph: who-trusts-whom, PageRank-style scoring. |
| **dispute-resolution** | `@hojai/dispute-resolution` | 4847 | Arbitration, mediation, refund processing for failed transactions. |

## Why Consolidate Here

- **Trust is a cross-cutting concern** — every SUTAR service needs to be
  able to ask "how trustworthy is this agent?" The trust services should
  live at the platform level, not buried under one ecosystem (SUTAR).
- **Disputes touch multiple systems** — disputes involve wallets (refunds),
  contracts (terms), and reputation (penalty). Having them at the platform
  level signals they're the source of truth for all three.
- **Reusable outside SUTAR** — any RTMN ecosystem that needs reputation
  scores or dispute arbitration can import these services.

## Trust Score Levels

| Level | Score | Badge |
|-------|-------|-------|
| Platinum | 90-100 | 🏆 |
| Gold | 80-89 | ⭐ |
| Silver | 70-79 | 🥈 |
| Bronze | 50-69 | 🥉 |
| Iron | 30-49 | ⚙️ |
| Restricted | 0-29 | ⚠️ |

## Dispute Lifecycle

```
   Customer raises dispute (ACP DISPUTE message)
              │
              ▼
   ┌─────────────────┐
   │  GATHERED       │  ← evidence from both parties
   └────────┬────────┘
            ▼
   ┌─────────────────┐
   │  ANALYZED       │  ← AI + rules check evidence
   └────────┬────────┘
            ▼
   ┌─────────────────┐
   │  RESOLVED       │  ← refund / partial / reject
   └─────────────────┘
```

## Migration Notes

- All callers reference services by **URL** (e.g.
  `process.env.AGENT_REPUTATION_URL || 'http://localhost:4820'`), not by
  package import.
- The legacy paths `sutar-os/agents/agent-reputation/`,
  `sutar-os/contracts/dispute-resolution/`, and
  `sutar-os/economy/trust-network/` **no longer exist**.
- Default ports are unchanged so existing deployments don't need config
  updates.

## Directory Layout

```
platform/trust/
├── CLAUDE.md                  ← you are here
├── agent-reputation/          ← @hojai/agent-reputation (port 4820)
├── trust-network/             ← @hojai/trust-network (port 4252)
└── dispute-resolution/        ← @hojai/dispute-resolution (port 4847)
```

## See Also

- [Platform Economy](../economy/CLAUDE.md) — wallets + economy-os
- [ACP Protocol](../../sutar-os/agents/acp-protocol/CLAUDE.md) — sends DISPUTE messages here
- [Agent Teaming](../../sutar-os/agents/agent-teaming/CLAUDE.md) — uses reputation scores for leader election
- [Existing SADA OS](./sada-os/CLAUDE.md) — sister trust service for SUTAR-internal governance