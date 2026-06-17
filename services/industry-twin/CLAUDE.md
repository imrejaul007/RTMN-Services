# Industry Twin Service

**Version:** 1.0.0
**Port:** 4893
**Status:** Ready for Development

## Overview

The Industry Twin service provides domain-specific knowledge for different industries within the RTMN ecosystem. It serves as a centralized knowledge base containing industry profiles, compliance requirements, benchmarks, best practices, and domain intelligence.

## Industry Types Supported

| Industry | Type | Description |
|----------|------|-------------|
| Restaurant | `restaurant` | Restaurants, cafes, food service |
| Hotel | `hotel` | Hotels, hospitality, lodging |
| Healthcare | `healthcare` | Hospitals, clinics, medical practices |
| Retail | `retail` | Stores, e-commerce, marketplaces |
| Manufacturing | `manufacturing` | Production, factories, supply chain |
| Fintech | `fintech` | Financial services, payments, banking |

## Quick Start

```bash
# Install dependencies
cd services/industry-twin
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
PORT=4893
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/industry-twin
SERVICE_NAME=industry-twin
SERVICE_VERSION=1.0.0
LOG_LEVEL=info
```

## API Endpoints

### Health Check
```
GET /health
```

### Industry Profiles
```
GET    /api/industry                    # List all industry profiles
GET    /api/industry/:industryType      # Get profile by type
POST   /api/industry                    # Create profile
PUT    /api/industry/:industryType      # Update profile
GET    /api/industry/:industryType/issues     # Get critical issues
GET    /api/industry/:industryType/kpis/:category  # Get KPIs by category
GET    /api/industry/types/list         # List supported types
```

### Domain Knowledge
```
GET    /api/knowledge                          # List all knowledge
GET    /api/knowledge/:id                      # Get by ID
GET    /api/knowledge/category/:industryType/:category  # Get by category
GET    /api/knowledge/search/:industryType?q=  # Search knowledge
POST   /api/knowledge                          # Create knowledge
PUT    /api/knowledge/:id                      # Update knowledge
DELETE /api/knowledge/:id                      # Delete knowledge
GET    /api/knowledge/meta/categories          # List categories
```

### Compliance
```
GET    /api/compliance                    # List compliance records
GET    /api/compliance/:industryType      # Get compliance by type
POST   /api/compliance                    # Create compliance record
GET    /api/compliance/:industryType/score              # Get compliance score
GET    /api/compliance/:industryType/critical-findings  # Get critical findings
GET    /api/compliance/:industryType/expiring-certifications  # Get expiring certs
PATCH  /api/compliance/:industryType/requirements/:requirementId  # Update requirement
POST   /api/compliance/:industryType/audit-findings     # Add audit finding
GET    /api/compliance/meta/frameworks     # List compliance frameworks
```

### Benchmarks
```
GET    /api/benchmarks                    # List benchmarks
GET    /api/benchmarks/latest?industryType=  # Get latest benchmark
GET    /api/benchmarks/history?industryType=&limit=  # Get historical
GET    /api/benchmarks/:id                # Get by ID
POST   /api/benchmarks                    # Create benchmark
PUT    /api/benchmarks/:id                # Update benchmark
GET    /api/benchmarks/:id/tier           # Get performance tier
GET    /api/benchmarks/:id/metric/:metricName  # Get metric comparison
GET    /api/benchmarks/meta/benchmarks/:industryType  # Get benchmark templates
```

## Authentication & Multi-Tenancy

All API requests require the `X-Tenant-ID` header for multi-tenant isolation:

```bash
curl -H "X-Tenant-ID: tenant-123" http://localhost:4893/api/industry
```

## Data Models

### IndustryProfile
- Common issues per industry
- Best practices
- KPIs (Key Performance Indicators)
- Technology recommendations
- Maturity level
- Trends

### DomainKnowledge
- Industry-specific terminology
- Process workflows
- Key concepts
- Resources and tools
- Knowledge categories

### Compliance
- Regulatory frameworks
- Regulations and requirements
- Audit history
- Certifications
- Compliance scores

### Benchmark
- Performance comparisons
- Industry averages
- Top performer practices
- Improvement areas

### Industry-Specific Entities

#### Restaurant
- Menu items with costs/margins
- Table management
- Kitchen stations
- Orders and reservations
- Restaurant-specific metrics

#### Hotel
- Room inventory
- Housekeeping tasks
- Guest profiles with loyalty
- Bookings and reservations
- Hotel-specific metrics (ADR, RevPAR)

#### Healthcare
- Patient records
- Healthcare providers
- Appointments
- Medical records
- Billing records
- Medical supplies inventory

#### Retail
- Product catalog
- Store locations
- Customer profiles
- Shopping carts
- Orders
- Promotions
- Suppliers

## Domain Intelligence

The service includes built-in domain intelligence for each industry:

```typescript
import { DomainIntelligenceService } from './services/domainIntelligence';

// Get all intelligence for an industry
const intelligence = DomainIntelligenceService.getIntelligence('restaurant');

// Get critical insights
const insights = DomainIntelligenceService.getCriticalInsights('hotel');

// Get technology stack recommendations
const tech = DomainIntelligenceService.getTechnologyStack('retail');

// Get key metrics
const metrics = DomainIntelligenceService.getMetrics('manufacturing');
```

## Performance Tiers

Benchmarks use a 5-tier performance classification:

| Tier | Score Range | Description |
|------|-------------|-------------|
| Top | 90-100 | Best-in-class performers |
| Above Average | 75-89 | Strong performers |
| Average | 50-74 | Typical industry performance |
| Below Average | 25-49 | Below typical performance |
| Bottom | 0-24 | Poor performance |

## Compliance Status

| Status | Description |
|--------|-------------|
| `compliant` | Requirement is met |
| `non_compliant` | Requirement not met |
| `in_progress` | Working toward compliance |
| `not_applicable` | Requirement does not apply |

## Error Handling

All API responses follow this format:

```json
{
  "success": true|false,
  "data": {...},
  "error": "Error message",
  "requestId": "uuid"
}
```

## Logging

The service uses Winston for structured logging:

```typescript
logger.info({ message: 'Request received', path: '/api/industry' });
logger.error({ message: 'Database error', error: err.message });
```

## Testing

```bash
npm test
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Render (render.yaml)

```yaml
services:
  - type: web
    name: industry-twin
    env: node
    region: oregon
    plan: starter
    envVars:
      - key: PORT
        value: 4893
      - key: MONGODB_URI
        sync: false
```

## Related Services

- **REZ-ecosystem-connector** (4399) - Service Registry
- **REZ-event-bus** (4510) - Event Messaging
- **REZ-graphql-federation** (4000) - GraphQL API
- **memory-os** (4703) - AI Memory
- **goal-os** (4242) - Goals Management

## Monitoring

- Health endpoint: `GET /health`
- Prometheus metrics available at `/metrics`
- Structured JSON logging for log aggregation

## Future Enhancements

- [ ] Machine learning for predictive insights
- [ ] Real-time industry trend analysis
- [ ] Automated compliance monitoring
- [ ] Custom benchmark comparisons
- [ ] Integration with external data sources
- [ ] AI-powered knowledge graph

---

**Last Updated:** June 2026
**RTMN-Services - Industry Twin**
