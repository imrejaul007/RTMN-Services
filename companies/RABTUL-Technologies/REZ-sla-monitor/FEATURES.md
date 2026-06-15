# RABTUL SLA Monitor - Detailed Features

## 1. SLA Lifecycle

### States
- **active**: SLA in effect, measurements being collected
- **paused**: Temporarily disabled
- **breached**: Currently violating targets
- **met**: All targets consistently met
- **expired**: Past end date

### Create SLA
- Required: name, serviceId, provider, consumer, targets[], startDate, endDate
- Optional: description, penalty, tags
- Validation: at least 1 target, endDate > startDate, valid metrics and comparators

### Update SLA
- Partial updates supported
- Status changes trigger events
- Penalty can be modified

## 2. Target Types

### Metrics Supported
- **uptime**: Service availability percentage
- **latency**: Response time in ms
- **throughput**: Requests/operations per second
- **error_rate**: Error percentage
- **response_time**: Total response time
- **availability**: General availability measure

### Comparators
- **gte** (≥): Value must be at or above threshold (for uptime, availability)
- **lte** (≤): Value must be at or below threshold (for latency, error_rate)
- **eq** (=): Exact value match
- **between**: Within range [threshold, upperBound]

## 3. Uptime Calculation

### Per-Period
```
uptimePercent = (up_measurements / total_measurements) * 100
downtimeMs = totalPeriodMs * (1 - uptimePercent / 100)
```

### SLA Compliance
```
compliant = uptimePercent >= sla.targets[uptime].threshold
```

## 4. Latency Percentiles

### Calculations
- **p50**: 50th percentile (median)
- **p95**: 95th percentile
- **p99**: 99th percentile

### Formula
```
sortedValues = measurements.sort()
percentile = sortedValues[ceil((p/100) * length) - 1]
```

## 5. Threshold Checking

### Process
1. Get all targets in SLA
2. Fetch last 1 hour of measurements per metric
3. Calculate average value
4. Compare to threshold via comparator
5. If any target violated → SLA not compliant
6. Publish violation event

### Cache
- Per-SLA cache of last check
- Used for fast lookups

## 6. Alert System

### Severity Levels
- **low**: <10% deviation from threshold
- **medium**: 10-25% deviation
- **high**: 25-50% deviation
- **critical**: >50% deviation

### Workflow
1. `checkAndAlert(slaId)` runs threshold check
2. For each violation, calculate severity
3. Create breach record
4. Update SLA status to 'breached'
5. Publish event
6. Invoke registered handlers
7. Return list of new alerts

### Resolution
- Mark as resolved
- Set resolvedAt timestamp
- Publish resolution event

## 7. Reports

### Per-SLA Report
- Compliance percentage
- Total measurements
- Total breaches
- Per-metric breakdown

### Default Period
- Last 30 days

## 8. Performance

### In-Memory Storage
- Map-based SLA storage
- Map-based measurement storage
- O(1) lookups
- Suitable for high-throughput

### Caching
- Threshold check results cached per SLA
- Auto-expires on each new check

### Event-Driven
- All actions publish to event bus
- 3-second timeout
- Graceful degradation

## Integration Example

### Create SLA
```bash
curl -X POST http://localhost:4195/api/v1/sla \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Uptime Guarantee",
    "description": "99.9% uptime guarantee for API",
    "serviceId": "api-service",
    "provider": "platform-team",
    "consumer": "external-customers",
    "targets": [
      { "metric": "uptime", "threshold": 99.9, "comparator": "gte", "unit": "%" },
      { "metric": "latency", "threshold": 200, "comparator": "lte", "unit": "ms" }
    ],
    "startDate": "2026-01-01",
    "endDate": "2026-12-31"
  }'
```

### Record Measurement
```bash
curl -X POST http://localhost:4195/api/v1/monitoring/measurement \
  -H "Content-Type: application/json" \
  -d '{
    "slaId": "sla-123",
    "metric": "uptime",
    "value": 99.95,
    "unit": "%"
  }'
```

### Check SLA
```bash
curl -X POST http://localhost:4195/api/v1/monitoring/check/sla-123
```
