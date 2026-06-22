# HOJAI Enterprise Search

Glean competitor: Enterprise knowledge search with role-based permissions.

**Port: 4620**

## Features

- **Unified Search**: Search across all connected knowledge sources
- **Permission-based Access**: Role-based document access control
- **Source Connectors**: Connect Confluence, Slack, Drive, Notion
- **Full-text Search**: Title, content, and tag matching
- **Search Analytics**: Track queries and improve results
- **Document Management**: CRUD operations for documents

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/search` | Search documents |
| GET | `/api/documents` | List documents |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/:id` | Get document |
| PUT | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Delete document |
| GET | `/api/connectors` | List connectors |
| POST | `/api/connectors` | Create connector |
| POST | `/api/connectors/:id/sync` | Sync connector |
| POST | `/api/permissions` | Grant permission |
| DELETE | `/api/permissions` | Revoke permission |
| GET | `/api/analytics/searches` | Search analytics |
| GET | `/api/analytics/documents` | Document analytics |

## Quick Start

```bash
npm install
npm run build
npm start
```

## Search Example

```bash
curl -X POST http://localhost:4620/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "onboarding process",
    "roleIds": ["hr-manager", "admin"],
    "limit": 10
  }'
```

## Data Sources

| Source | Status |
|--------|--------|
| Confluence | Connected |
| Slack | Connected |
| Google Drive | Connected |
| Notion | Connected |
| Manual | Active |
