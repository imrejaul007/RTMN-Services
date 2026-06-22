# AdBazaar Support Escalation Service

Intelligent ticket escalation routing for AdBazaar support operations.

## Features

- Multi-level escalation (Level 1-3, Management, Executive)
- Rule-based automatic escalation
- Escalation history tracking
- Configurable escalation rules
- Cooldown periods between escalations
- Condition-based rule evaluation

## API Endpoints

### Escalations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/escalations` | Create a new escalation |
| GET | `/api/escalations` | List escalations with filters |
| GET | `/api/escalations/:id` | Get escalation by ID |
| POST | `/api/escalations/:id/escalate` | Escalate to next level |
| POST | `/api/escalations/:id/resolve` | Resolve escalation |
| POST | `/api/escalations/:id/cancel` | Cancel escalation |
| GET | `/api/escalations/:id/history` | Get escalation history |
| GET | `/api/escalations/ticket/:ticketId/history` | Get ticket escalation history |
| POST | `/api/escalations/evaluate` | Evaluate rules (internal) |

### Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/escalations/rules` | Create a new rule |
| GET | `/api/escalations/rules` | List all rules |
| GET | `/api/escalations/rules/:id` | Get rule by ID |
| PUT | `/api/escalations/rules/:id` | Update rule |
| DELETE | `/api/escalations/rules/:id` | Delete rule |
| POST | `/api/escalations/rules/:id/toggle` | Toggle rule active status |
| POST | `/api/escalations/rules/reorder` | Reorder rule priorities |
| POST | `/api/escalations/rules/:id/test` | Test rule (dry run) |

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 5084 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/support-escalation |
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
curl http://localhost:5084/health
```

## Metrics

Prometheus metrics available at `/metrics`.

## License

Proprietary - AdBazaar