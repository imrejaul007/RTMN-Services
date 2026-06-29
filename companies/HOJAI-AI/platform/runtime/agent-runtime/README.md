# Agent Runtime

LLM-powered AI agents with tools, memory, multi-turn conversations.

## Quick Start

```typescript
import { AgentRuntime } from '@hojai/agent-runtime';

const runtime = new AgentRuntime();
```

## Agent Definition

```js
runtime.register({
  id: 'sdr-agent',
  name: 'Sales Development Rep',
  role: 'sales',
  instructions: 'You qualify leads using BANT scoring...',
  skills: ['lead_scoring', 'email_personalization', 'meeting_booking'],
  llm: { provider: 'anthropic', model: 'claude-3-5-sonnet' }
});
```

## Execute

```typescript
const result = await runtime.execute('sdr-agent', {
  lead: { email: 'john@acme.com', company: 'Acme Corp' }
});
```

## Tools

Register tools for agents to use.

## Architecture

```
Agent Runtime
├── Agent Registry
├── LLM Client Pool
├── Tool Executor
├── Memory Store
└── WebSocket Events
```

## Events

- agent.registered
- execution.start
- execution.complete
- execution.error
- iteration.start

## Built with

- Claude API
- OpenAI API
- EventEmitter3
- P-Queue for concurrency
