# REZ Forensics Gateway

Unified interface for all forensics MCP servers (3120-3133).

## Features

- **Single Entry Point**: All forensics MCPs accessible via one gateway
- **Investigation Workflow**: Orchestrate multiple MCPs in one call
- **Report Generation**: Generate comprehensive expert reports
- **Auth Integration**: JWT validation via REZ Auth

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Gateway health + all MCP status |
| GET | `/api/status` | Detailed MCP status |
| POST | `/api/mcp/:service/*` | Forward to specific MCP |
| POST | `/api/investigation` | Run investigation workflow |
| POST | `/api/report/generate` | Generate expert report |

## Investigation Workflow

```bash
curl -X POST http://localhost:5100/api/investigation \
  -H "Content-Type: application/json" \
  -d '{
    "evidenceType": "whatsapp",
    "data": { "file": "..." },
    "options": {
      "deepfakeCheck": true,
      "createChain": true,
      "financialAnalysis": true,
      "socialAnalysis": true,
      "locationAnalysis": true
    }
  }'
```

## Port

- Gateway: 5100

## Environment

```
PORT=5100
MCP_EVIDENCE_URL=http://localhost:3120
MCP_DEEPFAKE_URL=http://localhost:3121
MCP_CUSTODY_URL=http://localhost:3122
MCP_FORENSICS_URL=http://localhost:3123
MCP_SOCIAL_URL=http://localhost:3130
MCP_FINANCIAL_URL=http://localhost:3131
MCP_LOCATION_URL=http://localhost:3132
MCP_REPORTS_URL=http://localhost:3133
AUTH_SERVICE_URL=http://localhost:4002
```

## Usage

```bash
npm install
npm run build
npm start
```