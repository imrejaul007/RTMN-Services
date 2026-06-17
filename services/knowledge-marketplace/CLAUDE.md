# Knowledge Marketplace Service

**Version:** 1.0.0  
**Port:** 4939  
**Status:** Production Ready

---

## Overview

The Knowledge Marketplace is a centralized repository of pre-built knowledge assets including Standard Operating Procedures (SOPs), compliance guides, training courses, vendor manuals, and how-to guides across 24 industry verticals.

## Features

- **Industry SOPs**: Pre-built standard operating procedures for each industry
- **Government Policies**: Compliance guides for regulatory requirements
- **Vendor Manuals**: Technical documentation from equipment/software vendors
- **Compliance Guides**: Regulatory and standards compliance documentation
- **Training Courses**: Educational content for staff onboarding and development
- **AI Citation Engine**: Automatic source attribution for all content
- **Semantic Search**: Find relevant knowledge using natural language
- **Install Tracking**: Monitor knowledge usage across clients

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Knowledge Marketplace                     │
├─────────────────────────────────────────────────────────────┤
│  Routes                                                       │
│  ├── /api/marketplace      - Browse, view, review            │
│  ├── /api/marketplace/categories - Industry & type browsing  │
│  ├── /api/marketplace/search - Semantic search              │
│  └── /api/marketplace/install - Installation management      │
├─────────────────────────────────────────────────────────────┤
│  Services                                                     │
│  ├── InstallerService - Install/uninstall knowledge          │
│  └── CitationService  - Source attribution & validation      │
├─────────────────────────────────────────────────────────────┤
│  Models                                                       │
│  ├── Knowledge     - Knowledge assets (SOPs, guides, etc.)   │
│  └── Installation  - Client installations tracking           │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Health & Info

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/api` | GET | API information |
| `/api/logs` | GET | Service logs (debug) |

### Marketplace

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace` | GET | Browse all knowledge (paginated) |
| `/api/marketplace/:knowledgeId` | GET | Get single knowledge item |
| `/api/marketplace/:knowledgeId/reviews` | POST | Add a review |
| `/api/marketplace/:knowledgeId/related` | GET | Get related knowledge |

### Categories

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace/categories` | GET | Get all categories with counts |
| `/api/marketplace/categories/industries` | GET | List all industries |
| `/api/marketplace/categories/types` | GET | List all knowledge types |

### Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace/search` | GET | Search knowledge |
| `/api/marketplace/search/suggestions` | GET | Get search suggestions |
| `/api/marketplace/search/citations/:knowledgeId` | GET | Get citations for knowledge |

### Installation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace/:knowledgeId/install` | POST | Install knowledge to client |
| `/api/marketplace/:knowledgeId/uninstall` | DELETE | Uninstall knowledge |
| `/api/marketplace/:knowledgeId/track-usage` | POST | Track usage |
| `/api/marketplace/installs/:clientId` | GET | Get client's installations |

---

## Knowledge Types

| Type | Description |
|------|-------------|
| `sop` | Standard Operating Procedures |
| `compliance` | Compliance and regulatory guides |
| `training` | Training courses and materials |
| `manual` | Vendor and equipment manuals |
| `guide` | How-to guides and tutorials |

---

## Industries Supported

| Industry | Icon | Knowledge Types |
|----------|------|-----------------|
| Hospitality | 🍽️ | SOPs, Training, Compliance |
| Healthcare | 🏥 | Compliance, Training, Manuals |
| Retail | 🛒 | SOPs, Training, Guides |
| Hotel | 🏨 | SOPs, Training, Compliance |
| Legal | ⚖️ | Compliance, Guides |
| Education | 🎓 | Training, Guides |
| Agriculture | 🌾 | SOPs, Compliance, Manuals |
| Automotive | 🚗 | SOPs, Manuals |
| Beauty | 💄 | SOPs, Training |
| Fashion | 👗 | SOPs, Training |
| Fitness | 💪 | Training, SOPs |
| Gaming | 🎮 | Compliance, Guides |
| Government | 🏛️ | Compliance, Policies |
| Home Services | 🔧 | SOPs, Guides |
| Manufacturing | 🏭 | SOPs, Compliance, Manuals |
| Non-Profit | ❤️ | Compliance, Training |
| Professional | 💼 | SOPs, Guides |
| Sports | ⚽ | Training, Compliance |
| Travel | ✈️ | SOPs, Training |
| Entertainment | 🎭 | SOPs, Guides |
| Construction | 🏗️ | SOPs, Compliance, Manuals |
| Financial | 💰 | Compliance, Training |
| Real Estate | 🏠 | SOPs, Training, Compliance |
| Transport | 🚚 | SOPs, Compliance, Manuals |

---

## Data Models

### Knowledge Schema

```typescript
interface Knowledge {
  knowledgeId: string;           // Unique identifier (e.g., "KNOW-001")
  title: string;                 // Display title
  description: string;           // Brief description
  industry: Industry;            // Industry vertical
  type: KnowledgeType;           // sop | compliance | training | manual | guide
  content: {
    summary: string;             // Brief summary
    sections: [{
      title: string;
      content: string;
      order: number;
    }];
  };
  citations: [{
    source: string;
    url?: string;
    description: string;
    date?: string;
  }];
  reviews: [{
    userId?: string;
    userName?: string;
    rating: number;              // 1-5
    comment: string;
    createdAt: Date;
  }];
  installs: number;              // Total installs
  rating: number;                // Average rating
  tags: string[];                // Searchable tags
  author: string;
  version: string;
  isPublished: boolean;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Installation Schema

```typescript
interface Installation {
  installationId: string;       // Unique identifier
  knowledgeId: string;          // Reference to Knowledge
  clientId: string;             // Client identifier
  clientName: string;           // Client display name
  industry: Industry;           // Industry
  installedAt: Date;            // Installation timestamp
  status: 'active' | 'paused' | 'uninstalled';
  lastUsedAt: Date;             // Last usage timestamp
  usageCount: number;           // Number of times accessed
}
```

---

## Usage Examples

### Browse Marketplace

```bash
curl http://localhost:4939/api/marketplace?industry=hospitality&type=sop
```

### Search Knowledge

```bash
curl "http://localhost:4939/api/marketplace/search?q=fire+safety&industry=hospitality"
```

### Install Knowledge

```bash
curl -X POST http://localhost:4939/api/marketplace/KNOW-001/install \
  -H "Content-Type: application/json" \
  -d '{"clientId": "CLIENT-123", "clientName": "Acme Hotel"}'
```

### Add Review

```bash
curl -X POST http://localhost:4939/api/marketplace/KNOW-001/reviews \
  -H "Content-Type: application/json" \
  -d '{"userName": "John D.", "rating": 5, "comment": "Excellent SOP guide!"}'
```

### Get Citations

```bash
curl "http://localhost:4939/api/marketplace/search/citations/KNOW-001?query=fire"
```

---

## Citation Engine

The Citation Service provides:

1. **Relevance Scoring**: Finds citations relevant to user queries
2. **Multiple Formats**: APA, MLA, Chicago citation styles
3. **Bibliography Generation**: Creates formatted reference lists
4. **Categorization**: Groups citations by type (government, academic, vendor)
5. **Validation**: Checks citation completeness and URL validity

### Citation Categories

- **Government**: Official government sources, regulations
- **Academic**: Research papers, journals, universities
- **Vendor**: Manufacturer documentation, product guides
- **Industry**: Trade associations, professional bodies
- **Other**: Miscellaneous sources

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4939 | Service port |
| `MONGODB_URI` | mongodb://localhost:27017/knowledge-marketplace | MongoDB connection string |
| `NODE_ENV` | development | Environment mode |
| `LOG_LEVEL` | info | Logging level |

---

## Running the Service

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm start

# Seed sample data
npm run seed
```

---

## Sample cURL Commands

```bash
# Health check
curl http://localhost:4939/health

# Browse all SOPs
curl "http://localhost:4939/api/marketplace?type=sop&limit=10"

# Search for food safety
curl "http://localhost:4939/api/marketplace/search?q=food+safety"

# Get categories
curl http://localhost:4939/api/marketplace/categories

# Install knowledge
curl -X POST http://localhost:4939/api/marketplace/KNOW-001/install \
  -H "Content-Type: application/json" \
  -d '{"clientId": "my-hotel-001", "clientName": "Grand Hotel"}'

# Get client installations
curl http://localhost:4939/api/marketplace/installs/my-hotel-001
```

---

## Integration with Other Services

The Knowledge Marketplace integrates with:

- **REZ-ecosystem-connector** (4399): Service discovery
- **REZ-event-bus** (4510): Event publishing for installations
- **Agent Economy** (4251): Knowledge credits and billing

---

**Last Updated:** June 16, 2026
