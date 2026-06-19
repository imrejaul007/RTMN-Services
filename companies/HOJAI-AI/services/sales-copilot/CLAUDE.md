# Sales Copilot Service

**Port:** 4928  
**Status:** ✅ BUILT  
**Purpose:** AI-powered sales assistance

---

## Overview

Sales Copilot provides AI-powered sales assistance:
- Lead prioritization
- Talking points generation
- Email generation
- Meeting preparation
- Competitive intelligence
- Sales forecasting
- Playbook guidance

## Features

- ✅ Lead Scoring & Prioritization
- ✅ Talking Points Generation
- ✅ Email Templates (Intro, Follow-up, Proposal, Meeting)
- ✅ Competitive Battle Cards
- ✅ Meeting Preparation
- ✅ Sales Forecasting
- ✅ Playbook Guidance
- ✅ Objection Handling

## API Endpoints

### Lead Prioritization
- `POST /api/prioritize` - Score and prioritize leads

### Talking Points
- `POST /api/talking-points` - Generate talking points for a lead

### Recommendations
- `POST /api/recommend` - Get AI recommendations

### Email Generation
- `POST /api/email/generate` - Generate emails (intro, followup, proposal, meeting)

### Competitive Intelligence
- `GET /api/competitors` - List competitors
- `GET /api/competitors/:id` - Get battle cards

### Meeting Prep
- `POST /api/meeting/prepare` - Prepare for meeting

### Forecasting
- `POST /api/forecast` - Generate sales forecast

### Playbooks
- `GET /api/playbook/:topic` - Get playbook (cold_outreach, discovery, demo, objection_handling, closing)

## Quick Start

```bash
cd companies/HOJAI-AI/services/sales-copilot
npm install
npm start
```

## Integration

- **Sales OS** - Links to CRM
- **Lead Twin** - Lead data
- **Customer Intelligence** - Customer profiles
