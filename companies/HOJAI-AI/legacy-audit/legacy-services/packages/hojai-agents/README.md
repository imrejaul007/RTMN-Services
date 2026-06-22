# @hojai/agents

**Autonomous AI Agents Platform**

---

## Overview

Build and deploy autonomous AI agents that can perform complex tasks, make decisions, and collaborate.

## Features

- Multi-agent orchestration
- Agent collaboration
- Task delegation
- Memory and context
- Tool integration

## Quick Start

```bash
npm install @hojai/agents
```

```typescript
import { Agent, AgentRuntime } from '@hojai/agents';

const agent = new Agent({
  name: 'support-agent',
  role: 'customer_support',
  capabilities: ['answer_questions', 'escalate', 'refund']
});

await agent.start();
```

## Agent Types

| Type | Purpose |
|------|---------|
| support | Customer support |
| sales | Sales automation |
| analyst | Data analysis |
| assistant | General assistant |

---

**Port:** 4550
**Status:** Production Ready
