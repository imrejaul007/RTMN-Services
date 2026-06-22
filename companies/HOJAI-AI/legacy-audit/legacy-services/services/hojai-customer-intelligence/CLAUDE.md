# HOJAI Customer Intelligence - Customer 360

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4758 | **Status:** ✅ **BUILT** (June 13, 2026)

## Overview

**HOJAI Customer Intelligence** provides comprehensive customer 360 capabilities. Track customer lifecycle, interactions, and sentiment.

### Key Features

- 👤 **Customer Profiles** - 360-degree customer view
- 🔄 **Lifecycle Tracking** - Lead, prospect, customer, champion, churned
- 📊 **Customer Scoring** - 0-100 health score
- 💬 **Interaction Tracking** - Track all customer touchpoints
- 😊 **Sentiment Analysis** - Auto-detect interaction sentiment
- 🏷️ **Tagging System** - Customer segmentation tags

## Architecture

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x |
| Validation | Zod 3.x |

## API Endpoints

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customers` | List customers |
| POST | `/api/v1/customers` | Create customer |
| GET | `/api/v1/customers/:id` | Get customer |
| PUT | `/api/v1/customers/:id` | Update customer |
| DELETE | `/api/v1/customers/:id` | Delete customer |

### Interactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customers/:id/interactions` | Customer interactions |
| POST | `/api/v1/interactions` | Record interaction |
| GET | `/api/v1/interactions/:id` | Get interaction |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics` | Customer analytics |

## Lifecycle Stages

| Stage | Description |
|-------|-------------|
| lead | New potential customer |
| prospect | Qualified lead |
| customer | Active customer |
| champion | Promotes your product |
| churned | Lost customer |

## Data Models

### Customer

```typescript
{
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  lifecycleStage: 'lead' | 'prospect' | 'customer' | 'champion' | 'churned';
  score: number; // 0-100
  tags: string[];
}
```

### Interaction

```typescript
{
  id: string;
  customerId: string;
  type: 'email' | 'call' | 'meeting' | 'support' | 'purchase';
  content: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}
```

## Security Features

| Feature | Status |
|---------|--------|
| Input Validation (Zod) | ✅ |
| Graceful Shutdown | ✅ |
| Health Checks | ✅ |

## Quick Start

```bash
npm install
npm run dev
npm run build
npm start
```

---

**License:** Proprietary - RTNM Digital  
**Last Updated:** June 13, 2026
