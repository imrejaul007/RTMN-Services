# CompanyOS

> **Build any company in minutes with AI workers**

CompanyOS is a composition platform that assembles companies from pre-built components — departments, industry extensions, and AI workers.

## Quick Start

### 1. Start the Platform

```bash
cd companies/HOJAI-AI/platform/company-os

# Start all services
bash scripts/start-company-os.sh start

# Or use Docker
docker compose up -d
```

### 2. Access the UI

```bash
cd studio
npm install && npm run dev
```

Opens at: http://localhost:5173

### 3. Create a Company

**CLI:**
```bash
cd cli
npm install && npm run build && npm link

company-os create "My Restaurant" --industry restaurant
```

**API:**
```bash
curl -X POST http://localhost:4010/api/company/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Restaurant",
    "industry": "restaurant",
    "departments": ["finance", "hr", "marketing"],
    "ai_departments": {
      "finance": { "enabled": true, "head": "ai-cfo" }
    }
  }'
```

---

## Architecture

```
CompanyOS
├── Composition Engine      # Assembles companies from components
├── Manifest Registry      # Persists company manifests as YAML
├── Control Plane         # HTTP API server (port 4010)
├── Department Packs      # Finance, HR, Marketing, Sales, Operations, Legal
├── Industry Extensions  # Restaurant, Beauty, Hotel, Retail, Healthcare, Education
├── Service Connectors    # Connect to REZ-Merchant services
├── AI Workforce         # Deploy AI workers to companies
├── Studio (UI)          # React web app
└── CLI                  # Command-line interface
```

---

## Industries Supported

| Industry | Extensions | REZ Services |
|----------|------------|--------------|
| 🍽️ Restaurant | Menu, Kitchen, POS, Reservations | 7 services |
| 💅 Beauty | Appointments, Stylists, Memberships | 4 services |
| 🏨 Hotel | PMS, Housekeeping, Billing | 5 services |
| 🛒 Retail | POS, Inventory, Loyalty, Analytics | 6 services |
| 🏥 Healthcare | EMR, Appointments, Pharmacy, Lab | 5 services |
| 🎓 Education | LMS, Enrollment, Assessments | 5 services |
| 🏠 Real Estate | Property Management | TBD |
| 🏭 Manufacturing | Production, Quality | TBD |

---

## Department Packs

Every company gets these departments:

| Department | AI Workers |
|------------|-----------|
| Finance | AI CFO, AI Accountant, AI Treasury |
| HR | AI Recruiter, AI Payroll |
| Marketing | AI CMO, AI Content Manager |
| Sales | AI SDR, AI Closer |
| Operations | AI Ops Manager |
| Legal | AI Legal Counsel |

---

## CLI Commands

```bash
# Create company
company-os create "My Restaurant" --industry restaurant

# List companies
company-os list

# Check status
company-os status company_123

# Deploy AI worker
company-os deploy company_123 ai-cfo

# Health check
company-os health

# Generate extension
company-os generate healthcare --from restaurant
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/company/create` | POST | Create company |
| `/api/company/:id/state` | GET | Get company state |
| `/api/company/:id/manifest` | GET | Get manifest |
| `/api/company/:id` | DELETE | Delete company |
| `/api/packs` | GET | List department packs |
| `/api/extensions` | GET | List extensions |
| `/api/dependencies/:industry` | GET | Get dependencies |
| `/api/fleet/health` | GET | Fleet health |

---

## Docker Deployment

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop
docker compose down
```

---

## Directory Structure

```
company-os/
├── composition-engine/      # Core engine (46 tests)
├── manifest-registry/        # YAML persistence (24 tests)
├── control-plane/           # HTTP API
├── department-packs/        # 6 department packs
│   └── finance/            # Full implementation (9 tests)
├── industry-extensions/     # Industry-specific
│   └── restaurant/          # Restaurant (15 tests)
├── service-connectors/      # 6 connectors
├── ai-workforce/           # 10 AI workers (23 tests)
├── studio/                 # React UI
├── cli/                    # CLI commands
└── scripts/               # Startup scripts
```

---

## Tests

```bash
# Run all tests
npm test

# Run specific module
cd composition-engine && npm test
cd manifest-registry && npm test
cd department-packs/finance && npm test
```

**Total: 117 tests passing**

---

## Service Ports

| Service | Port |
|---------|------|
| Control Plane | 4010 |
| Finance Pack | 4801 |
| Restaurant Extension | 5010 |
| Studio UI | 5173 |
| Redis | 6379 |

---

## REZ Services Connected

Connectors available for 32+ REZ-Merchant services:

```typescript
import { getConnector } from '@hojai/service-connectors';

const restaurant = getConnector('restaurant', tenant);
const menu = await restaurant.getMenu();

const hotel = getConnector('hotel', tenant);
const rooms = await hotel.checkAvailability('2026-07-01', '2026-07-03');

const retail = getConnector('retail', tenant);
const sale = await retail.createSale({ items: [...], cashierId: '...' });
```

---

## Contributing

1. Create industry extension: `cli generate <industry> --from restaurant`
2. Add service connector: `src/service-connectors/<industry>-connector.ts`
3. Add tests
4. Update this README

---

## License

MIT
