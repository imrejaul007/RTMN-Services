# Behavior Intelligence Service

**Port:** 4788  
**Package:** `@hojai/behavior-intelligence`

Enterprise-grade behavior analysis and pattern detection service.

## Features

- **Event Tracking**: Track user/customer behavior events
- **User Profiles**: Behavioral scoring and trait analysis
- **Anomaly Detection**: Identify unusual behavior patterns
- **Funnel Analytics**: Track conversion funnels
- **Pattern Recognition**: Discover recurring behavior patterns

## Quick Start

```bash
npm install
npm run dev
```

## API Endpoints

### Events

```bash
# Track event
POST /api/events
{
  "entityId": "user-123",
  "eventType": "page_view",
  "properties": { "page": "/dashboard" }
}

# Get events
GET /api/events/:entityId
```

### Profiles

```bash
# Get profile
GET /api/profiles/:entityId

# Update profile
PUT /api/profiles/:entityId
```

### Anomalies

```bash
# Get anomalies
GET /api/anomalies/:entityId

# Create anomaly alert
POST /api/anomalies
```

### Funnels

```bash
# Create funnel
POST /api/funnels

# Track funnel
POST /api/funnels/:id/track

# Get funnel metrics
GET /api/funnels/:id/metrics
```

## Configuration

```bash
PORT=4788
JWT_SECRET=your-secret
```

## Testing

```bash
npm test
```

## License

MIT
