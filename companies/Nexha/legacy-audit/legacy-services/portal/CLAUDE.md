# NeXha Portal - CLAUDE.md

## Overview

Next.js application for the B2B Infrastructure Marketplace.
- **URL:** nexha.rez.money
- **Port:** 4388
- **Purpose:** Connect users with distributors, manufacturers, and franchise opportunities

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with marketplace categories |
| `/distributors` | Find distributors by region, category, type |
| `/manufacturers` | Find manufacturers by certification, capacity |
| `/franchises` | Browse franchise opportunities |
| `/suppliers` | Link to NextaBizz supplier marketplace |

## API Routes

| Endpoint | Backend | Description |
|----------|---------|-------------|
| `/api/distributors` | DistributionOS | List distributors |
| `/api/franchises` | FranchiseOS | List franchises |
| `/api/manufacturers` | ManufacturingOS | List manufacturers |

## Running

```bash
cd portal
npm run dev    # Development
npm run build  # Production build
```

## Environment

```bash
NEXT_PUBLIC_API_URL=http://localhost:4388/api
```
