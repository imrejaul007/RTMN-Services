# Behavioral Twin Service

**Port:** 4746  
**Type:** Core Twin  
**Phase:** 1  
**Author:** HOJAI AI

---

## What This Service Does

The Behavioral Twin learns behavioral patterns:
- Work style
- Productivity metrics
- Energy patterns

---

## Key Endpoints

### Get Work Style
```
GET /api/twin/:employeeId/behavior/work-style
```

### Set Work Style
```
POST /api/twin/:employeeId/behavior/work-style
Body: { workPattern?: {}, communicationPreference?: string, riskTolerance?: number }
```

### Get Energy Map
```
GET /api/twin/:employeeId/behavior/energy-map
```

### Log Energy Level
```
POST /api/twin/:employeeId/behavior/energy-log
Body: { day: string, timeSlot: string, level: "high" | "low", tasks?: [] }
```

### Get Optimal Hours
```
GET /api/twin/:employeeId/behavior/optimal-hours
```

### Track Productivity
```
POST /api/twin/:employeeId/behavior/track
Body: { date?: string, tasksCompleted?: number, meetingsHours?: number, focusScore?: number }
```

### Get Productivity Metrics
```
GET /api/twin/:employeeId/behavior/productivity?days=7
```

### Observe Behavior
```
POST /api/twin/:employeeId/behavior/observe
Body: { behavior: string, category: string }
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Twin Observer | 4747 | Event routing |
| Calendar Connector | 4795 | Meeting data |

---

## Data Stored

- Work style profiles
- Energy maps
- Productivity metrics
- Behavior patterns
