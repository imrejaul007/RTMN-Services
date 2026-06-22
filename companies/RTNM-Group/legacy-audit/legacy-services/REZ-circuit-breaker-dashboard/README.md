# REZ Circuit Breaker Dashboard

Real-time monitoring dashboard for circuit breakers across the REZ ecosystem microservices.

## Overview

This service provides comprehensive monitoring of circuit breaker states, service health, failure tracking, and alerting for all REZ platform services. It uses WebSocket connections for real-time updates and maintains historical data in Redis.

## Features

- **Real-time Circuit Breaker Monitoring**
  - Track OPEN/HALF_OPEN/CLOSED states for all services
  - Visual representation of circuit health
  - Automatic state transitions based on failure thresholds

- **Service Health Monitoring**
  - HTTP health checks against all registered services
  - Response time tracking
  - Uptime percentage calculations
  - Status categorization (healthy/degraded/unhealthy/unknown)

- **Failure Tracking**
  - Historical failure records with error details
  - Failure rate calculations
  - Pattern detection

- **Alert System**
  - Configurable alerts for circuit state changes
  - High failure rate notifications
  - Slow response warnings
  - Service down alerts
  - Multi-channel support (Slack, Webhook, Email)

- **Recovery Tracking**
  - Auto-recovery detection
  - Downtime duration tracking
  - Manual intervention records

- **Real-time WebSocket Updates**
  - Live dashboard updates
  - Push notifications for state changes
  - Efficient event-driven architecture

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REZ Circuit Breaker Dashboard                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Express    │  │  Socket.IO  │  │   Health Aggregator     │ │
│  │  REST API   │  │  WebSocket │  │   (Periodic Checks)     │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │                │
│  ┌──────▼────────────────▼──────────────────────▼─────────────┐  │
│  │                    Services Layer                          │  │
│  │  ┌─────────────────┐ ┌─────────────┐ ┌────────────────┐  │  │
│  │  │ Circuit Breaker │ │ Alert       │ │ Health         │  │  │
│  │  │ Monitor         │ │ Manager     │ │ Aggregator     │  │  │
│  │  └────────┬────────┘ └──────┬──────┘ └───────┬────────┘  │  │
│  └───────────┼─────────────────┼────────────────┼───────────┘  │
│              │                 │                │                │
│  ┌───────────▼─────────────────▼────────────────▼───────────┐  │
│  │                    Redis (State Storage)                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    REZ Ecosystem Services                  │  │
│  │  RABTUL | REZ-Media | RTNM-Group | REZ-Intelligence     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Redis server (local or remote)

### Installation

```bash
# Navigate to project directory
cd /Users/rejaulkarim/Documents/ReZ\ Full\ App/RTNM-Group/REZ-circuit-breaker-dashboard

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Set REDIS_URL, service URLs, and alert configurations

# Build TypeScript
npm run build

# Start the service
npm start
```

### Development Mode

```bash
npm run dev
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Dashboard server port | `4028` |
| `NODE_ENV` | Environment mode | `development` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `HEALTH_CHECK_INTERVAL` | Health check interval (ms) | `15000` |
| `CIRCUIT_FAILURE_THRESHOLD` | Failures before opening | `5` |
| `CIRCUIT_SUCCESS_THRESHOLD` | Successes to close | `3` |
| `CIRCUIT_TIMEOUT_MS` | Half-open timeout (ms) | `60000` |
| `ALERT_SLACK_WEBHOOK_URL` | Slack webhook for alerts | - |
| `ALERT_WEBHOOK_URL` | Generic webhook for alerts | - |
| `INTERNAL_SERVICE_TOKEN` | Internal auth token | Required |

## API Endpoints

### Dashboard & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard` | Complete dashboard data |
| GET | `/api/v1/health` | Aggregate health statistics |
| GET | `/api/v1/services/summary` | Services by category |

### Circuits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/circuits` | All circuit breaker states |
| GET | `/api/v1/circuits/stats` | Circuit statistics |
| GET | `/api/v1/circuits/:name` | Specific circuit details |
| POST | `/api/v1/circuits/:name/action` | Force state or reset |

### Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/services` | All service health statuses |
| GET | `/api/v1/services/:name` | Specific service health |
| POST | `/api/v1/services/:name/check` | Force health check |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/alerts` | All alerts |
| GET | `/api/v1/alerts/config` | Alert configurations |
| POST | `/api/v1/alerts/config` | Create/update alert config |
| POST | `/api/v1/alerts/:id/acknowledge` | Acknowledge alert |

### Failures & Recoveries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/failures` | Failure records |
| GET | `/api/v1/recoveries` | Recovery records |

## Circuit Breaker States

### CLOSED (Normal Operation)
- All requests pass through to the service
- Failures are counted
- Circuit opens after reaching failure threshold

### OPEN (Failing)
- All requests are blocked (fail fast)
- No calls reach the service
- After timeout, transitions to HALF_OPEN

### HALF_OPEN (Testing)
- Limited requests pass through to test recovery
- Successes are counted
- Closes after reaching success threshold
- Any failure returns to OPEN

## Circuit Breaker Configuration

Each circuit has configurable thresholds:

```typescript
{
  failureThreshold: 5,      // Failures before opening
  successThreshold: 3,     // Successes to close
  timeout: 60000,          // ms before half-open
  resetTimeout: 30000,     // ms between reset attempts
  halfOpenMaxCalls: 5      // Max calls in half-open
}
```

## WebSocket Events

Connect to `/socket.io` for real-time updates:

```javascript
const socket = io();

socket.on('event', (event) => {
  switch (event.type) {
    case 'circuit_state_changed':
      // Handle circuit state change
      break;
    case 'service_health_changed':
      // Handle health status update
      break;
    case 'alert_created':
      // Handle new alert
      break;
    case 'health_stats_updated':
      // Handle stats update
      break;
    case 'recovery_detected':
      // Handle service recovery
      break;
  }
});

// Subscribe to specific circuits
socket.emit('subscribe:circuit', 'payment-service');

// Subscribe to services
socket.emit('subscribe:service', 'payment-service');

// Subscribe to categories
socket.emit('subscribe:category', 'RABTUL');

// Force health check
socket.emit('force:healthcheck');           // All services
socket.emit('force:healthcheck', 'payment-service'); // Specific service
```

## Alert Types

| Type | Severity | Trigger |
|------|----------|---------|
| `circuit_open` | Critical/High | Circuit transitions to OPEN |
| `circuit_close` | Low | Circuit returns to CLOSED |
| `circuit_half_open` | Medium | Circuit enters HALF_OPEN |
| `high_failure_rate` | High/Critical | Failure rate exceeds threshold |
| `slow_response` | Medium | Response time exceeds threshold |
| `service_down` | Critical | Multiple consecutive failures |

## Monitored Services

### RABTUL (Shared Infrastructure)
- Auth Service
- Payment Service
- Wallet Service
- Order Service
- Notifications Service
- Search Service
- Analytics Service
- And more...

### RTNM-Group (Core Platform)
- DOOH Service
- Support Dashboard
- Attribution Platform

### REZ-Media (Advertising & Marketing)
- Shopify Connector
- WooCommerce Connector
- Prompt Workflow AI
- Voice Cart Recovery
- CRM Hub
- Support Tools Hub

### REZ-Intelligence (AI/ML)
- RFM Service
- Research Opportunity Agent

## Dashboard UI

Access the web dashboard at `http://localhost:4028`

Features:
- Real-time circuit state visualization
- Service health cards with response times
- Alert history with acknowledgment
- Filtering by state, category, and status
- Force health checks
- Manual circuit state intervention

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 4028
CMD ["node", "dist/index.js"]
```

### Production Considerations

1. **Redis**: Use a managed Redis (ElastiCache, Redis Cloud) for production
2. **Scaling**: Deploy multiple instances behind a load balancer
3. **Monitoring**: Integrate with Sentry for error tracking
4. **Security**: Enable CORS restrictions and use valid INTERNAL_SERVICE_TOKEN
5. **Logging**: Configure Winston to write to centralized logging

## License

MIT
