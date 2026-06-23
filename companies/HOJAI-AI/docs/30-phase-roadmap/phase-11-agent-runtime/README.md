# Phase 11: Agent Runtime & Execution Layer

**Duration:** 5 weeks (Week 16–20)
**Priority:** P0 (Critical — Foundation for cognitive stack)
**Owner:** Senior AI Engineer

---

## Goal

Build the missing Agent Runtime layer that enables persistent, long-running agent execution. This is the foundation for the entire cognitive stack.

---

## Why This Matters

**Current State:**
- No Agent Runtime exists
- Agents cannot execute long-running tasks reliably
- No session management, no context management, no streaming runtime
- No tool execution sandbox
- No state management, no event handling, no scheduling

**Impact:** Without Agent Runtime, HOJAI cannot support autonomous agents that work over hours, days, or weeks.

**After This Phase:** 9 production-ready runtime services that enable persistent agent execution.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AGENT RUNTIME LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Agent      │  │   Session    │  │   Context    │         │
│  │   Runtime    │  │   Runtime    │  │   Runtime    │         │
│  │   (4900)     │  │   (4901)     │  │   (4902)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Streaming   │  │    Tool      │  │   Sandbox    │         │
│  │   Runtime    │  │   Runtime    │  │   Runtime    │         │
│  │   (4903)     │  │   (4904)     │  │   (4905)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    State     │  │    Event     │  │  Scheduler   │         │
│  │   Runtime    │  │   Runtime    │  │   Runtime    │         │
│  │   (4906)     │  │   (4907)     │  │   (4908)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9 Runtime Services

### 11.1 Agent Runtime (Port 4900)

**Purpose:** Persistent, long-running agent execution

**Features:**
- Agent lifecycle (spawn → run → pause → resume → kill)
- Agent registry (discoverable by capability)
- Agent health monitoring (heartbeat, stuck detection)
- Agent checkpointing (save/restore state)
- Agent migration (move between nodes)

**Implementation:**

```javascript
// File: platform/runtime/agent-runtime/src/index.js

class AgentRuntime {
  async spawn(agentSpec) {
    const agent = {
      id: generateId(),
      spec: agentSpec,
      state: 'spawning',
      createdAt: Date.now(),
      lastHeartbeat: Date.now()
    };

    await this.registry.set(agent.id, agent);
    await this.scheduler.schedule(agent);

    return agent;
  }

  async pause(agentId) {
    const agent = await this.registry.get(agentId);
    agent.state = 'paused';
    await this.checkpoint(agent);
    await this.registry.set(agentId, agent);
  }

  async resume(agentId) {
    const agent = await this.loadCheckpoint(agentId);
    agent.state = 'running';
    await this.scheduler.schedule(agent);
    await this.registry.set(agentId, agent);
  }

  async kill(agentId) {
    await this.scheduler.cancel(agentId);
    await this.registry.delete(agentId);
  }

  async checkpoint(agent) {
    const checkpoint = {
      agentId: agent.id,
      state: agent.state,
      memory: await this.getMemory(agent.id),
      timestamp: Date.now()
    };
    await this.checkpoints.set(agent.id, checkpoint);
  }

  async monitorHealth() {
    const now = Date.now();
    for (const [id, agent] of this.registry.entries()) {
      if (now - agent.lastHeartbeat > 300000) { // 5 min
        agent.state = 'stuck';
        await this.registry.set(id, agent);
        await this.alerts.sendStuckAgentAlert(agent);
      }
    }
  }
}
```

---

### 11.2 Session Runtime (Port 4901)

**Purpose:** Multi-turn conversation management

**Features:**
- Session lifecycle (create → continue → expire)
- Context window management (sliding window, summarization)
- Session persistence (Redis + PostgreSQL)
- Session sharing (handoff between agents)

---

### 11.3 Context Runtime (Port 4902)

**Purpose:** Dynamic context assembly

**Features:**
- Context budget enforcement (token limits)
- Context compression (summarize old messages)
- Context prioritization (relevance scoring)
- Context caching

---

### 11.4 Streaming Runtime (Port 4903)

**Purpose:** Real-time response streaming

**Features:**
- SSE (Server-Sent Events) endpoint
- WebSocket support
- Backpressure handling
- Stream cancellation

---

### 11.5 Tool Runtime (Port 4904)

**Purpose:** Secure tool execution

**Features:**
- Tool registry (discoverable tools)
- Tool sandboxing (isolated execution)
- Tool permission system (RBAC)
- Tool result caching

---

### 11.6 Sandbox Runtime (Port 4905)

**Purpose:** Safe code execution

**Features:**
- Docker-based sandbox
- Resource limits (CPU, memory, network)
- Timeout enforcement
- Output capture

---

### 11.7 State Runtime (Port 4906)

**Purpose:** Agent state management

**Features:**
- State persistence (checkpoints)
- State versioning (undo/redo)
- State sharing (between agents)
- State migration

---

### 11.8 Event Runtime (Port 4907)

**Purpose:** Async event handling

**Features:**
- Event bus (pub/sub)
- Event sourcing (audit trail)
- Event replay (recover from failures)
- Event routing (filter by type/agent)

---

### 11.9 Scheduler Runtime (Port 4908)

**Purpose:** Cron-like agent scheduling

**Features:**
- Cron jobs (time-based)
- Interval jobs (every N seconds)
- Event-triggered jobs (on memory update)
- Job dependencies (wait for other jobs)

---

## Success Criteria

✅ 9 runtime services deployed
✅ Agent lifecycle management working
✅ Persistent execution (agents can run for days)
✅ Checkpoint/restore working
✅ Health monitoring with alerts
✅ 50+ integration tests passing

---

*Phase 11 documentation: 2026-06-22*