# 🔗 Workflow Bridge - Features

**Service:** HOJAI Workflow Bridge  
**Port:** 4800  
**Location:** `companies/hojai-ai/workflow-bridge/`  
**Status:** ✅ BUILT

---

## Core Features

### 1. Agent-to-Workflow Integration
- [x] Invoke workflows from agents
- [x] Pass context and data
- [x] Handle async workflows
- [x] Track workflow status
- [x] Cancel executions

### 2. Workflow-to-Agent Integration
- [x] Trigger agents from workflows
- [x] Pass workflow context
- [x] Handle agent responses
- [x] Event publishing
- [x] Error handling

### 3. Bidirectional Sync
- [x] Real-time state sync
- [x] Shared state management
- [x] Event propagation
- [x] Conflict resolution
- [x] TTL support

### 4. Event Publishing
- [x] Publish to AgentOS
- [x] Publish to FlowOS
- [x] Event types
- [x] Event routing
- [x] Event logging

---

## API Features

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/invoke` | POST | Invoke agent from workflow |
| `/api/agent/:id/status` | GET | Get agent status |
| `/api/agent/:id/cancel` | POST | Cancel agent execution |
| `/api/workflow/trigger` | POST | Trigger workflow from agent |
| `/api/workflow/:id/status` | GET | Get workflow status |
| `/api/workflow/:id/cancel` | POST | Cancel workflow execution |
| `/api/sync/state` | POST | Sync shared state |
| `/api/sync/state/:key` | GET | Get shared state |
| `/api/sync/events` | POST | Publish sync event |

---

## Integration Points

| System | Port | Features |
|--------|------|----------|
| AgentOS | 4550 | Agent invocation, status, cancel |
| FlowOS | 4244 | Workflow trigger, status, cancel |

---

## Supported Events

| Event | Direction | Description |
|-------|-----------|-------------|
| agent_start | → AgentOS | Agent execution started |
| agent_complete | → FlowOS | Agent execution completed |
| agent_error | → Both | Agent execution failed |
| workflow_start | → FlowOS | Workflow started |
| workflow_complete | → AgentOS | Workflow completed |
| workflow_error | → Both | Workflow failed |

---

## Development Features

| Feature | Status |
|---------|--------|
| TypeScript | ✅ |
| Express.js | ✅ |
| MongoDB | ✅ |
| Redis | ✅ |
| Pino Logging | ✅ |
| Structured Errors | ✅ |

---

**Documentation:** [CLAUDE.md](./CLAUDE.md)
