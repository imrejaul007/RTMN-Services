# Trust Audit Trail

**Port:** 4997  
Complete trust decision logging and audit.

## Features

- Log trust decisions
- Query audit history
- Export to CSV/JSON
- Entity-specific audit trails

## API

```bash
# Log decision
POST /audit/log
{"entityId": "user-1", "action": "trust_update", "trustScore": 0.85}

# Query audit
GET /audit/query?entityId=user-1&limit=50

# Entity history
GET /audit/entity/:id

# Summary
GET /audit/summary

# Export
GET /audit/export?format=csv
```

## Testing

```bash
npm test
```
