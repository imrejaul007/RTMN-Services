# Flow Runtime

> Execute workflows with retry, caching, concurrency

## Usage

```js
import { FlowRuntime } from '@hojai/flow-runtime';

const runtime = new FlowRuntime();
runtime.register({ id: 'my-flow', name: 'My Flow', nodes: [...], connections: [...] });
await runtime.execute('my-flow', 'webhook', { data });
```

## Node Types

- `trigger` - Start of flow
- `action` - API call
- `ai_agent` - LLM call
- `condition` - Branch logic
- `filter` - Array filter
- `transform` - Data transform
- `email/sms/slack/whatsapp` - Notifications
- `crm` - CRM ops
- `memory/twin` - State management
- `approval` - Human approval
- `actor` - Web scraping

## Retry Config

```js
{ maxAttempts: 3, backoff: 'exponential', initialDelay: 1000 }
```

## Events

- `execution.start`
- `execution.complete`
- `execution.fail`
- `step.start`
- `step.complete`
