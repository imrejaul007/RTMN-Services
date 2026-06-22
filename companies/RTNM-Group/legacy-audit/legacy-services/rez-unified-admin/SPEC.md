# REZ Unified Admin Dashboard - Specification

**Date:** May 18, 2026
**Version:** 1.0

---

## Overview

Unified admin dashboard for managing entire REZ ecosystem from single interface.

## Features

### 1. Unified Customer View
- All companies in one profile
- Cross-company activity
- Unified karma/loyalty
- Customer segments

### 2. Service Health
- All services status
- RABTUL services
- QR services
- Intelligence services

### 3. Analytics
- Cross-company metrics
- Revenue attribution
- User journey
- Funnel analysis

### 4. Operations
- Service management
- API keys
- Webhooks
- Event logs

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js + Tailwind |
| Backend | Express + TypeScript |
| Real-time | Socket.IO |
| Charts | Recharts |

---

## Pages

### /dashboard
Main overview with KPIs

### /customers
Customer 360 view

### /services
Service health & management

### /analytics
Cross-company analytics

### /campaigns
Marketing campaigns

### /settings
Admin settings

---

## Integration

Uses `unifiedHub.ts` for all cross-company data.

---

## Deployment

```bash
npm run build
npm start
```
