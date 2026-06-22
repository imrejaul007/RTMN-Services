# REZ Cosmic Twin

**Port:** 5005

Digital twin service that represents the complete state of a company, person, or entity in real-time. Part of the Axom Company Brain platform.

## Features

- **Entity Digital Twin** - Complete state representation of any entity
- **Real-time Sync** - Live updates via WebSocket
- **State Machine** - Track entity lifecycle states
- **Event Sourcing** - All state changes as immutable events
- **Snapshot & Restore** - Point-in-time state recovery
- **Relationship Graph** - Entity relationships and connections
- **Memory Integration** - Connect to company memory layers

## Architecture

```
Digital Twin
├── Twin Registry       # Entity metadata
├── State Store         # Current state
├── Event Store         # Change history
├── Relationship Graph  # Entity connections
├── Sync Engine         # Real-time WebSocket
└── Snapshot Service    # State recovery
```

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Twins

```bash
# Create digital twin
POST /twins
{
  "type": "company",
  "name": "Acme Corp",
  "metadata": { "industry": "tech", "founded": 2020 },
  "state": { "employees": 50, "revenue": 1000000 }
}

# Get twin state
GET /twins/:id

# Update twin state
PATCH /twins/:id
{
  "state": { "employees": 75, "revenue": 1500000 }
}

# Get event history
GET /twins/:id/history

# Create snapshot
POST /twins/:id/snapshot

# Restore to snapshot
POST /twins/:id/restore
{
  "snapshotId": "snap_123"
}
```

### Relationships

```bash
# Get relationships
GET /twins/:id/relationships

# Add relationship
POST /twins/:id/relationships
{
  "targetId": "entity_456",
  "type": "owns",
  "metadata": { "since": "2024-01-01" }
}
```

## Digital Twin Model

```typescript
interface DigitalTwin {
  id: string;
  type: TwinType;
  name: string;
  
  // State
  state: Record<string, unknown>;
  metadata: Record<string, unknown>;
  
  // Relationships
  relationships: Relationship[];
  
  // Sync
  lastSync: Date;
  version: number;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

type TwinType = 'company' | 'person' | 'product' | 'location' | 'event';

interface Relationship {
  id: string;
  targetId: string;
  targetType: string;
  type: RelationshipType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

type RelationshipType = 
  | 'owns' 
  | 'manages' 
  | 'works_for' 
  | 'sells_to' 
  | 'buys_from'
  | 'parent_of'
  | 'subsidiary_of'
  | 'partnered_with';
```

## Event Sourcing

Every state change creates an immutable event:

```typescript
interface TwinEvent {
  id: string;
  twinId: string;
  timestamp: Date;
  action: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  source: string;
  version: number;
}
```

## Real-time Updates (WebSocket)

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:5005/ws');

// Subscribe to twin updates
ws.send(JSON.stringify({
  action: 'subscribe',
  twinId: 'twin_123'
}));

// Receive updates
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(update);
};
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5005 |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017/rez-cosmic-twin |
| `REDIS_URL` | Redis URL | redis://localhost:6379 |
| `NODE_ENV` | Environment | development |

## Health Checks

```bash
curl http://localhost:5005/health
curl http://localhost:5005/health/ready
```

## License

MIT
