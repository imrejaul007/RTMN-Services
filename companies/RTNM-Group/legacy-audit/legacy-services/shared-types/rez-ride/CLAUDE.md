# Claude Code Configuration - ReZ Ride

---

## Service Discovery

This service is registered in REZ-Master/services.json.

To discover related services:
```bash
# From REZ-Master directory
node rez-cli find <service-name>  # Find specific service
node rez-cli list --category <category>  # List by category
node rez-cli stats  # Platform statistics
```

Quick search:
- `node rez-cli list --search payment` - Find payment services
- `node rez-cli list --search auth` - Find auth services
- `node rez-cli list --search kds` - Find KDS services
- `node rez-cli list --search ai` - Find AI services

---



## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new file
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to the root folder
- Never continuously check status after spawning a swarm — wait for results
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files

## File Organization

- NEVER save to root folder — use the directories below
- Use `/src` for source code files
- Use `/tests` for test files
- Use `/docs` for documentation and markdown files
- Use `/config` for configuration files
- Use `/scripts` for utility scripts
- Use `/examples` for example code

## Project Architecture

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Use event sourcing for state changes
- Ensure input validation at system boundaries

### Project Config

- **Topology:** hierarchical-mesh
- **Max Agents:** 15
- **Memory:** hybrid
- **HNSW:** Enabled
- **Neural:** Enabled

## Build & Test

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries
- Always sanitize file paths to prevent directory traversal

## Integrations

This service integrates with:
- **ReZ Auth** — User/driver authentication (shared auth service)
- **ReZ Wallet** — Payments, cashback, driver payouts
- **ReZ Mind** — User intent analysis for ad targeting
- **AdsBazaar** — Ad marketplace, creative serving
- **Maps API** — Routing, ETA, geocoding

See `docs/INTEGRATIONS.md` for integration details.

## Documentation

All project documentation is in `/docs`:

| Document | Description |
|----------|-------------|
| `README.md` | Product overview and quick start |
| `PRODUCT-CONCEPT.md` | Business model and value proposition |
| `BUSINESS-LOGIC.md` | Revenue, fares, cashback, driver earnings |
| `USER-FLOWS.md` | All user journeys (user, driver, admin) |
| `TECHNICAL-ARCHITECTURE.md` | System design and services |
| `DATABASE-SCHEMA.md` | Data models and relationships |
| `INTEGRATIONS.md` | External service integration details |
| `SCREEN-SPEC.md` | Vehicle screen hardware and app specs |
| `MVP-SCOPE.md` | Phased development plan |

## Quick Start (When Ready to Build)

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run development server
npm run dev

# Run tests
npm test
```

## Development Guidelines

### Ride State Machine

```
ride.states:
  - requested     → Driver assignment pending
  - assigned      → Driver confirmed, en route
  - accepted      → Driver arrived, waiting
  - in_progress   → Ride active
  - completed     → Ride finished
  - cancelled     → Ride cancelled
```

### Driver State Machine

```
driver.states:
  - offline       → Not accepting rides
  - online        → Available for rides
  - riding        → Currently on a ride
  - busy          → Temporarily unavailable
```

### Ad Impression Tracking

```
Every ride generates:
- ride_id, driver_id, user_id
- campaign_id, creative_id
- served_at (timestamp)
- viewed_duration (seconds)
- interacted (boolean)
- cashback_generated (₹)
- revenue_amount (₹)
```

## Brand Identity

- **Name:** ReZ Ride
- **Tagline:** "Rides that pay you back"
- **Color:** TBD
- **Platforms:** iOS, Android, Driver App, Vehicle Screen
