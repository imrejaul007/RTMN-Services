# Workflow Marketplace Service

**Port:** 4938  
**Status:** ✅ BUILT  
**Purpose:** Discover, share, and deploy pre-built workflow templates

---

## Overview

Workflow Marketplace is a service that allows users to discover, purchase, and deploy pre-built workflow templates across the RTMN ecosystem.

## Features

- ✅ Browse workflow templates by category
- ✅ Search with filters (price, difficulty, industry)
- ✅ Preview workflow structure
- ✅ Deploy workflows to organization
- ✅ Rate and review workflows
- ✅ Seller dashboard for publishing

## Categories

| ID | Name | Icon | Color |
|----|------|------|-------|
| sales | Sales | trending-up | #10b981 |
| hr | Human Resources | users | #3b82f6 |
| marketing | Marketing | megaphone | #f59e0b |
| operations | Operations | settings | #6366f1 |
| finance | Finance | dollar-sign | #ec4899 |
| customer-success | Customer Success | heart | #ef4444 |
| it | IT & Security | shield | #8b5cf6 |
| legal | Legal | scale | #14b8a6 |

## API Endpoints

### Public
- `GET /health` - Health check
- `GET /api/workflows` - List workflows (filters: category, search, minPrice, maxPrice, difficulty, featured, industry, sort)
- `GET /api/workflows/:id` - Get workflow details
- `GET /api/categories` - List categories
- `GET /api/workflows/featured/list` - Featured workflows
- `GET /api/industries` - List industries
- `GET /api/search?q=` - Search workflows

### Purchase & Deploy
- `POST /api/workflows/:id/deploy` - Deploy workflow
- `GET /api/deployments?organizationId=` - Get deployments
- `GET /api/deployments/:id` - Get deployment details
- `PATCH /api/deployments/:id` - Update deployment
- `DELETE /api/deployments/:id` - Delete deployment

### Reviews
- `POST /api/workflows/:id/reviews` - Add review

### Seller Dashboard
- `GET /api/seller/workflows?sellerId=` - Get seller workflows
- `POST /api/workflows` - Create workflow
- `PATCH /api/workflows/:id` - Update workflow

### Analytics
- `GET /api/stats` - Marketplace stats

## Sample Workflows

- Lead Nurture Sequence ($49/mo)
- Employee Onboarding ($79/mo)
- Approval Chain ($29/mo)
- Invoice Processing ($49/mo)
- Abandoned Cart Recovery ($49/mo)

## Quick Start

```bash
cd companies/HOJAI-AI/services/workflow-marketplace
npm install
npm start
```

## Integration

Connects to:
- RTMN Workflow Engine (execution)
- RTMN Event Bus (notifications)
- RTMN Billing (payments)
