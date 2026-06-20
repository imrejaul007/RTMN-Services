# Agent SDK Service (4187)

Hosts TypeScript + Python SDK source for building HOJAI AI agents. Replaces the OPEN item "Agent SDK" in Division 04 (Agent Cloud).

## SDK Packages

### TypeScript: `@hojai/agent-sdk-typescript`
- `sdk/typescript/src/client.ts` — HojaiAgentClient class
- `sdk/typescript/src/types.ts` — TypeScript types
- `sdk/typescript/package.json` — NPM package config
- `sdk/typescript/tsconfig.json` — TypeScript config

### Python: `hojai-agent-sdk`
- `sdk/python/hojai_agent/__init__.py` — HojaiAgentClient class
- `sdk/python/pyproject.toml` — Python package config

## Endpoints

- `GET /health`
- `GET /api/sdks` — list all SDKs
- `GET /api/sdks/:id` — SDK metadata + install cmd
- `GET /api/sdks/:id/files` — file listing
- `GET /api/files?path=...` — fetch SDK source file (path must start with `typescript/` or `python/`)
- `GET /api/releases` / `POST /api/releases` — version releases
- `GET /api/downloads` / `POST /api/downloads` — download tracking

## Install (for SDK consumers)

```bash
# TypeScript
npm install @hojai/agent-sdk-typescript

# Python
pip install hojai-agent-sdk
```

## Run

```bash
npm install
PORT=4187 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```