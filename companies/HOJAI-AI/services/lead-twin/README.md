# Lead Twin Service

Lead management and tracking service for LeadOS.

## Overview

Lead Twin Service provides CRUD operations for managing leads and tracking activities in the RTMN LeadOS ecosystem.

## Quick Start

```bash
cd lead-twin
npm install
npm start
```

## Port

**4894**

## Endpoints

### Health Check
```
GET /health
```

### Leads

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /leads | List all leads with filtering |
| GET | /leads/:id | Get single lead |
| POST | /leads | Create new lead |
| PATCH | /leads/:id | Update lead |
| DELETE | /leads/:id | Delete lead |

#### Query Parameters for GET /leads
- `q` - Search query (name, company, email)
- `type` - Filter by type (hot, warm, cold)
- `industry` - Filter by industry
- `limit` - Limit results (default: 100)

### Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /activities | List activities with filtering |
| GET | /activities/:id | Get single activity |
| POST | /activities | Create new activity |

#### Query Parameters for GET /activities
- `leadId` - Filter by lead ID
- `type` - Filter by activity type

## Data Model

### Lead
```json
{
  "id": "lead_123456789",
  "name": "Sarah Johnson",
  "email": "sarah@techcorp.com",
  "company": "TechCorp",
  "phone": "+1-555-1234",
  "industry": "Technology",
  "type": "hot",
  "score": 85,
  "createdAt": "2026-06-17T10:00:00.000Z",
  "updatedAt": "2026-06-17T10:00:00.000Z"
}
```

### Activity
```json
{
  "id": "act_123456789",
  "leadId": "lead_123456789",
  "type": "email_sent",
  "description": "Follow-up email sent",
  "timestamp": "2026-06-17T10:00:00.000Z"
}
```

## Seed Data

The service seeds 20 realistic leads on startup across various industries including Technology, Healthcare, Retail, Finance, and more.
