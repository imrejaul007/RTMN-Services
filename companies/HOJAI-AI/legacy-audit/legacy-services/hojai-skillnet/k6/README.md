# k6 Performance Tests

Performance testing scripts for HOJAI SkillNet using k6.

## Prerequisites

```bash
# Install k6
brew install k6    # macOS
# or
# apt install k6    # Ubuntu/Debian
# choco install k6   # Windows
```

## Running Tests

### Smoke Test (Basic)

```bash
cd k6
k6 run smoke-test.js
```

### Load Test (Performance)

```bash
k6 run load-test.js
```

### Stress Test (Breakpoint)

```bash
k6 run stress-test.js
```

### With Custom URL

```bash
k6 run smoke-test.js -e BASE_URL=https://api.hojai.ai
```

### With Custom Tenant

```bash
k6 run smoke-test.js -e TENANT_ID=my-tenant-123
```

## Test Types

| Test | VUs | Duration | Purpose |
|------|-----|----------|---------|
| Smoke | 5 | 2 min | Basic functionality |
| Load | 100-200 | 15 min | Performance under load |
| Stress | 500-1000 | 10 min | Find system limits |

## Expected Results

### Smoke Test
- All endpoints return 200/201
- p(95) latency < 500ms
- Error rate < 1%

### Load Test
- p(95) latency < 1000ms
- p(99) latency < 2000ms
- Error rate < 5%

### Stress Test
- System handles 500+ concurrent users
- Graceful degradation
- Error rate < 10%

## Output

k6 outputs real-time metrics:
- `http_req_duration` - Request latency
- `http_req_failed` - Error rate
- `iterations` - Total test iterations
- `vus` - Virtual users

## Cloud Testing

```bash
# Run on k6 Cloud
k6 cloud smoke-test.js

# With k6 Cloud token
K6_CLOUD_TOKEN=your-token k6 cloud load-test.js
```
