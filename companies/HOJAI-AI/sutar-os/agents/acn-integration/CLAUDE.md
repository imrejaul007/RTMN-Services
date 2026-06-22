# ACN Integration Service

**Port:** 4849
**Layer:** Agents (Phase 2)
**Version:** 1.0.0

Bridge between the Agent Commerce Network (ACN) and RTMN's Department OS,
Industry OS, and TwinOS. Translates ACN events into RTMN-side updates and
vice versa.

## Why This Service

ACN agents speak ACP. RTMN services speak REST + JSON in their own
formats. ACN Integration is the bridge: it listens for ACP messages
on one side and triggers RTMN workflows on the other.

Examples:
- ACP `ORDER` → creates a `commerce.order` twin update
- ACP `DISPUTE` → triggers CS-OS escalation
- ACP `PAYMENT` → records in Finance-OS ledger

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/integrations/acp/hook` | Webhook for ACP events (auth required) |
| `GET` | `/api/integrations/status` | Get integration health |
| `POST` | `/api/integrations/sync/:service` | Force-sync to a specific RTMN service |
| `GET` | `/api/integrations/log` | View integration event log |

## See Also

- [ACP Protocol](../acp-protocol/CLAUDE.md) — the protocol being bridged
- [RTMN Hub](../../../../services/unified-os-hub/) — RTMN-side target
- [TwinOS](../../../platform/twins/twinos-hub/) — twin updates triggered here