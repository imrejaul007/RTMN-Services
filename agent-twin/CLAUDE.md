# Agent Twin - Development Guide

**Port:** 3011  
**Type:** Digital Twin (Agent Management)

## Architecture

Agent Twin provides digital twin capabilities for AI agents in the RTMN ecosystem.

### Features

1. **Agent Profiles** - Name, role, capabilities, status
2. **Karma System** - Performance scoring (0-100)
3. **Activity Logging** - Track agent actions
4. **Performance Metrics** - Karma and action counts

### Data Models

```typescript
interface Agent {
  id: string;
  name: string;
  role: 'sales' | 'support' | 'admin' | 'general';
  capabilities: string[];
  status: 'active' | 'inactive' | 'training';
  karma: number;
  createdAt: string;
}

interface Activity {
  id: string;
  agentId: string;
  action: string;
  metadata: object;
  timestamp: string;
}
```

### Integration Points

- **Agent Economy** (4251) - Karma and payments
- **TwinOS Hub** (4705) - Central sync
- **API Gateway** (3000) - Request routing

### Testing

```bash
curl http://localhost:3011/health
curl http://localhost:3011/api/agents
```
