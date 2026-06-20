# Agent Security (4186)

Capability tokens, sandboxed execution policies, threat detection, and audit logging for AI agents.

## Capabilities

### Capability Tokens
HMAC-signed tokens that grant agents specific scoped capabilities. Tokens expire (default 1h) and can be verified before invocation.

### Policies
Reusable sandbox policies: `strict-readonly`, `standard`, `privileged`. Define network, filesystem, memory, CPU limits.

### Threat Detection
Pattern-based scanner detects:
- Credential exposure (passwords, API keys, tokens)
- SQL injection
- Code injection (eval/exec/spawn)
- Path traversal
- Network exfiltration

### Audit Log
Every scan/capability decision is logged per-agent with decision (allow/flag/block) and reason.

## Endpoints

- `GET /health`
- `GET /api/agents` / `POST /api/agents` / `POST /api/agents/:id/quarantine`
- `POST /api/capability-tokens` / `POST /api/capability-tokens/verify`
- `GET /api/policies` / `POST /api/policies`
- `POST /api/scan` — scan input for threats
- `GET /api/audit` — audit log (filter by agent/decision)
- `GET /api/threats` — threat list (filter by resolved/severity)
- `POST /api/threats/:id/resolve` — mark resolved

## Run

```bash
npm install
PORT=4186 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```