# BOA-SUTAR Bridge - Detailed Features

## 1. Bidirectional Sync

### BOA → SUTAR
- Push BOA objective as SUTAR goal
- Map fields:
  - title: `[BOA-Bridge] ${objective.title}`
  - priority: critical→P0, high→P1, medium→P2, low→P3
  - status: on-track→active, at-risk→at_risk, off-track→blocked, etc.
  - metadata: sourceLayer=BOA-OS, keyResults array
- Force re-sync option
- Skip if already synced (unless forced)

### SUTAR → BOA
- Pull SUTAR goal data on demand
- Capture progress updates as feedback
- Detect completion/blocker events

### Sync States
- pending: Initial state
- in-progress: Sync in flight
- completed: Successfully synced
- failed: Sync error
- conflict: Detected conflict between BOA and SUTAR

### Sync History
- Per-sync record: ID, BOA ID, SUTAR ID, direction, status, lastSyncedAt, syncCount, conflicts[]

## 2. Goal Mapping

### 1:1 Mapping (Default)
- One BOA objective → one SUTAR goal
- Direct field mapping
- Key results converted to metrics

### 1:N Mapping
- Split by key result: each KR becomes a separate SUTAR goal
- Split by tag: each tag creates a separate SUTAR goal
- Split by metric: each metric becomes a SUTAR goal

### N:1 Mapping
- Aggregate multiple BOA objectives into one SUTAR goal
- Progress: average of all objectives
- Tags merged and deduplicated
- Metrics combined from all objectives
- Owner: first objective's owner
- Due date: latest due date

### Custom Mapping Rules
- Conditions: eq, neq, gt, lt, in, contains
- Custom transform functions
- Active/inactive flag
- Multiple rules evaluated in order

## 3. Conflict Resolution

### Resolution Strategies
- **boa-wins**: Use BOA's value
- **sutar-wins**: Use SUTAR's value
- **newest-wins**: Compare updatedAt timestamps
- **merged**: Combine both values (BOA fields override SUTAR)
- **business-priority**: Smart strategy based on field type
  - Strategic fields (title, description, priority, owner, dueDate, tags, metrics) → BOA wins
  - Execution fields (status, progress) → SUTAR wins
- **manual**: Mark for human intervention

### Auto-Resolution
- Bulk resolve multiple conflicts
- Configurable default strategy
- Resolution log per conflict

### Conflict Detection
- Field-by-field comparison: title, description, priority, status, owner, dueDate, progress
- Stores both values for inspection
- Timestamp tracking

## 4. Strategic Alignment

### Per-Objective Drift
- `drift = |boaProgress - sutarProgress|`
- Threshold: <10 = aligned

### Per-Strategy Score
```
avgDrift = sum(drifts) / count
alignmentScore = 100 - avgDrift
```

### Alignment Levels
- fully-aligned (≥90): Strategy and execution in sync
- mostly-aligned (≥70): Minor drift
- partially-aligned (≥50): Notable drift
- misaligned (<50): Major drift

### Per-Business-Unit
- Multiple BU assessments
- Trend tracking over time
- 24-hour re-assessment interval

### Aggregate
- Average alignment across all strategies
- Count by alignment level

## 5. Feedback Loops

### Feedback Types
- **progress**: Progress update from SUTAR
- **blocker**: Goal is blocked
- **completion**: Goal completed
- **deviation**: Plan deviation detected
- **insight**: Strategic insight from execution

### Severity
- **info**: General information
- **warning**: Needs attention
- **critical**: Immediate action required

### Auto-Capture from Events
- `sutar.goal.progress-updated` → progress feedback (info)
- `sutar.goal.completed` → completion feedback (info)
- `sutar.goal.blocked` → blocker feedback (critical)

### Custom Handlers
- Register handlers per feedback type
- Handlers called automatically on feedback capture
- Publish to event bus

### Processing
- Mark as processed
- Filter unprocessed
- Get by severity
- Per-objective feedback history

## 6. Metrics Aggregation

### Per-Strategy Metrics
- objectiveCount: Total BOA objectives
- syncedCount: Synced to SUTAR
- avgProgress: Average objective progress
- avgAlignment: Alignment score
- feedbackCount: Total feedback items
- criticalFeedback: Critical feedback count

### Dashboard
- Total objectives across all strategies
- Synced count
- Average progress
- System health (BOA OS, SUTAR GoalOS)

### Caching
- 5-minute TTL
- Manual invalidation
- Per-strategy cache keys

## 7. Real-Time Event Integration

### Event Publishing
- All sync events published to event bus
- All feedback events published
- Service ready event on startup

### Event Consumption
- Receive SUTAR events at `/api/v1/event`
- Auto-process based on event type
- Trigger feedback capture automatically

## 8. Health & Observability

### Health Check
- BOA OS health
- SUTAR GoalOS health
- Returns 'healthy' or 'degraded'
- Status: 'up' or 'down' for each dependency

### Logging
- All sync operations logged
- Conflict resolutions logged
- Error stack traces
- Info-level request logging

### Statistics
- Sync stats: total, completed, failed, in-progress, conflicts
- Feedback stats: total, processed, unprocessed, by severity, by type
- Alignment stats: avg score, level breakdown

## Integration Examples

### Sync a BOA Objective
```bash
curl -X POST http://localhost:4110/api/v1/sync/objective \
  -H "Content-Type: application/json" \
  -d '{ "boaObjectiveId": "obj-123" }'
```

### Push Progress
```bash
curl -X POST http://localhost:4110/api/v1/sync/progress \
  -H "Content-Type: application/json" \
  -d '{ "boaObjectiveId": "obj-123", "progress": 75, "status": "on-track" }'
```

### Check Alignment
```bash
curl -X POST http://localhost:4110/api/v1/alignment/check \
  -H "Content-Type: application/json" \
  -d '{ "strategyId": "strat-456", "businessUnit": "engineering" }'
```

### Resolve Conflict
```bash
curl -X POST http://localhost:4110/api/v1/sync/resolve-conflict \
  -H "Content-Type: application/json" \
  -d '{
    "conflict": { "id": "c-1", "field": "status", "boaValue": "on-track", "sutarValue": "at-risk", "detectedAt": "2026-06-15T00:00:00Z" },
    "strategy": "business-priority"
  }'
```

## Performance Considerations

- In-memory storage for fast access
- HTTP client with 5s timeout
- Event bus calls with 3s timeout
- Failed external calls don't break local operations
- 5-minute metrics cache reduces BOA load
- Drift calculation is O(n) where n = objectives per strategy
