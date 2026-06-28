# Agent Security

**Port:** 4797  
**Status:** ✅ Built  
**Purpose:** Single chokepoint for AI agents to call HOJAI services - API key registration, JWT authentication, RBAC permissions, rate limiting, and audit logging

---

## Overview

Agent Security is the security layer for all AI agents:
- Agent registration (admin only) → returns API key
- Agent authentication (API key → JWT)
- Permission checking (RBAC)
- Per-agent rate limiting (token bucket)
- Full audit logging

---

## Tech Stack

- Node.js
- Express.js
- JWT (HS256)
- Custom API key generation
- File-backed storage

---

## API Endpoints

### Agent Registration (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/register` | Register new agent |
| GET | `/api/agents` | List all agents |
| PATCH | `/api/agents/:agentId` | Update agent |
| POST | `/api/agents/:agentId/revoke-keys` | Rotate API keys |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/auth` | Authenticate (API key → JWT) |

### Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/check-permission` | Check RBAC permission |
| POST | `/api/agents/check-rate-limit` | Check rate limit |

### Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Security stats |
| GET | `/api/audit` | Audit log |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Redirect to API health |
| GET | `/api/health` | Detailed health |
| GET | `/ready` | Readiness check |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/agent-security
npm install
JWT_SECRET=your-secret-key-here npm start
```

---

## Example Usage

### Register Agent (Admin)
```javascript
await fetch('http://localhost:4797/api/agents/register', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <admin-jwt>'
  },
  body: JSON.stringify({
    agentId: 'sales-agent-001',
    name: 'Sales Agent',
    permissions: ['read:leads', 'write:deals']
  })
});
// Returns: { apiKey: "hvj_..." } - SAVE THIS, SHOWN ONLY ONCE
```

### Authenticate Agent
```javascript
const { token } = await fetch('http://localhost:4797/api/agents/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'sales-agent-001',
    apiKey: 'hvj_...'
  })
});
// token is a JWT valid for 1 hour
```

### Check Permission
```javascript
await fetch('http://localhost:4797/api/agents/check-permission', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <service-jwt>'
  },
  body: JSON.stringify({
    agentId: 'sales-agent-001',
    permission: 'write:deals'
  })
});
```

---

## Rate Limiting

Token bucket algorithm:
- Default: 100 requests per 60 seconds
- Configurable per call

---

## Integration

| Service | Integration |
|---------|-------------|
| All HOJAI services | Security validation |
| `agent-os` | Agent authentication |
| `agent-builder` | Agent registration |
| `Nexha` | Agent commerce |

---

## Related Services

- [agent-os](agent-os/) - Agent runtime
- [agent-builder](agent-builder/) - Agent creation
- [multi-agent-runtime](multi-agent-runtime/) - Multi-agent coordination
