# 📋 PHASE 3: ADD TESTS
**Duration:** Week 4-8
**Goal:** 80% test coverage on top services

---

## Priority Services for Tests

| Service | Current LOC | Target Tests | Priority |
|---------|------------|-------------|----------|
| genie-runtime | 2,382 | 100 | P0 |
| genie-calendar | 1,029 | 50 | P0 |
| genie-memory-inbox | 338 | 50 | P0 |
| genie-briefing | 424 | 30 | P0 |
| voice-gateway | 766 | 50 | P0 |
| conversation-physics | 677 | 50 | P1 |
| emotion-analytics | 236 | 30 | P1 |
| presence-os | 345 | 30 | P1 |
| memory-os | 1,529 | 50 | P1 |
| twin-hub | ? | 50 | P1 |

**Total: 490 tests | ~10 weeks**

---

## Test Template

```typescript
// __tests__/{service}.test.ts

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import axios from 'axios';

const BASE_URL = process.env.SERVICE_URL || 'http://localhost:PORT';

describe('Service Name', () => {
  beforeAll(async () => {
    // Start service or mock
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Health', () => {
    it('should return healthy status', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
    });
  });

  describe('API Endpoints', () => {
    it('should handle valid request', async () => {
      const response = await axios.post(`${BASE_URL}/api/endpoint`, {
        data: 'test'
      });
      expect(response.status).toBe(200);
    });

    it('should handle invalid request', async () => {
      await expect(axios.post(`${BASE_URL}/api/endpoint`, {})).rejects.toThrow();
    });
  });

  describe('Business Logic', () => {
    it('should process data correctly', async () => {
      const response = await axios.post(`${BASE_URL}/api/process`, {
        input: 'test'
      });
      expect(response.data.result).toBeDefined();
    });
  });
});
```

---

## Test Files to Create

### P0 Services (Week 4-6)

1. `products/genie/genie-os/runtime/genie/__tests__/genie.test.ts`
2. `products/genie/genie-calendar-service/__tests__/calendar.test.ts`
3. `products/genie/genie-memory-inbox/__tests__/inbox.test.ts`
4. `products/genie/genie-briefing-service/__tests__/briefing.test.ts`
5. `products/voice-os/core/voice-gateway/__tests__/gateway.test.ts`

### P1 Services (Week 6-8)

6. `products/voice-os/core/conversation-physics/__tests__/physics.test.ts`
7. `platform/emotion/emotion-analytics/__tests__/emotion.test.ts`
8. `platform/sutar-os/core/presence-os/__tests__/presence.test.ts`
9. `platform/memory/memory-os/__tests__/memory.test.ts`
10. `platform/twins/twinos-hub/__tests__/hub.test.ts`

---

## Vitest Config Template

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        '__tests__',
        '*.config.*'
      ]
    }
  }
});
```

---

## CI Integration

```yaml
# .github/workflows/test.yml

name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

## Coverage Target

| Tier | Coverage | Services |
|------|----------|----------|
| Critical | 90% | genie-runtime, voice-gateway |
| High | 80% | genie-calendar, genie-memory-inbox |
| Medium | 70% | conversation-physics, emotion-analytics |
| Low | 50% | remaining services |

---

## Checklist

- [ ] Add vitest to package.json of each service
- [ ] Create __tests__/ directory
- [ ] Write tests for genie-runtime (100 tests)
- [ ] Write tests for genie-calendar (50 tests)
- [ ] Write tests for genie-memory-inbox (50 tests)
- [ ] Write tests for genie-briefing (30 tests)
- [ ] Write tests for voice-gateway (50 tests)
- [ ] Write tests for conversation-physics (50 tests)
- [ ] Setup CI/CD pipeline
- [ ] Achieve 80% coverage target
- [ ] Commit

---

## Target: 490 tests

```
Week 4: 100 tests (genie-runtime)
Week 5: 100 tests (calendar, inbox, briefing)
Week 6: 100 tests (voice-gateway, conversation-physics)
Week 7: 90 tests (emotion, presence, memory)
Week 8: 100 tests (remaining services, CI)
```
