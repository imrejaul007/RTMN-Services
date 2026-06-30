# Control Plane

HTTP API server for CompanyOS (port 4010).

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/company/create | Create company |
| GET | /api/company/:id | Get company |
| DELETE | /api/company/:id | Delete company |
| GET | /api/packs | List packs |
| GET | /api/extensions | List extensions |

## Start

```bash
PORT=4010 npm start
```
