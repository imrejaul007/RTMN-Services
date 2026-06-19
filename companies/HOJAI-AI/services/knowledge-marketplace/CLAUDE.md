# Knowledge Marketplace Service

**Port:** 4939  
**Status:** ✅ BUILT  
**Purpose:** SOPs, documentation, templates, and reusable knowledge assets

---

## Overview

Knowledge Marketplace is a service that allows users to discover, purchase, and download knowledge packs including SOPs, templates, guides, prompts, and compliance documentation.

## Features

- ✅ Browse knowledge packs by category
- ✅ Search with filters (category, type, industry, price)
- ✅ Preview content
- ✅ Purchase and download
- ✅ Rate and review
- ✅ Creator dashboard for publishing

## Categories

| ID | Name | Icon | Color |
|----|------|------|-------|
| sops | Standard Operating Procedures | list-checks | #10b981 |
| templates | Templates | file-text | #3b82f6 |
| guides | Industry Guides | book-open | #f59e0b |
| prompts | AI Prompts | sparkles | #8b5cf6 |
| compliance | Compliance | shield-check | #ec4899 |
| training | Training Materials | graduation-cap | #6366f1 |
| playbooks | Playbooks | target | #ef4444 |
| checklists | Checklists | clipboard-check | #14b8a6 |

## API Endpoints

### Public
- `GET /health` - Health check
- `GET /api/knowledge` - List knowledge packs (filters: category, type, search, minPrice, maxPrice, industry, sort)
- `GET /api/knowledge/:id` - Get pack details
- `GET /api/categories` - List categories
- `GET /api/knowledge/featured/list` - Featured packs
- `GET /api/industries` - List industries
- `GET /api/search?q=` - Search knowledge

### Purchase
- `POST /api/knowledge/:id/purchase` - Purchase pack
- `GET /api/purchases?userId=` - Get user purchases
- `GET /api/knowledge/:id/download` - Download pack

### Reviews
- `POST /api/knowledge/:id/reviews` - Add review

### Creator Dashboard
- `GET /api/creator/packs?creatorId=` - Get creator packs
- `POST /api/knowledge` - Create knowledge pack
- `PATCH /api/knowledge/:id` - Update pack

### Analytics
- `GET /api/stats` - Marketplace stats

## Sample Knowledge Packs

### SOPs
- Restaurant Operations SOP ($149)
- Hotel Check-in SOP ($129)
- Customer Support SOP ($99)
- Sales Process SOP ($149)
- Employee Onboarding SOP ($99)

### Templates
- Sales Proposal Template ($49)
- Service Contract Template ($79)
- Employment Contract Template ($59)
- Marketing Campaign Template ($69)
- Financial Report Template ($59)

### Compliance
- GDPR Compliance Pack ($299)
- HIPAA Compliance Pack ($399)
- SOC2 Documentation Pack ($349)
- ISO 27001 Controls Pack ($299)

### AI Prompts
- Sales AI Prompt Library (500 prompts, $49)
- HR AI Prompt Library (300 prompts, $39)
- Marketing AI Prompt Library (400 prompts, $49)
- Support AI Prompt Library (250 prompts, $39)

## Quick Start

```bash
cd companies/HOJAI-AI/services/knowledge-marketplace
npm install
npm start
```

## Integration

Connects to:
- RTMN Storage (file downloads)
- RTMN Billing (payments)
- RTMN Knowledge Base (content management)
