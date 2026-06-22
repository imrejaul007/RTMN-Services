# AdBazaar Support SLA Service

SLA tracking and breach alerts for AdBazaar support operations.

## Features

- SLA configuration for first response and resolution
- Priority-based SLA targets
- Warning threshold alerts
- Breach detection and recording
- Alert management (email, SMS, push, webhook)
- SLA analytics and compliance tracking
- Pause and resume SLA functionality

## API Endpoints

### SLA Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sla` | Create a new SLA |
| GET | `/api/sla` | List SLAs with filters |
| GET | `/api/sla/:id` | Get SLA by ID |
| PUT | `/api/sla/:id` | Update SLA |
| POST | `/api/sla/:id/met` | Mark SLA as met |
| POST | `/api/sla/:id/pause` | Pause SLA |
| POST | `/api/sla/:id/resume` | Resume SLA |
| GET | `/api/sla/ticket/:ticketId/status` | Get SLA status for ticket |

### Breaches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sla/breaches` | Get all SLA breaches |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sla/analytics` | Get SLA analytics |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sla/alerts` | Create a new alert |
| GET | `/api/sla/alerts/:id` | Get alert by ID |
| POST | `/api/sla/alerts/:id/acknowledge` | Acknowledge alert |

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 5085 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/support-sla |
| LOG_LEVEL | Logging level | info |
| SERVICE_API_KEY | API key for authentication | adbazaar-service-key |
| INTERNAL_SERVICE_TOKEN | Internal service token | - |

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Health Check

```bash
curl http://localhost:5085/health
```

## Metrics

Prometheus metrics available at `/metrics`.

## License

Proprietary - AdBazaar