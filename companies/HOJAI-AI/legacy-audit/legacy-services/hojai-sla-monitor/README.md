# Hojai SLA Monitor

**Port:** 4920

Service Level Agreement monitoring for contact centers.

## Features

- SLA definition (response time, first response, resolution)
- Violation tracking
- Alert configuration
- Compliance statistics

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/slas` | Create SLA |
| GET | `/api/slas` | List SLAs |
| POST | `/api/check` | Check compliance |
| GET | `/api/violations` | List violations |
| POST | `/api/violations/:id/acknowledge` | Acknowledge violation |
| GET | `/api/stats` | Get statistics |

## Example

```bash
# Create SLA
curl -X POST http://localhost:4920/api/slas \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_123" \
  -d '{"name": "VIP Support", "channel": "whatsapp", "responseTimeSeconds": 30}'

# Check compliance
curl -X POST http://localhost:4920/api/check \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_123" \
  -d '{"conversationId": "conv_1", "channel": "whatsapp", "responseTimeSeconds": 45}'
```
