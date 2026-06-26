# InnovationOS - Port 4865

## Overview
Idea pipeline, pilot tracking, R&D portfolio.

## Purpose
Captures and evaluates AI-generated ideas and experiments.

## Key Features
- Idea submission
- Pilot tracking
- R&D metrics
- Portfolio management
- ROI analysis

## API Endpoints

### Ideas
- `GET /api/ideas` - List ideas
- `POST /api/ideas` - Submit idea
- `PATCH /api/ideas/:id` - Update idea

### Pilots
- `GET /api/pilots` - List pilots
- `POST /api/pilots` - Start pilot

## Tests
Vitest tests: `__tests__/innovation-os.test.ts`

## Environment
- Port: 4865

## Startup
```bash
cd platform/sutar-os/core/innovation-os && npm run dev
```
