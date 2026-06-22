# HOJAI FlowOS - Workflow Automation

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4150 | **Status:** ✅ **BUILT** (June 13, 2026)

## Overview

**HOJAI FlowOS** provides workflow automation capabilities. Create multi-step workflows and execute them programmatically.

### Key Features

- 🔄 **Flow Management** - Create and manage workflows
- 📝 **Multi-Step Flows** - Define complex multi-step processes
- ▶️ **Flow Execution** - Execute workflows
- 🎯 **Step Orchestration** - Orchestrate skill execution
- 🔀 **Conditions** - Conditional step execution
- 📜 **Flow Runs** - Track execution history
- ✅ **Status Tracking** - Pending, running, completed, failed

## Architecture

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x |
| Validation | Zod 3.x |

## API Endpoints

### Flows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/flows` | List flows |
| POST | `/api/v1/flows` | Create flow |
| GET | `/api/v1/flows/:id` | Get flow |
| PUT | `/api/v1/flows/:id` | Update flow |
| DELETE | `/api/v1/flows/:id` | Delete flow |
| POST | `/api/v1/flows/:id/execute` | Execute flow |

### Runs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/runs` | List flow runs |
| GET | `/api/v1/runs/:id` | Get flow run |

## Data Models

### Flow

```typescript
{
  id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  enabled: boolean;
}

interface FlowStep {
  id: string;
  skillId: string;
  input?: Record<string, unknown>;
  condition?: string;
}
```

### FlowRun

```typescript
{
  id: string;
  flowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: unknown[];
  startedAt: Date;
  completedAt?: Date;
}
```

## Security Features

| Feature | Status |
|---------|--------|
| Input Validation (Zod) | ✅ |
| Graceful Shutdown | ✅ |
| Health Checks | ✅ |

## Quick Start

```bash
npm install
npm run dev
npm run build
npm start
```

---

**License:** Proprietary - RTNM Digital  
**Last Updated:** June 13, 2026
