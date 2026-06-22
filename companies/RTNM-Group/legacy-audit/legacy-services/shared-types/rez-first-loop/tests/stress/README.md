# First Loop Stress Tests

Comprehensive stress tests for the inventory → reorder loop.

## Running Tests

### Run All Stress Tests
```bash
cd rez-first-loop
npm run test:stress
```

### Run Individual Test
```bash
npm run test:stress -- --testNamePattern="duplicate"
```

### Run with Coverage
```bash
npm run test:stress -- --coverage
```

## Tests Included

| Test | File | What It Tests |
|------|------|---------------|
| Event Platform Failure | `event-platform-failure.test.ts` | System resilience when Event Platform goes down |
| Duplicate Events | `duplicate-events.test.ts` | Idempotency - no duplicate actions |
| ReZ Mind Timeout | `rez-mind-timeout.test.ts` | Fallback when AI is slow/unavailable |
| Action Engine Failure | `action-engine-failure.test.ts` | Retry logic and partial execution handling |
| NextaBiZ Unavailable | `nextabizz-unavailable.test.ts` | Graceful degradation |
| Rapid Fire Events | `rapid-fire-events.test.ts` | Event coalescing/deduplication |
| Out-of-Order Events | `out-of-order.test.ts` | State consistency |
| Long Latency | `long-latency.test.ts` | Async processing under load |
| Feedback Missing | `feedback-missing.test.ts` | Implicit feedback capture |

## Environment Variables

```bash
# Event Platform
EVENT_PLATFORM_URL=http://localhost:4008

# Action Engine
ACTION_ENGINE_URL=http://localhost:4009

# Feedback Service
FEEDBACK_SERVICE_URL=http://localhost:4010

# ReZ Mind
REZ_MIND_URL=http://localhost:3001
```

## Test Output

Each test produces:

```
🧪 Test Name
─────────────────────────────────────
✅ Step 1: Description
✅ Step 2: Description
❌ Step 3: Description

📋 RESULTS
─────────────────────────────────────
Test ID: xxx
PASSED: ✅ YES

Details:
  ✅ Event sent
  ✅ Event processed
  ❌ Some failure

─────────────────────────────────────
```

## CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/stress-test.yml
- name: Run Stress Tests
  run: |
    cd rez-first-loop
    npm install
    npm run test:stress
  env:
    EVENT_PLATFORM_URL: ${{ secrets.EVENT_PLATFORM_URL }}
    ACTION_ENGINE_URL: ${{ secrets.ACTION_ENGINE_URL }}
```

## Continuous Monitoring

After deployment, run tests on schedule:

```bash
# Daily stress test
0 2 * * * cd rez-first-loop && npm run test:stress
```

## Alerting

If any test fails, alert:

```yaml
# Prometheus Alert
- alert: FirstLoopStressTestFailed
  expr: stress_test_result == 0
  for: 0m
  labels:
    severity: critical
  annotations:
    summary: "First loop stress test failed"
```

## Manual Verification

Some tests require manual intervention:

1. **Event Platform Failure** - Requires killing/restarting the process
2. **Action Engine Failure** - Requires pausing the process

For CI, these tests are skipped with:
```bash
SKIP_MANUAL_TESTS=true npm run test:stress
```
