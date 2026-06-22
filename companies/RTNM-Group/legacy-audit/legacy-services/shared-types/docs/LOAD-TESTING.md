# Load Testing Plan

## Target Metrics

| Endpoint | RPS Target | P95 Latency | Error Rate |
|----------|------------|-------------|------------|
| /auth/login | 500 | <200ms | <0.1% |
| /orders/create | 100 | <500ms | <0.5% |
| /products/search | 1000 | <300ms | <0.1% |
| /payments/webhook | 200 | <100ms | <0.01% |

## Test Scenarios

### 1. Steady State
- Simulate normal traffic for 30 minutes
- Measure baseline performance
- Verify SLAs

### 2. Peak Load
- 10x normal traffic
- Verify system handles burst
- Measure degradation

### 3. Stress Test
- Increase load until failure
- Identify breaking point
- Document failure modes

### 4. Soak Test
- Normal traffic for 8 hours
- Detect memory leaks
- Monitor resource growth

## Tools

### k6 (Recommended)
```javascript
// example.js
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  http.get('https://api.rez.money/products');
  sleep(1);
}
```

### Run Command
```bash
k6 run --out influxdb=http://localhost:8086/k6 example.js
```

## Monitoring
- Grafana dashboard
- Prometheus metrics
- APM traces
