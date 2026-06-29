# Customer Graph API

**Port:** 4903  
**Purpose:** Graph-based customer relationships

## API

```
POST /api/graph/resolve
  Input: { phone?, email?, deviceId? }
  Output: { customerId, confidence }

GET /api/graph/:customerId/connections
GET /api/graph/:customerId/network
```
