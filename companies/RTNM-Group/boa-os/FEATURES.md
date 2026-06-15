# BOA OS - Detailed Features

## 1. Strategy Management

### Vision & Mission
- Define high-level vision (aspirational future state)
- Define mission (purpose and approach)
- Strategy name, description, owner
- Time horizon: 1-year, 3-year, 5-year, 10-year
- Status: draft, active, paused, archived

### Strategic Pillars
- Name, description, theme
- Owner assignment
- Pillar grouping for objectives
- Strategy-pillar many-to-many relationship

### Strategy Lifecycle
- Draft → Active → Paused/Archived
- Activation triggers event
- Strategy summary endpoint with aggregated metrics

## 2. OKR/Objectives Management

### Objective Properties
- Title, description
- Priority: low, medium, high, critical
- Owner, tags
- Start date, due date
- Parent objective (for cascading)
- SUTAR goal ID (after sync)

### Key Results
- Description, metric name
- Target value, current value
- Unit of measurement
- Due date
- Auto-calculated progress %
- Auto-status: on-track, at-risk, off-track, completed

### Progress Tracking
- Update KR current value via API
- Auto-recalculate objective progress
- Auto-determine status based on time/progress curve
- Push progress to SUTAR OS when synced

### Cascading Objectives
- Parent-child relationships
- Multi-level strategy decomposition
- Visual hierarchy support

## 3. Roadmap Management

### Roadmap Properties
- Name, description
- Linked to strategy
- Start and end date
- Status: planning, executing, on-hold, completed

### Milestones
- Title, description
- Target date, completion date
- Status: pending, in-progress, completed, blocked
- Dependencies on other milestones
- Deliverables
- Owner

### Timeline View
- Chronological milestone listing
- Dependency visualization
- Status filtering
- Critical path identification

### Auto-Status
- Roadmap status derived from milestone completion
- Blocked milestones put roadmap on hold
- All complete → completed

## 4. KPI Tracking

### KPI Definition
- Name, description
- Metric name, unit
- Baseline (starting value)
- Target value
- Owner
- Measurement frequency: hourly, daily, weekly, monthly, quarterly
- Tags
- Linked to objective (optional)

### Measurements
- Value, timestamp
- Source (system or manual)
- Notes
- Historical tracking

### Status Calculation
- Achieved: progress >= 100%
- On-track: progress >= 80%
- At-risk: progress >= 50%
- Off-track: progress < 50%

### Trend Analysis
- Improving: >5% increase from previous
- Declining: >5% decrease
- Stable: within ±5%

### Progress Formula
```
progress = (current - baseline) / (target - baseline) * 100
```

## 5. SWOT Analysis

### Auto-Generation
- Context-based extraction
- Keyword recognition:
  - Strengths: leader, experienced, innovative, customer loyalty, scale, brand
  - Weaknesses: legacy, turnover, limited, lack, expensive
  - Opportunities: market growth, new products, partners, AI, emerging
  - Threats: competition, regulation, recession, disruption, cybersecurity, talent

### Strategic Recommendations
- SO Strategy: Strengths + Opportunities
- WO Strategy: Weaknesses + Opportunities
- ST Strategy: Strengths + Threats
- WT Strategy: Weaknesses + Threats
- Quarterly review recommendation
- Owner assignment recommendation

### Custom SWOT
- Override auto-detection
- Manual entry of all four quadrants

## 6. Strategic Alignment

### Assessment
- Business unit ↔ strategy mapping
- Score: 0-100%
- Status: aligned (≥90), partially-aligned (≥60), misaligned (<60)

### Cascading Alignment
- Parent-child objective linking
- Multi-level alignment tracking
- BU alignment through cascading objectives

### Gap Analysis
- Missing alignments identified
- Specific recommendations per status
- Urgency-based prioritization

### Aggregate Metrics
- Total business units
- Average alignment score
- Number of aligned units
- Total strategies covered

## 7. Goal Sync (BOA → SUTAR)

### Sync Objective
- Generate SUTAR goal from BOA objective
- Map priority: critical→P0, high→P1, medium→P2, low→P3
- Map status: on-track→active, at-risk→at_risk, off-track→blocked, etc.
- Include key results as metadata
- Tag with source: boa-strategy
- POST to SUTAR GoalOS `/api/v1/goals`

### Sync Strategy
- Sync all objectives in strategy
- Aggregate results
- Publish strategy-synced event
- Count synced/failed

### Progress Updates
- Push progress changes to SUTAR
- Update goal status
- Publish progress-updated event
- Handle sync failures gracefully

### Sync History
- Per-objective sync record
- Status: synced, failed, skipped
- Error messages
- Timestamps

## 8. Event-Driven Architecture

### Events Published
- `boa.os.ready` - Service startup with capabilities
- `boa.strategy.created` - New strategy
- `boa.strategy.activated` - Strategy activation
- `boa.strategy.synced` - Strategy sync complete
- `boa.objective.created` - New objective
- `boa.objective.updated` - Objective changes
- `boa.objective.synced` - Synced to SUTAR
- `boa.objective.progress-updated` - Progress change
- `boa.keyresult.progress` - KR progress update
- `boa.roadmap.created` - New roadmap
- `boa.milestone.updated` - Milestone change
- `boa.kpi.created` - New KPI
- `boa.kpi.measured` - New measurement

### Events Consumed (via /api/v1/event)
- `sutar.goal.progress-updated` - SUTAR progress feedback
- `sutar.goal.completed` - SUTAR goal completion

## 9. API Capabilities

### REST API
- 30+ endpoints
- Full CRUD on all entities
- Aggregated reporting
- Bulk operations
- Filter and pagination support

### Validation
- Required field validation
- Type checking
- Length limits
- Enum value validation
- Date range validation

### Error Handling
- Custom error classes (NotFound, Validation, Unauthorized, Conflict, ServiceUnavailable)
- Consistent error response format
- Operational vs programmer errors
- 404 for missing routes

## 10. Observability

### Health Check
- Service status
- Uptime
- Environment
- Version

### Request Logging
- HTTP method, path, status
- Response time
- Automatic via middleware

### Structured Logging
- Winston-based
- Log levels: error, warn, info, debug
- File and console transports
- Error-specific log file
- Combined log file

### Info Endpoint
- Service metadata
- Feature list
- Endpoint catalog
- External service URLs

## Integration Examples

### Create Strategy with Full Cascade
```bash
curl -X POST http://localhost:4100/api/v1/strategy \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q4 Growth Strategy",
    "vision": "...",
    "mission": "...",
    "owner": "ceo@company.com",
    "horizon": "1-year",
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "pillars": [
      { "name": "Customer", "description": "...", "theme": "Growth", "owner": "..." }
    ],
    "objectives": [
      {
        "pillarName": "Customer",
        "title": "Increase NPS to 70",
        "description": "...",
        "priority": "high",
        "owner": "...",
        "keyResults": [
          { "description": "...", "metric": "NPS", "targetValue": 70, "unit": "points", "dueDate": "2026-12-31" }
        ]
      }
    ]
  }'
```

### Sync to SUTAR
```bash
curl -X POST http://localhost:4100/api/v1/sync/strategy/{strategyId}
```

### Generate SWOT
```bash
curl -X POST http://localhost:4100/api/v1/alignment/swot \
  -H "Content-Type: application/json" \
  -d '{
    "context": "We are the market leader with experienced team but face disruption from new AI competitors"
  }'
```

## Performance Considerations

- In-memory storage (Map-based) for fast access
- Event bus calls are async and non-blocking
- Sync operations are async with timeout
- Failed external service calls don't break local operations
- Logging is async
- No N+1 queries (in-memory operations)
