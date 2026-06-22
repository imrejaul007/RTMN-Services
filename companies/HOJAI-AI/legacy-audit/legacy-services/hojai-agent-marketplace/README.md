# Hojai Agent Marketplace

**Port:** 4860

Pre-built AI agent library for enterprises - compete with Gupshup's Agent Library.

## Features

- **Pre-built Industry Agents**: Banking, Healthcare, Restaurant, Retail, Travel, HR, E-commerce
- **Agent Templates**: Ready-to-deploy AI agents with capabilities and integrations
- **Agent Installation**: One-click install for tenants
- **Usage Tracking**: Monitor conversations, messages, API calls
- **Reviews & Ratings**: Community feedback system
- **Multi-tier Pricing**: Free, Starter, Professional, Enterprise
- **Vendor Portal**: Submit and manage agents

## Quick Start

```bash
cd hojai-ai/hojai-agent-marketplace

npm install
cp .env.example .env
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  HOJAI AGENT MARKETPLACE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   REST API (4860)                        │   │
│  │  Marketplace │ Agents │ Installations │ Reviews         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                 │
│  ┌───────────────────────────┼───────────────────────────────┐  │
│  │                   Services Layer                          │  │
│  │  MarketplaceService │ AgentTemplateService               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Data Layer (MongoDB)                    │  │
│  │  Agent │ AgentInstance │ AgentSubscription │ AgentReview  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Pre-built Agents (8 Industries)

| Industry | Agent | Features |
|----------|-------|----------|
| **Banking** | Banking Support Agent | Account inquiries, card management, transaction disputes |
| **Healthcare** | Healthcare Appointment Agent | Scheduling, symptom checker, prescription refills |
| **Restaurant** | Restaurant Ordering Agent | Orders, reservations, order tracking |
| **Retail** | Retail Shopping Assistant | Product search, size guide, recommendations |
| **Travel** | Travel Booking Agent | Flights, hotels, itinerary management |
| **HR** | HR Helpdesk Agent | Leave, policies, payroll, onboarding |
| **E-commerce** | E-commerce Support Agent | Orders, returns, refunds, tracking |
| **Sales** | Sales Lead Agent | Lead qualification, demos, proposals |

## API Endpoints

### Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketplace/stats` | Marketplace statistics |
| GET | `/api/marketplace/agents` | Search agents |
| GET | `/api/marketplace/agents/featured` | Featured agents |
| GET | `/api/marketplace/agents/trending` | Trending agents |
| GET | `/api/marketplace/agents/industry/:industry` | By industry |
| GET | `/api/marketplace/agents/category/:category` | By category |

### Agent Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/marketplace/agents` | Create agent |
| GET | `/api/marketplace/agents/:id` | Get agent |
| PUT | `/api/marketplace/agents/:id` | Update agent |
| DELETE | `/api/marketplace/agents/:id` | Delete agent |
| POST | `/api/marketplace/agents/:id/publish` | Publish agent |
| POST | `/api/marketplace/agents/:id/archive` | Archive agent |

### Installation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/marketplace/agents/:id/install` | Install agent |
| GET | `/api/marketplace/installations` | List installations |
| PUT | `/api/marketplace/installations/:id` | Update installation |
| DELETE | `/api/marketplace/installations/:id` | Uninstall agent |
| POST | `/api/marketplace/installations/:id/usage` | Track usage |

### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marketplace/agents/:id/reviews` | Get reviews |
| POST | `/api/marketplace/agents/:id/reviews` | Add review |
| POST | `/api/marketplace/reviews/:id/helpful` | Mark helpful |

### Meta

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/industries` | All industries |
| GET | `/api/categories` | All categories |
| GET | `/api/tiers` | All pricing tiers |

## Example: Install an Agent

```bash
# Search for agents
curl "http://localhost:4860/api/marketplace/agents?industry=banking"

# Install agent
curl -X POST http://localhost:4860/api/marketplace/agents/{agent_id}/install \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_123" \
  -H "X-User-Id: user_456" \
  -d '{
    "tier": "professional",
    "config": {
      "welcomeMessage": "Hello! How can I help you today?"
    }
  }'

# Track usage
curl -X POST http://localhost:4860/api/marketplace/installations/{instance_id}/usage \
  -H "Content-Type: application/json" \
  -d '{"type": "conversations"}'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4860 |
| MONGODB_URI | MongoDB URI | mongodb://localhost:27017/hojai_agent_marketplace |
| HOJAI_STUDIO_URL | Hojai Studio | http://localhost:4850 |
| HOJAI_AGENTS_URL | Hojai Agents | http://localhost:4550 |
| INTERNAL_SERVICE_TOKEN | Internal auth | - |
| RATE_LIMIT_MAX_REQUESTS | Rate limit | 100 |

## License

MIT
