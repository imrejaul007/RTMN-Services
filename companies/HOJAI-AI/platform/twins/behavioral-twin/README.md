# Behavioral Twin Service

**Port:** 4746  
**Package:** `@hojai/behavioral-twin`

Digital twin for behavioral patterns - captures work style, productivity, and behavioral profiles.

## Features

- **Behavioral Profiles**: Work style, energy maps, productivity metrics
- **Pattern Storage**: Store and query behavioral patterns over time
- **Twin Management**: Create, update, delete behavioral twins
- **History Tracking**: Track behavioral changes over time
- **Entity Linking**: Link twins to users, employees, or agents

## Quick Start

```bash
npm install
npm run dev
```

## API Endpoints

### Twin Management

```bash
# Create twin
POST /api/twins
{
  "entityId": "user-123",
  "type": "employee",
  "workStyle": {
    "peakHours": ["9-11", "14-16"],
    "communicationPreference": "async"
  }
}

# Get twin
GET /api/twins/:id

# Get twin by entity
GET /api/twins/entity/:entityId

# Update twin
PUT /api/twins/:id

# Delete twin
DELETE /api/twins/:id
```

### Patterns

```bash
# Add pattern
POST /api/twins/:id/patterns
{
  "pattern": "morning_focus",
  "data": { "time": "9:00 AM", "task": "deep_work" }
}

# Get patterns
GET /api/twins/:id/patterns
```

### History

```bash
# Add behavioral entry
POST /api/twins/:id/history
{
  "metric": "collaborationLevel",
  "value": "high"
}

# Get history
GET /api/twins/:id/history
```

## Configuration

```bash
PORT=4746
JWT_SECRET=your-secret
DATABASE_URL=postgresql://...
```

## Testing

```bash
npm test
```

## License

MIT
