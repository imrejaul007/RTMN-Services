# RABTUL Breach Detector - Detailed Features

## 1. Detection Strategies

### Threshold Detection
- Direct comparison using comparator
- gte/lte/eq/between comparators
- Single-point violations
- Most common detection method

### Anomaly Detection (Z-Score)
```
z = |value - mean| / stdDev
if z > 3 → anomaly
```
- Requires ≥5 historical points
- Adapts to changing patterns
- Catches unusual values even if within thresholds

### Spike Detection
- 3x increase from recent baseline
- Requires 3 historical points
- Catches sudden traffic/load spikes

### Pattern Detection
- 5 consecutive declining values (for gte metrics)
- Indicates sustained degradation
- Catches slow-burn issues

### Sustained Degradation
- Monotonic decline detection
- Catches gradual performance loss

## 2. Breach Lifecycle

### States
- **detected**: Just discovered
- **acknowledged**: Engineer aware
- **remediating**: Auto-remediation in progress
- **resolved**: Issue fixed
- **false-positive**: Determined not a real breach

### Workflow
1. Detection engine finds issue
2. Breach created with severity
3. Event published
4. Auto-remediation triggered (by severity)
5. Incident auto-created
6. Notifications sent
7. Engineer acknowledges
8. Remediation applied
9. Marked resolved

## 3. Auto-Remediation Rules

### Critical
- Page on-call team
- Trigger auto-scaling
- Post to #incidents channel

### High
- Alert team via Slack
- Post to #alerts channel

### Medium
- Log to monitoring
- Create ticket

### Low
- Track in metrics
- No immediate action

## 4. Incident Management

### Create
- Auto-create from breach
- Auto-populate from breach data
- Set severity from breach

### Status Workflow
- open → investigating → identified → monitoring → closed
- Each transition logged in timeline

### Assignment
- Engineer assignment
- Timeline event

### Multi-Breach
- Group related breaches
- Single incident for cascading failures

## 5. Root Cause Analysis

### Metric-Specific Heuristics

#### Uptime/Availability Issues
- Service crash (70%)
- Network issues (50%)
- Resource exhaustion (60%)

#### Latency/Response Time Issues
- Database slow queries (70%)
- High load (60%)
- External API slow (50%)
- Inefficient code (40%)

#### Error Rate Issues
- Recent deployment bug (80%)
- Invalid input data (50%)
- External service failures (60%)

#### Throughput Issues
- Resource bottleneck (70%)
- Configuration change (50%)

### Recommendations
- Check recent deployments
- Review service logs
- Check resource utilization
- Verify external service status
- Review DB performance
- Check traffic anomalies

## 6. Notifications

### Supported Channels
- email
- slack
- pagerduty
- webhook
- sms

### Configuration
```typescript
{
  name: "oncall-pager",
  type: "pagerduty",
  config: { apiKey: "...", serviceKey: "..." },
  enabled: true,
  severities: ["critical"]
}
```

### Per-Channel Severity Filtering
- Send only relevant notifications
- Avoid alert fatigue
- Critical-only for PagerDuty

## 7. Event Stream (SSE)

### Stream Format
```
data: {"event": "breach.detected", "breachId": "...", ...}
data: {"event": "heartbeat", "timestamp": "..."}
```

### Use Cases
- Real-time dashboards
- Webhook-style updates
- Live monitoring UIs

## 8. Performance

### In-Memory History
- 100-point rolling window per metric
- O(1) append with FIFO eviction
- Statistical calculations on demand

### Detection Engine
- O(1) threshold check
- O(n) anomaly detection (n = history)
- O(n) pattern detection
- O(n) sustained detection

### Async Remediation
- Non-blocking remediation execution
- Parallel rule execution
- Step-by-step result tracking

## Integration Example

### Detect Breach
```bash
curl -X POST http://localhost:4196/api/v1/breach \
  -H "Content-Type: application/json" \
  -d '{
    "slaId": "sla-123",
    "serviceId": "api-service",
    "type": "threshold",
    "metric": "uptime",
    "expectedValue": 99.9,
    "actualValue": 97.5
  }'
```

### Analyze + Auto-Remediate
```bash
curl -X POST http://localhost:4196/api/v1/detection/analyze-and-remediate \
  -H "Content-Type: application/json" \
  -d '{
    "slaId": "sla-123",
    "serviceId": "api-service",
    "metric": "latency",
    "value": 850,
    "threshold": 200,
    "comparator": "lte",
    "unit": "ms"
  }'
```

### Root Cause Analysis
```bash
curl -X POST http://localhost:4196/api/v1/remediation/analyze-cause/breach-123
```

### Register Notification Channel
```bash
curl -X POST http://localhost:4196/api/v1/remediation/channels \
  -H "Content-Type: application/json" \
  -d '{
    "name": "oncall-pager",
    "type": "pagerduty",
    "config": { "serviceKey": "..." },
    "enabled": true,
    "severities": ["critical"]
  }'
```
