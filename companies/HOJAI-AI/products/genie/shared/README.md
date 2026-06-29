# @hojai/genie-shared

Shared utilities for all 14 Genie services.

## Modules

- **redis.ts** — Redis client wrapper
- **http.ts** — Inter-service HTTP client + service URLs
- **errors.ts** — Standard error/success responses
- **middleware.ts** — Common Express middleware (logging, auth, shutdown)
- **llm.ts** — LLM helper with JSON extraction
- **health.ts** — Multi-service health checks

## Usage

```typescript
import { getRedis, callService, SERVICE_URLS, ok, fail, callLLM } from '@hojai/genie-shared';

const redis = getRedis();
const data = await callService({ method: 'GET', url: SERVICE_URLS.calendar + '/events' });
const response = await callLLM({ prompt: '...', model: 'claude-haiku' });
```