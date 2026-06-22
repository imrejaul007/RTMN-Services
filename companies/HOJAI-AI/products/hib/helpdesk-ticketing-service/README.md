# AdBazaar Helpdesk Ticketing Service

Full ticketing system with SLA management for AdBazaar support operations.

## Features

- Create, read, update, and manage support tickets
- SLA tracking with automatic breach detection
- Ticket assignment (direct, team, round-robin, load-balanced)
- Comment system with public/internal/system types
- Priority-based SLA configuration
- Comprehensive filtering and search

## API Endpoints

### Tickets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets` | Create a new ticket |
| GET | `/api/tickets` | List tickets with filters |
| GET | `/api/tickets/:id` | Get ticket by ID |
| PUT | `/api/tickets/:id` | Update ticket |
| POST | `/api/tickets/:id/assign` | Assign ticket to agent/team |
| POST | `/api/tickets/:id/respond` | Add response to ticket |
| GET | `/api/tickets/:id/comments` | Get ticket comments |
| GET | `/api/tickets/:id/assignments` | Get ticket assignments |
| POST | `/api/tickets/:id/resolve` | Resolve ticket |
| POST | `/api/tickets/:id/close` | Close ticket |
| GET | `/api/tickets/stats` | Get ticket statistics |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (open, in_progress, resolved, closed) |
| priority | string | Filter by priority (critical, high, medium, low) |
| category | string | Filter by category |
| assignedTo | string | Filter by assigned agent |
| assignedTeam | string | Filter by assigned team |
| customerId | string | Filter by customer |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| sortBy | string | Sort field (default: createdAt) |
| sortOrder | string | Sort order (asc/desc, default: desc) |

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 5082 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/helpdesk-ticketing |
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
curl http://localhost:5082/health
```

## Metrics

Prometheus metrics available at `/metrics`.

## License

Proprietary - AdBazaar