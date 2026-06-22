# Memory Passport Service

**HOJAI AI - Unified Memory Layer**

The Memory Passport Service is a unified memory layer for HOJAI AI that brings all customer interactions into one place. It provides a comprehensive view of each customer's journey across multiple companies and channels.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Configuration](#configuration)
- [Development](#development)

## Overview

The Memory Passport Service creates and maintains a "passport" for each customer that contains:

- **Memories**: Individual memory items (conversations, preferences, interactions)
- **Interactions**: All interactions across channels (WhatsApp, web, mobile, call, etc.)
- **Company Contexts**: Customer data specific to each company they interact with
- **Memory Graph**: Relationship graph connecting customers, companies, issues, and resolutions
- **Health Metrics**: Customer health scores, engagement scores, and churn risk

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Memory Passport Service                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Express    │  │   Routes     │  │    Middleware        │   │
│  │   Server     │──│   Layer      │──│  (Auth, Rate Limit)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                           │                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Service Layer                           │   │
│  ├──────────────┬──────────────┬──────────────┬─────────────┤   │
│  │ Passport     │  Context     │ Memory Graph │ Encryption  │   │
│  │ Service      │  Service     │  Service     │  Service    │   │
│  └──────────────┴──────────────┴──────────────┴─────────────┘   │
│                           │                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Data Layer                              │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────┐  │   │
│  │  │  MongoDB        │    │  In-Memory Graph            │  │   │
│  │  │  (Persistent)   │    │  (Customer Memory Graph)     │  │   │
│  │  └─────────────────┘    └─────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Description |
|-----------|-------------|
| `PassportService` | Core CRUD operations for passports and memories |
| `ContextService` | Builds conversation context, preferences, sentiment analysis |
| `MemoryGraphService` | Manages customer-company-issue-resolution graph |
| `EncryptionService` | Handles PII encryption/decryption |
| `Validation` | Request validation using Zod schemas |

## Features

### Core Features

- **Unified Memory Storage**: Store all customer interactions in one place
- **Multi-Company Support**: Link customers to multiple companies with context
- **Memory Graph**: Track relationships between customers, companies, products, and issues
- **Semantic Search**: Full-text search across all memories
- **Sentiment Analysis**: Track sentiment over time with trend detection
- **Pattern Detection**: Identify recurring issues, preferences, and behaviors
- **Health Scoring**: Calculate customer health scores based on multiple factors
- **PII Encryption**: Encrypt sensitive customer data at rest

### Memory Types

| Type | Description |
|------|-------------|
| `conversation` | AI/human conversation summaries |
| `preference` | Customer preferences |
| `interaction` | General interactions |
| `feedback` | Feedback (positive/negative) |
| `complaint` | Customer complaints |
| `compliment` | Customer compliments |
| `purchase` | Purchase history |
| `support` | Support tickets |
| `personal` | Personal information |
| `behavioral` | Behavioral patterns |
| `contextual` | Contextual data |
| `sentiment` | Sentiment snapshots |

### Interaction Channels

| Channel | Description |
|---------|-------------|
| `whatsapp` | WhatsApp messaging |
| `web` | Web chat/forms |
| `mobile_app` | Mobile application |
| `call` | Phone calls |
| `email` | Email communication |
| `in_person` | In-person interactions |
| `chatbot` | Automated chatbot |
| `api` | API interactions |

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm or yarn

### Installation

```bash
cd hojai-ai/services/customer-memory-passport-service
npm install
```

### Configuration

Create a `.env` file:

```env
# Server
PORT=4595
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/memory-passport
MONGODB_POOL_SIZE=10

# Security
ENCRYPTION_KEY=your-32-character-encryption-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000

# Logging
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
```

### Running the Service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Health Check

```bash
curl http://localhost:4595/health
```

## API Reference

### Base URL

```
http://localhost:4595/api/v1
```

### Passport Operations

#### Create Passport

```bash
POST /api/v1/passport
Content-Type: application/json

{
  "customerId": "cust_123456",
  "customerEmail": "john.doe@example.com",
  "customerPhone": "+919876543210",
  "customerName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Passport created successfully",
  "data": {
    "customerId": "cust_123456",
    "healthScore": 100,
    "engagementScore": 0,
    "churnRisk": "low",
    ...
  }
}
```

#### Get Passport

```bash
GET /api/v1/passport/:customerId
```

#### Add Memory

```bash
PUT /api/v1/passport/:customerId/memory
Content-Type: application/json

{
  "type": "conversation",
  "title": "Customer inquired about pricing",
  "content": "Customer asked about enterprise pricing plans and feature differences...",
  "summary": "Pricing inquiry for enterprise plan",
  "importance": "high",
  "tags": [
    { "name": "pricing", "category": "inquiry", "confidence": 0.95 },
    { "name": "enterprise", "category": "plan-type", "confidence": 0.90 }
  ],
  "source": "whatsapp-service",
  "channel": "whatsapp",
  "sentiment": "positive",
  "sentimentScore": 0.7
}
```

#### Get Memories with Filters

```bash
GET /api/v1/passport/:customerId/memories?type=complaint&importance=high&limit=20
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by memory type |
| `importance` | string | Filter by importance level |
| `tags` | string[] | Filter by tag names |
| `source` | string | Filter by source |
| `channel` | string | Filter by channel |
| `startDate` | ISO date | Start of date range |
| `endDate` | ISO date | End of date range |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |

#### Search Memories

```bash
GET /api/v1/passport/:customerId/search?query=pricing%20inquiry&limit=10
```

#### Get Timeline

```bash
GET /api/v1/passport/:customerId/timeline?limit=30
```

### Company Context

#### Link Company to Passport

```bash
POST /api/v1/passport/:customerId/link/:companyId
Content-Type: application/json

{
  "companyName": "REZ-Commerce",
  "status": "active",
  "lifetimeValue": 5000,
  "engagementScore": 75,
  "preferences": {
    "preferredContactMethod": "whatsapp",
    "language": "en"
  }
}
```

#### Get Company Context

```bash
GET /api/v1/passport/:customerId/context/:companyId
```

### Conversation Context

Build comprehensive context for AI conversations:

```bash
GET /api/v1/passport/:customerId/conversation-context?companyId=comp_123&includePatterns=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerId": "cust_123456",
    "companyId": "comp_123",
    "summary": "Customer John has interacted across 2 companies...",
    "recentMemories": [...],
    "recentInteractions": [...],
    "preferences": {
      "channel": "whatsapp",
      "language": "en",
      "interests": ["premium products", "fast delivery"],
      "dislikes": ["complicated checkout"],
      "specialRequirements": []
    },
    "sentiment": {
      "current": "positive",
      "score": 0.65,
      "trend": "improving",
      "history": [...]
    },
    "keyFacts": ["Premium customer since 2023", "Prefers express shipping"],
    "activeIssues": [],
    "healthScore": 85,
    "engagementScore": 72,
    "churnRisk": "low",
    "recommendations": ["Continue personalized outreach"]
  }
}
```

### Memory Graph

#### Get Graph

```bash
GET /api/v1/passport/:customerId/graph
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerId": "cust_123456",
    "nodes": [
      { "id": "node_1", "type": "customer", "label": "John Doe", ... },
      { "id": "node_2", "type": "company", "label": "REZ-Commerce", ... },
      { "id": "node_3", "type": "issue", "label": "Delivery Delay", ... }
    ],
    "edges": [
      { "sourceId": "node_1", "targetId": "node_2", "relationship": "belongs_to", ... }
    ],
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

#### Create Graph Node

```bash
POST /api/v1/passport/:customerId/graph/nodes
Content-Type: application/json

{
  "type": "product",
  "label": "Premium Plan",
  "properties": {
    "productId": "prod_premium",
    "price": 99.99
  }
}
```

#### Find Path

```bash
GET /api/v1/passport/:customerId/graph/path?startType=customer&endType=resolution
```

#### Get Related Entities

```bash
GET /api/v1/passport/:customerId/graph/related/:entityId?depth=2
```

#### Get Graph Statistics

```bash
GET /api/v1/passport/:customerId/graph/stats
```

#### Calculate Health Score

```bash
GET /api/v1/passport/:customerId/health-score
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": 82,
    "factors": {
      "interactionFrequency": 75,
      "sentimentScore": 85,
      "issueResolutionRate": 90,
      "engagementLevel": 72,
      "recencyScore": 95
    },
    "recommendations": [
      "Increase engagement through preferred channels"
    ]
  }
}
```

### Sentiment & Patterns

#### Get Sentiment History

```bash
GET /api/v1/passport/:customerId/sentiment?days=30
```

#### Detect Patterns

```bash
GET /api/v1/passport/:customerId/patterns
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "recurring_issue",
      "description": "Recurring issue related to: delivery",
      "evidence": ["mem_001: Late delivery complaint", "mem_002: Shipping delay inquiry"],
      "frequency": 3,
      "impact": "negative",
      "detectedAt": "2024-01-15T10:00:00Z"
    },
    {
      "type": "preference",
      "description": "Consistent preference for: express shipping",
      "evidence": ["mem_003", "mem_005"],
      "frequency": 4,
      "impact": "positive",
      "detectedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Interactions

#### Add Interaction

```bash
POST /api/v1/passport/:customerId/interactions
Content-Type: application/json

{
  "type": "support_request",
  "channel": "whatsapp",
  "summary": "Customer requested help with order tracking",
  "outcome": "Provided tracking number",
  "sentiment": "neutral",
  "sentimentScore": 0,
  "agentId": "agent_001",
  "agentName": "Sarah",
  "companyId": "comp_123"
}
```

### Merge Passports

```bash
POST /api/v1/passport/merge
Content-Type: application/json

{
  "sourceId": "cust_old_123",
  "targetId": "cust_new_456",
  "strategy": "newest"
}
```

**Merge Strategies:**

| Strategy | Description |
|----------|-------------|
| `source_wins` | Keep all data from source, ignore target |
| `target_wins` | Keep all data from target, ignore source |
| `newest` | Keep newest version of each memory |
| `highest_importance` | Keep memory with highest importance level |

## Data Models

### CustomerMemoryPassport

```typescript
interface ICustomerMemoryPassport {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  encryptedPII?: Record<string, string>;
  linkedCompanies: ICompanyContext[];
  memories: IMemoryEntry[];
  interactions: IInteraction[];
  graph: IMemoryGraph;
  healthScore: number;
  engagementScore: number;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  lastActivity?: Date;
  firstActivity?: Date;
  totalInteractions: number;
}
```

### MemoryEntry

```typescript
interface IMemoryEntry {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  summary?: string;
  importance: MemoryImportance;
  tags: IMemoryTag[];
  source: string;
  sourceId?: string;
  channel?: InteractionChannel;
  metadata?: Record<string, unknown>;
  sentiment?: SentimentLabel;
  sentimentScore?: number;
  entities?: string[];
  keywords?: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isDeleted: boolean;
}
```

### MemoryGraph

```typescript
interface IMemoryGraph {
  customerId: string;
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  lastUpdated: Date;
}

interface IGraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  properties: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface IGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: GraphRelationshipType;
  properties?: Record<string, unknown>;
  weight?: number;
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4595` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `MONGODB_URI` | `mongodb://localhost:27017/memory-passport` | MongoDB connection string |
| `MONGODB_POOL_SIZE` | `10` | Connection pool size |
| `ENCRYPTION_KEY` | - | AES-256 encryption key (32 chars) |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window |
| `RATE_LIMIT_MAX` | `1000` | Max requests per window |
| `LOG_LEVEL` | `info` | Logging level |
| `ENABLE_FILE_LOGGING` | `false` | Enable file logging |

## Development

### Project Structure

```
customer-memory-passport-service/
├── src/
│   ├── index.ts              # Application entry point
│   ├── models/
│   │   └── passport.ts       # Mongoose models and schemas
│   ├── services/
│   │   ├── passportService.ts      # Core passport operations
│   │   ├── contextService.ts      # Context building
│   │   ├── memoryGraphService.ts   # Graph operations
│   │   └── encryptionService.ts   # PII encryption
│   ├── routes/
│   │   └── passportRoutes.ts      # API routes
│   ├── middleware/
│   │   └── validation.ts          # Request validation
│   └── utils/
│       └── logger.ts              # Winston logger
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

```bash
npm run build     # Build TypeScript
npm start         # Start production server
npm run dev       # Start development server with hot reload
npm run test      # Run tests
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript type checking
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Security

### PII Encryption

Sensitive data is encrypted using AES-256-GCM:

- Customer email
- Customer phone
- Customer name
- Custom sensitive fields

### Rate Limiting

- Global: 1000 requests/minute (configurable)
- Authentication: 100 requests/15 minutes

### Input Validation

All inputs are validated using Zod schemas:

- Type checking
- Length limits
- Format validation
- Enum validation

## Monitoring

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | Basic health check |
| `/health/live` | Kubernetes liveness probe |
| `/health/ready` | Kubernetes readiness probe |

### Logging

Logs are written to:

- Console (always)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)
- `logs/access.log` (HTTP access)

## License

MIT License - RTNM Group
