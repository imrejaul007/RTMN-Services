# HOJAI Blueprint Compiler Service

> **Port:** 4391
> **Version:** 1.0.0
> **Status:** ✅ Built (2026-06-25)

The Blueprint Compiler converts `CompanyBlueprint` objects into generated project files by rendering starter templates with token replacement.

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/blueprint-compiler
npm install
npm start        # Port 4391
npm test         # 14 tests, all passing
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/compile` | Start compilation from blueprint |
| `GET` | `/api/v1/compile/:id` | Get compilation status |
| `GET` | `/api/v1/compile/:id/status` | Poll compilation + deploy status |
| `GET` | `/api/v1/compile/:id/files` | Get compiled files |
| `GET` | `/api/v1/compile/:id/download` | Download all files |
| `POST` | `/api/v1/compile/:id/deploy` | Deploy to HOJAI Cloud |
| `GET` | `/api/v1/compile` | List all compile jobs |

## Usage Example

```bash
# Start compilation
curl -X POST http://localhost:4391/api/v1/compile \
  -H 'Content-Type: application/json' \
  -d @blueprint.json

# Poll status
curl http://localhost:4391/api/v1/compile/{jobId}/status

# Deploy to cloud
curl -X POST http://localhost:4391/api/v1/compile/{jobId}/deploy
```

## Files

```
src/
├── index.js           # Main Express server
├── compiler.js        # Compilation logic + job management
├── render.js          # Token replacement engine
├── manifest.js        # Manifest/capability generation
├── deploy.js          # HOJAI Cloud deployment
└── routes/
    └── compile.js      # API routes
```

## Token Replacement

Templates use `{{TOKEN}}` syntax:

| Token | Description |
|-------|-------------|
| `{{PROJECT_NAME}}` | kebab-case project name |
| `{{PROJECT_TITLE}}` | Original name |
| `{{TEMPLATE}}` | Starter template type |
| `{{REGION}}` | Primary region |
| `{{LANGUAGES_JSON}}` | JSON array of languages |
| `{{AGENTS_JSON}}` | JSON array of agent names |
| `{{CREATED_AT}}` | Creation date |

## Related Services

- **AI Architect** (port 4390) — Generates the blueprints this service compiles
- **HOJAI Cloud** (port 4380) — Deploy target
- **HOJAI Studio UI** — Web UI that uses this service
