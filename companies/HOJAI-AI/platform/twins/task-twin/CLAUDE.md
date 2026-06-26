# Task Twin

## Overview
Task management, delegation, automation.

## Purpose
Digital twin for task management.

## Key Features
- Task tracking
- Delegation patterns
- Automation rules
- Priority optimization

## API Endpoints

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task
- `PATCH /api/tasks/:id` - Update task

### Delegation
- `POST /api/tasks/:id/delegate` - Delegate task

## Startup
```bash
cd platform/twins/task-twin && npm run dev
```
