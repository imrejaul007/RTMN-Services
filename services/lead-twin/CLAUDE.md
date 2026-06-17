# Lead Twin Service

**Version:** 1.0.0  
**Port:** 4908  
**Purpose:** Sales Lead Management with Scoring, Enrichment, and CRM Integration

---

## Overview

Lead Twin is a comprehensive lead management service that handles the complete lifecycle of sales leads from acquisition through conversion. It provides lead scoring, data enrichment, activity tracking, and integrates with CRM systems.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Lead Twin Service                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Lead Model  │  │Activity Model│  │      Note Model          │  │
│  │  - Basic Info│  │ - Activities │  │  - Lead Notes             │  │
│  │  - Score     │  │ - Timeline    │  │  - Collaboration          │  │
│  │  - Enrichment│  │ - Stats       │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Services Layer                             │  │
│  │  ┌─────────────────┐      ┌─────────────────────────────┐    │  │
│  │  │  Scoring Service │      │   Enrichment Service          │    │  │
│  │  │  - Stage Score   │      │   - LinkedIn Data            │    │  │
│  │  │  - Source Score  │      │   - Company Info             │    │  │
│  │  │  - Engagement    │      │   - Social Profiles          │    │  │
│  │  │  - Inactivity    │      │   - Email Verification        │    │  │
│  │  └─────────────────┘      └─────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Lead Model

### Lead Fields

| Field | Type | Description |
|-------|------|-------------|
| leadId | string | Unique identifier (LEAD-uuid) |
| tenantId | string | Multi-tenant support |
| name | string | Lead's full name |
| email | string | Email address (optional) |
| phone | string | Phone number (optional) |
| company | string | Company name (optional) |
| jobTitle | string | Job title (optional) |
| source | enum | web, referral, ad, social, event, partner, campaign |
| stage | enum | new, contacted, qualified, proposal, negotiation, won, lost |
| score | object | { total, factors[], lastCalculated } |
| enrichment | object | { linkedin, companyData, socialData } |
| ownerId | string | Assigned sales rep |
| temperature | enum | hot, warm, cold |
| tags | string[] | Custom tags |
| isConverted | boolean | Converted to contact |
| isDeleted | boolean | Soft delete flag |

### Lead Sources

- `web` - Website form submission
- `referral` - Word of mouth
- `ad` - Paid advertising
- `social` - Social media
- `event` - Trade show/event
- `partner` - Partner referral
- `campaign` - Marketing campaign

### Lead Stages

- `new` - Just received (10% probability)
- `contacted` - Initial contact made (25%)
- `qualified` - Qualified for sales (50%)
- `proposal` - Proposal sent (75%)
- `negotiation` - In negotiation (90%)
- `won` - Deal closed (100%)
- `lost` - Deal lost (0%)

---

## API Endpoints

### Lead Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/leads | Create new lead |
| GET | /api/leads | List leads (with filters) |
| GET | /api/leads/:leadId | Get lead by ID |
| PUT | /api/leads/:leadId | Update lead |
| DELETE | /api/leads/:leadId | Soft delete lead |
| POST | /api/leads/:leadId/score | Calculate lead score |
| POST | /api/leads/score/batch | Batch score calculation |
| POST | /api/leads/:leadId/convert | Convert lead to contact |
| GET | /api/leads/stats/summary | Lead statistics |

### Activity Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/leads/:leadId/activities | Log activity |
| GET | /api/leads/:leadId/activities | Get activities |
| GET | /api/leads/:leadId/activities/timeline | Get timeline view |
| GET | /api/activities/activity/:activityId | Get activity |
| DELETE | /api/activities/activity/:activityId | Delete activity |
| GET | /api/activities/stats/summary | Activity statistics |

### Enrichment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/leads/:leadId/enrich | Enrich lead data |
| POST | /api/leads/enrich/bulk | Bulk enrich |
| GET | /api/leads/:leadId/enrichment | Get enrichment status |
| PUT | /api/leads/:leadId/enrichment | Update enrichment |
| DELETE | /api/leads/:leadId/enrichment | Clear enrichment |

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/leads/:leadId/notes | Add note |
| GET | /api/leads/:leadId/notes | Get notes |
| PUT | /api/notes/:noteId | Update note |
| DELETE | /api/notes/:noteId | Delete note |

---

## Scoring System

### Score Factors

| Factor | Max Points | Weight |
|--------|------------|--------|
| Stage | 0-100 | 1.5x |
| Source | 0-25 | 1.0x |
| Data Completeness | 0-30 | 1.0x |
| Company Data | 0-40 | 1.0x |
| Recent Engagement | 0-50 | 1.0x |
| Inactivity Decay | -20 to 0 | 1.0x |

### Temperature Classification

- **Hot** (70-100): High priority, immediate follow-up
- **Warm** (40-69): Medium priority, scheduled follow-up
- **Cold** (0-39): Low priority, nurture campaign

### Score Decay

Lead scores decrease over time without activity:
- -2 points per week inactive
- Maximum decay: -20 points
- Minimum score: 0

---

## Data Enrichment

### LinkedIn Data

- Profile URL
- Headline
- Connection count
- Industry

### Company Data

- Company name
- Domain
- Industry
- Company size
- Revenue range
- Founded year
- Description
- Logo URL

### Social Data

- Twitter profile
- Facebook page
- Instagram
- Website URL

---

## Usage Examples

### Create a Lead

```bash
curl -X POST http://localhost:4908/api/leads \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-123" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@company.com",
    "company": "Acme Corp",
    "source": "web"
  }'
```

### Score a Lead

```bash
curl -X POST http://localhost:4908/api/leads/LEAD-xxx/score \
  -H "X-Tenant-ID: tenant-123"
```

### Enrich Lead Data

```bash
curl -X POST http://localhost:4908/api/leads/LEAD-xxx/enrich \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-123" \
  -d '{
    "enrichLinkedin": true,
    "enrichCompany": true,
    "enrichSocial": true
  }'
```

### Log Activity

```bash
curl -X POST http://localhost:4908/api/leads/LEAD-xxx/activities \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant-123" \
  -d '{
    "type": "call",
    "description": "Discussed pricing options",
    "performedBy": "sales-rep-1"
  }'
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4908 | Service port |
| NODE_ENV | development | Environment |
| MONGODB_URI | mongodb://localhost:27017/lead-twin | Database URL |
| LOG_LEVEL | info | Logging level |

### External Services (Optional)

- LinkedIn API for profile enrichment
- Clearbit for company data
- Email verification services

---

## Multi-Tenancy

All endpoints support multi-tenancy via the `X-Tenant-ID` header:

```bash
curl -H "X-Tenant-ID: tenant-123" http://localhost:4908/api/leads
```

Default tenant is `default` if header is not provided.

---

## Health Check

```bash
curl http://localhost:4908/health
```

Response:
```json
{
  "status": "healthy",
  "service": "lead-twin",
  "version": "1.0.0",
  "timestamp": "2026-06-17T...",
  "mongodb": "connected"
}
```

---

## Integration with TwinOS Hub

Lead Twin integrates with the TwinOS Hub (port 4705) for digital twin synchronization:

```typescript
// Register lead twin
await twinHub.registerTwin({
  type: 'lead',
  serviceUrl: 'http://localhost:4908',
  capabilities: ['scoring', 'enrichment', 'crm-sync'],
});
```

---

## Error Handling

All errors return consistent JSON:

```json
{
  "success": false,
  "error": "Error message",
  "details": [...] // Zod validation errors
}
```

---

## Dependencies

- express: Web framework
- mongoose: MongoDB ODM
- cors: Cross-origin support
- helmet: Security headers
- zod: Schema validation
- uuid: Unique ID generation
- winston: Logging

---

*Last Updated: June 17, 2026*
