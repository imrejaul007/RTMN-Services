# REZ Platform API Documentation

OpenAPI 3.0 specifications for all RTMN Services in the REZ ecosystem.

## Services

| Service | Port | Description |
|---------|------|-------------|
| GraphQL Federation | 5000 | GraphQL Gateway for unified API access |
| AutoML Pipeline | 5001 | Automated ML model training and registry |
| Invoice OCR | 5002 | Invoice document processing and extraction |
| Contract Management | 5003 | Contract lifecycle management |
| Legal Document AI | 5004 | Legal document analysis and compliance |
| Cosmic Twin | 5005 | Digital twin management |
| Ranking Service | 5006 | ML-driven ranking and personalization |

## API Specifications

| File | Service | Key Endpoints |
|------|---------|---------------|
| `graphql-federation.yaml` | GraphQL Gateway | POST /graphql, GET /health |
| `automl.yaml` | AutoML Pipeline | /api/experiments/*, /api/training/*, /api/models/* |
| `invoice-ocr.yaml` | Invoice OCR | /api/upload/*, /api/extract/*, /api/validate/*, /api/invoices/* |
| `contracts.yaml` | Contract Management | /api/contracts/*, /api/clauses/*, /api/templates/*, /api/signatures/* |
| `legal.yaml` | Legal Document AI | /api/documents/*, /api/clauses/*, /api/qa/*, /api/compliance/* |
| `cosmic-twin.yaml` | Cosmic Twin | /api/twins/*, /api/relationships/*, /api/snapshots/* |
| `ranking.yaml` | Ranking Service | /api/rank/*, /api/experiments/*, /api/features/*, /api/feedback/* |
| `index.yaml` | Unified Spec | Overview with references |

## Quick Start

### Using Swagger UI

1. Start the documentation server:
   ```bash
   npm start
   ```

2. Open http://localhost:8080 in your browser

3. Select a service from the dropdown to view its documentation

### Using Individual Specs

All spec files can be loaded directly into:
- [Swagger Editor](https://editor.swagger.io/)
- [Stoplight Studio](https://stoplight.io/studio)
- VS Code with OpenAPI extension

## Authentication

All endpoints require Bearer token authentication:

```http
Authorization: Bearer <jwt_token>
```

## Common Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message"
}
```

## Running the Docs Server

```bash
# Start the server
npm start

# The server runs on port 8080 by default
# Use PORT environment variable to change:
PORT=3000 npm start
```

## Generate SDKs

```bash
# JavaScript/TypeScript
npx openapi-generator-cli generate -i graphql-federation.yaml -g typescript-axios -o sdk/graphql

# Python
npx openapi-generator-cli generate -i graphql-federation.yaml -g python -o sdk/graphql

# Go
npx openapi-generator-cli generate -i graphql-federation.yaml -g go -o sdk/graphql
```

## File Structure

```
docs/openapi/
├── index.html              # Swagger UI interface
├── index.yaml              # Unified API spec
├── graphql-federation.yaml # GraphQL Gateway (5000)
├── automl.yaml             # AutoML Pipeline (5001)
├── invoice-ocr.yaml       # Invoice OCR (5002)
├── contracts.yaml         # Contract Management (5003)
├── legal.yaml             # Legal Document AI (5004)
├── cosmic-twin.yaml       # Cosmic Twin (5005)
├── ranking.yaml           # Ranking Service (5006)
├── serve.js              # Simple HTTP server
├── package.json          # Node.js configuration
└── README.md             # This file
```

## License

Proprietary - REZ Platform
