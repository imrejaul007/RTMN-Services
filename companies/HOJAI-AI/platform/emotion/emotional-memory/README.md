# Emotional Memory Service

**Port:** 4761
**Package:** `@hojai/emotional-memory`
**Type:** Express.js REST API

The Emotional Memory Service stores and retrieves emotional timelines for entities (users, customers, agents) and tracks emotional dynamics in relationships over time. It provides trend analysis, summary statistics, and batch processing capabilities.

## Overview

This service is part of the EmotionOS platform, providing the memory layer for emotional intelligence. It maintains:

- **Entity Emotional Timelines** - Chronological history of emotions for any entity
- **Relationship Emotional Dynamics** - How emotions evolve between related entities
- **Trend Analysis** - Detection of improving, declining, or stable emotional patterns
- **Summary Statistics** - Aggregated emotional data for quick insights

## API Endpoints

### Store Emotion

Records a single emotional event for an entity.

```bash
POST /emotion
Content-Type: application/json

{
  "entityId": "user-123",
  "emotion": "joy",
  "intensity": 0.85,
  "context": "Received positive feedback on project",
  "source": "support-chat"
}
```

**Response:**
```json
{
  "success": true,
  "memory": {
    "id": "emotion-1719654321000-abc123",
    "entityId": "user-123",
    "emotion": "joy",
    "intensity": 0.85,
    "context": "Received positive feedback on project",
    "source": "support-chat",
    "timestamp": "2026-06-29T10:00:00.000Z"
  }
}
```

### Batch Store Emotions

Records multiple emotional events in a single request.

```bash
POST /emotion/batch
Content-Type: application/json

{
  "entityId": "user-123",
  "emotions": [
    { "emotion": "joy", "intensity": 0.9, "context": "Order completed" },
    { "emotion": "frustration", "intensity": 0.6, "context": "Long wait time" },
    { "emotion": "satisfaction", "intensity": 0.8, "context": "Issue resolved" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "memories": [...],
  "count": 3
}
```

### Get Emotional Timeline

Retrieves the emotional history for an entity with optional filtering.

```bash
GET /emotion/user-123?startDate=2026-01-01&endDate=2026-06-29&limit=50
```

**Response:**
```json
{
  "entityId": "user-123",
  "timeline": [
    {
      "id": "emotion-1719654321000-abc123",
      "emotion": "joy",
      "intensity": 0.85,
      "context": "Received positive feedback",
      "timestamp": "2026-06-29T10:00:00.000Z"
    }
  ],
  "trends": {
    "trend": "improving",
    "change": 0.15,
    "recentAvg": 0.72,
    "olderAvg": 0.57
  },
  "count": 1
}
```

### Get Emotional Summary

Returns aggregated statistics for an entity.

```bash
GET /emotion/user-123/summary
```

**Response:**
```json
{
  "entityId": "user-123",
  "emotionCounts": {
    "joy": 45,
    "frustration": 12,
    "satisfaction": 30
  },
  "dominantEmotion": "joy",
  "emotionCount": 45,
  "avgIntensity": 0.68,
  "totalEvents": 87,
  "firstEvent": "2026-01-15T08:30:00.000Z",
  "lastEvent": "2026-06-29T10:00:00.000Z"
}
```

### Store Relationship Emotion

Records an emotional event between two entities.

```bash
POST /relationship
Content-Type: application/json

{
  "relationshipId": "customer-agent-123-456",
  "emotion": "trust",
  "intensity": 0.9,
  "mutual": true
}
```

**Response:**
```json
{
  "success": true,
  "memory": {
    "id": "rel-emotion-1719654321000",
    "relationshipId": "customer-agent-123-456",
    "emotion": "trust",
    "intensity": 0.9,
    "mutual": true,
    "timestamp": "2026-06-29T10:00:00.000Z"
  }
}
```

### Get Relationship History

Retrieves the emotional history for a relationship.

```bash
GET /relationship/customer-agent-123-456
```

**Response:**
```json
{
  "relationshipId": "customer-agent-123-456",
  "history": [...],
  "trends": {
    "trend": "stable",
    "change": 0.02,
    "recentAvg": 0.75,
    "olderAvg": 0.73
  },
  "count": 15
}
```

### Get Entity Relationships

Lists all relationships involving an entity.

```bash
GET /relationships/user-123
```

**Response:**
```json
{
  "relationships": [
    {
      "relationshipId": "user-manager-123-789",
      "eventCount": 22,
      "currentTrend": "improving",
      "lastEmotion": { "emotion": "collaboration", "intensity": 0.8 }
    }
  ],
  "count": 1
}
```

### Query Emotional Memories

Advanced querying across multiple entities.

```bash
POST /query
Content-Type: application/json

{
  "entityIds": ["user-123", "user-456"],
  "emotion": "joy",
  "minIntensity": 0.7,
  "startDate": "2026-01-01"
}
```

**Response:**
```json
{
  "results": [
    {
      "entityId": "user-123",
      "events": [...],
      "count": 5
    }
  ],
  "totalEvents": 8
}
```

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "emotional-memory",
  "port": 4761,
  "entities": 150,
  "relationships": 42
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│  (Genie, Customer Twin, Support Copilot, AgentOS)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Emotional Memory API                       │
│                        Port: 4761                            │
├─────────────────────────────────────────────────────────────┤
│  Routes:                                                    │
│  ├── POST /emotion          - Store single emotion         │
│  ├── POST /emotion/batch    - Batch store emotions         │
│  ├── GET  /emotion/:id      - Get entity timeline          │
│  ├── GET  /emotion/:id/summary - Get entity summary        │
│  ├── POST /relationship     - Store relationship emotion   │
│  ├── GET  /relationship/:id - Get relationship history      │
│  ├── GET  /relationships/:id - Get entity relationships    │
│  ├── POST /query            - Advanced query                │
│  └── GET  /health           - Health check                 │
├─────────────────────────────────────────────────────────────┤
│  Core Functions:                                            │
│  ├── storeEmotion()        - Add emotion to timeline       │
│  ├── getTimeline()         - Retrieve with filters          │
│  ├── calculateTrends()     - Trend analysis engine          │
│  └── storeRelationshipEmotion() - Relationship tracking     │
├─────────────────────────────────────────────────────────────┤
│  In-Memory Stores:                                          │
│  ├── Map<entityId, Timeline[]>     - Entity timelines        │
│  └── Map<relationshipId, History[]> - Relationship history   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Integration with TwinOS Hub                   │
│                    (Port 4705)                              │
└─────────────────────────────────────────────────────────────┘
```

## Emotion Types

The service supports any string-based emotion identifier. Common emotions include:

| Category | Emotions |
|----------|----------|
| **Positive** | joy, satisfaction, trust, excitement, gratitude, pride, relief |
| **Negative** | frustration, anger, disappointment, sadness, fear, anxiety |
| **Neutral** | curiosity, neutrality, contemplation, anticipation |
| **Complex** | nostalgia, admiration, surprise, confusion, hope |

## Intensity Scale

Emotion intensity is a decimal value from 0.0 to 1.0:

| Range | Meaning |
|-------|---------|
| 0.0 - 0.3 | Mild |
| 0.3 - 0.6 | Moderate |
| 0.6 - 0.8 | Strong |
| 0.8 - 1.0 | Intense |

## Trend Detection

The service calculates trends by comparing recent emotional intensity averages:

| Trend | Condition | Change Threshold |
|-------|-----------|-----------------|
| `improving` | Recent avg > Older avg | > 0.2 |
| `declining` | Recent avg < Older avg | < -0.2 |
| `stable` | No significant change | -0.2 to 0.2 |
| `insufficient_data` | Less than 2 data points | - |
| `new_data` | No older data for comparison | - |

## Installation

```bash
# Navigate to service directory
cd companies/HOJAI-AI/platform/emotion/emotional-memory

# Install dependencies
npm install

# Start in development mode (with watch)
npm run dev

# Start in production
npm start
```

## Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npx vitest

# Run with coverage
npx vitest run --coverage
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4761 | Server port |
| `NODE_ENV` | development | Environment mode |

## Integration

### With TwinOS Hub

The Emotional Memory Service integrates with TwinOS Hub (port 4705) for:
- Entity identity resolution via CorpID
- Cross-service emotional context sharing
- Digital twin enrichment with emotional data

### With MemoryOS

Complementary to MemoryOS (port 4703):
- MemoryOS handles factual/procedural memory
- Emotional Memory handles emotional context and trends

### With Genie AI

Genie AI uses this service to:
- Track user emotional states over time
- Adjust responses based on emotional trends
- Detect emotional shifts requiring intervention

### With Support Copilot

Support agents use this service to:
- Understand customer emotional journey
- Prioritize high-distress interactions
- Track relationship health scores

## Data Retention

Currently uses in-memory storage. For production:
- Integrate with PostgreSQL or MongoDB for persistence
- Add TTL-based cleanup for old entries
- Implement backup/restore mechanisms

## Error Handling

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

Common status codes:
- `200` - Success
- `400` - Bad request (missing required fields)
- `500` - Internal server error

## License

Part of HOJAI AI EmotionOS Platform
