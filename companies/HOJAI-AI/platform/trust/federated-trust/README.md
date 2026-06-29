# Federated Trust

**Port:** 4999  
Cross-organization trust sharing.

## Features

- Organization registration
- Trust score sharing
- Federated trust aggregation
- Multi-source trust calculation

## API

```bash
# Register org
POST /orgs {"name": "Acme Corp"}

# Share trust
POST /share {"orgId": "org-1", "entityId": "user-123", "trustScore": 0.9}

# Query federated trust
GET /trust/:entityId
```
