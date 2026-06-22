# Industry AI Company Framework

Packages AI capabilities as companies for each of the 24 RTMN industries.

## Quick Start

```bash
cd core/industry-ai-company
npm install
npm start
```

## Features

- 24 Industry AI Companies (one per industry)
- Company structure with departments
- Default capabilities (AI Assistant, Analytics, Automation, Prediction)
- Deployment orchestration

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List companies |
| GET | `/api/companies/:id` | Company details |
| GET | `/api/capabilities` | List capabilities |
| POST | `/api/capabilities` | Add capability |
| POST | `/api/deployments` | Create deployment |
| GET | `/api/metrics` | Company metrics |

## Example

```bash
# Get fitness AI company
curl http://localhost:3030/api/companies/ai_company_fitness

# Add capability
curl -X POST http://localhost:3030/api/capabilities \
  -H "Content-Type: application/json" \
  -d '{"companyId": "ai_company_fitness", "capability": {"name": "Custom Skill"}}'
```

## Docker

```bash
docker build -t rtmn-industry-ai-company core/industry-ai-company
docker run -p 3030:3030 rtmn-industry-ai-company
```
