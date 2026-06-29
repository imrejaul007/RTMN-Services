# Emotional Memory Service - Developer Guide

**Service:** Emotional Memory
**Port:** 4761
**Package:** `@hojai/emotional-memory`
**Module:** EmotionOS Platform
**Status:** Production Ready

## Service Overview

The Emotional Memory Service stores and retrieves emotional timelines for entities (users, customers, agents) and tracks emotional dynamics in relationships over time. It is part of the EmotionOS platform and provides the memory layer for emotional intelligence across the HOJAI AI ecosystem.

## Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Main Express server with all routes and business logic |
| `package.json` | Dependencies and npm scripts |
| `vitest.config.js` | Test configuration |
| `__tests__/unit/*.test.js` | Unit tests |

## Architecture

### Core Data Structures

```javascript
// Entity emotional timeline storage
emotionalMemories = Map<entityId, Array<{
  id: string,           // Unique emotion ID
  emotion: string,      // Emotion type (joy, frustration, etc.)
  intensity: number,    // 0.0-1.0 intensity scale
  context: string,      // Optional context description
  source: string,       // Source application
  timestamp: string     // ISO timestamp
}>>

// Relationship emotional history
relationshipEmotions = Map<relationshipId, Array<{
  id: string,
  emotion: string,
  intensity: number,
  mutual: boolean,
  timestamp: string
}>>
```

### Core Functions

| Function | Purpose | Location |
|----------|---------|----------|
| `storeEmotion()` | Add emotion to entity timeline | Line 17-30 |
| `getTimeline()` | Retrieve timeline with date filtering | Line 33-47 |
| `calculateTrends()` | Analyze emotional trends | Line 50-73 |
| `storeRelationshipEmotion()` | Track relationship emotions | Line 76-89 |

### API Routes

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/emotion` | `app.post('/emotion', ...)` | Store single emotion |
| POST | `/emotion/batch` | `app.post('/emotion/batch', ...)` | Batch store |
| GET | `/emotion/:entityId` | `app.get('/emotion/:entityId', ...)` | Get timeline |
| GET | `/emotion/:entityId/summary` | `app.get('/emotion/:entityId/summary', ...)` | Get summary stats |
| POST | `/relationship` | `app.post('/relationship', ...)` | Store relationship emotion |
| GET | `/relationship/:id` | `app.get('/relationship/:id', ...)` | Get relationship history |
| GET | `/relationships/:entityId` | `app.get('/relationships/:entityId', ...)` | Get entity relationships |
| POST | `/query` | `app.post('/query', ...)` | Advanced query |
| GET | `/health` | `app.get('/health', ...)` | Health check |

## Common Tasks

### Adding a New Emotion Type

Emotion types are strings, so no code changes needed. Just use the new emotion name when calling the API:

```bash
curl -X POST http://localhost:4761/emotion \
  -H "Content-Type: application/json" \
  -d '{"entityId": "user-123", "emotion": "wonder", "intensity": 0.7}'
```

### Adding a New Query Filter

To add query parameters, modify `src/index.js`:

1. Add the parameter extraction in the route handler
2. Apply the filter in `getTimeline()` or query logic
3. Add test coverage in `__tests__/unit/`

### Changing Trend Calculation

The trend algorithm is in `calculateTrends()` (lines 50-73). It compares:
- Recent: Last 5 emotional events
- Older: 5 events before recent (positions -10 to -5)

To modify thresholds (currently 0.2), edit line 68:
```javascript
// Current: change > 0.2 ? 'improving' : change < -0.2 ? 'declining'
```

### Adding Persistence

Replace the in-memory Maps with database operations:

1. Install database driver (e.g., `pg` for PostgreSQL)
2. Replace Map operations with async DB calls
3. Add connection pooling
4. Update tests to use mocks

## Integration Points

### TwinOS Hub (Port 4705)

The Emotional Memory Service enriches digital twins with emotional context:

```javascript
// Example: Enriching a customer twin with emotional data
const twinResponse = await fetch('http://localhost:4705/twin/customer/user-123');
const emotionalSummary = await fetch('http://localhost:4761/emotion/user-123/summary');
// Combine data for comprehensive customer view
```

### MemoryOS (Port 4703)

Complementary memory services:
- MemoryOS: Factual and procedural memory
- Emotional Memory: Emotional context and patterns

### Genie AI

Genie AI uses this service for:
- Emotional state tracking per user
- Trend-based response adjustments
- Emotional shift detection

### Support Copilot

Customer support integration:
- Fetch customer emotional journey
- Prioritize by emotional distress level
- Track relationship health

## Middleware Stack

The service uses standard security middleware:

```javascript
app.use(helmet());           // Security headers
app.use(cors());             // Cross-origin requests
app.use(express.json());     // JSON body parsing
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | 4761 | Service port |
| `NODE_ENV` | development | Runtime environment |

## Testing Strategy

Tests are in `__tests__/unit/` using Vitest:

```bash
npm test              # Run all tests
npx vitest            # Watch mode
npx vitest run        # Single run
```

### Test Categories

- **Unit tests** for each core function
- **Route tests** for each API endpoint
- **Integration tests** for multi-step flows

## Performance Considerations

Current limitations:
- In-memory storage (data lost on restart)
- No pagination in timeline retrieval
- Simple O(n) trend calculation

For production scale:
- Add database persistence
- Implement cursor-based pagination
- Cache trend calculations
- Add rate limiting

## Error Handling

All routes return consistent error format:

```javascript
// Validation error
res.status(400).json({ error: 'entityId and emotion are required' });

// Success
res.json({ success: true, memory: stored });
```

## Contributing

When modifying this service:

1. Update unit tests for any logic changes
2. Update this CLAUDE.md for structural changes
3. Update README.md for API changes
4. Run `npm test` before committing
5. Verify health endpoint after changes
