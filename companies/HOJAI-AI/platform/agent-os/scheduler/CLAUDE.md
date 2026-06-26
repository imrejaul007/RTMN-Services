# Scheduler

## Overview
Cron-like job scheduling for agents.

## Purpose
Schedules agent tasks.

## Key Features
- Job scheduling
- Recurring tasks
- Time-based triggers
- Execution history

## API Endpoints
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs/:id` - Get job
- `DELETE /api/jobs/:id` - Delete job

## Startup
```bash
cd platform/agent-os/scheduler && npm run dev
```
