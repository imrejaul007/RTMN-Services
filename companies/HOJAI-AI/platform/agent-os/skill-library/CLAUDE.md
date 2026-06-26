# Skill Library

## Overview
Reusable skills for agents.

## Purpose
Manages agent skill packages.

## Key Features
- Skill registry
- Skill versioning
- Skill installation
- Skill composition

## API Endpoints
- `GET /api/skills` - List skills
- `POST /api/skills` - Register skill
- `GET /api/skills/:id` - Get skill
- `POST /api/skills/:id/install` - Install skill

## Startup
```bash
cd platform/agent-os/skill-library && npm run dev
```
