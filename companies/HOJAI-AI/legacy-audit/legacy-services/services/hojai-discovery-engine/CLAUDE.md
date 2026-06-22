# CLAUDE.md - Discovery Engine

## Project Overview

**Name:** hojai-discovery-engine
**Type:** SUTAR OS - Discovery Layer
**Port:** 4256
**Company:** HOJAI AI
**Part of:** SUTAR OS Phase 6 - Discovery
**Lines:** 382
**Status:** ✅ PRODUCTION READY

## What is Discovery Engine?

Discovery Engine enables intelligent matching between agents (suppliers, buyers, service providers) based on multiple criteria including capabilities, location, trust, and price.

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- MongoDB/Mongoose

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4256 | Service port |
| MONGODB_URI | Yes | - | MongoDB connection |

## Features

### 1. Agent Registry

| Feature | Description |
|---------|-------------|
| **Agent Registration** | Register agents with capabilities |
| **Agent Types** | supplier, buyer, service, logistics, manufacturer, distributor |
| **Capability Tags** | Define capabilities |
| **Location Data** | City, state, country, coordinates |
| **Pricing** | Min/max price range |
| **Trust Score** | Link to trust scorer |
| **Rating & Reviews** | Track reputation |
| **Verification** | Verified badge support |
| **Metadata** | Custom metadata support |

### 2. Agent Types

| Type | Description |
|------|-------------|
| supplier | Product suppliers |
| buyer | Product buyers |
| service | Service providers |
| logistics | Logistics/delivery providers |
| manufacturer | Manufacturers |
| distributor | Distributors |

### 3. Discovery Matching

#### Category Match
| Feature | Description |
|---------|-------------|
| Industry Match | Match by industry |
| Product Category | Match by product category |
| Service Type | Match by service type |

#### Capability Match
| Feature | Description |
|---------|-------------|
| Capability Matching | Match by capabilities |
| Match Percentage | Calculate match score |
| Missing Capabilities | Identify gaps |

#### Location Match
| Feature | Description |
|---------|-------------|
| City Match | Match by city |
| State Match | Match by state |
| Country Match | Match by country |
| Radius Search | Match within distance |

#### Trust Match
| Feature | Description |
|---------|-------------|
| Trust Score Filter | Filter by minimum trust |
| Verified Filter | Only verified agents |
| Tier Filter | Filter by tier |

#### Price Match
| Feature | Description |
|---------|-------------|
| Min/Max Price | Match by price range |
| Budget Compatible | Match within budget |

### 4. Match Scoring

| Feature | Description |
|---------|-------------|
| **Match Score** | Calculated match percentage |
| **Trust Boost** | Verified = +20 points |
| **Capability Boost** | Each matching capability = +5 points |
| **Ranking** | Sort by match score |

### 5. Discovery Logging

| Feature | Description |
|---------|-------------|
| **Query Logging** | Log all discovery queries |
| **Filter Tracking** | Track applied filters |
| **Results Count** | Track result counts |
| **Selection Tracking** | Track which agent was selected |

### 6. Multi-criteria Search

| Feature | Description |
|---------|-------------|
| **Combined Filters** | Apply multiple filters |
| **Capability + Location** | Location-aware capability search |
| **Trust + Price** | Trust-filtered price search |
| **Custom Queries** | Flexible search parameters |

## API Endpoints

### Agent Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents` | Register agent |
| GET | `/api/agents` | List agents |
| GET | `/api/agents/:id` | Get agent details |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |

### Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/discover` | Multi-criteria search |

### Match Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/match/capability` | Match by capability |
| POST | `/api/match/location` | Match by location |
| POST | `/api/match/trust` | Match by trust |
| POST | `/api/match/price` | Match by price |

## Discovery Request

```typescript
interface DiscoveryRequest {
  query?: string;
  type?: AgentType;
  capabilities?: string[];
  industry?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  maxDistance?: number;  // km
  minRating?: number;
  minTrust?: number;
  priceRange?: {
    min?: number;
    max?: number;
  };
  verified?: boolean;
  limit?: number;
  tenantId: string;
}
```

## Agent Schema

```typescript
interface Agent {
  agentId: string;
  name: string;
  type: AgentType;
  industry: string[];
  capabilities: string[];
  location: {
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  rating: number;
  reviews: number;
  trustScore: number;
  verified: boolean;
  pricing: {
    min: number;
    max: number;
    currency: string;
  };
  tags: string[];
  metadata: Record<string, unknown>;
}
```

## Integration

### Upstream
- Agent registration
- Trust Scorer
- User searches

### Downstream
- Negotiation Engine
- ContractOS
- Order Management

## Health Endpoints

- `GET /health` - Health check
- `GET /health/ready` - Readiness probe

## File Structure

```
hojai-discovery-engine/
├── src/
│   └── index.ts                    # Main server (all-in-one)
├── package.json
├── tsconfig.json
└── CLAUDE.md (this file)
```

## Notes

- Discovery Engine matches agents intelligently
- Multi-criteria matching
- Trust-based filtering
- Location-aware search
