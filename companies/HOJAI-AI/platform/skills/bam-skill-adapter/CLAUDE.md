# BAM Skill Adapter

## Overview
Adapter for BAM (BLR AI Marketplace) skill integration.

## Purpose
Bridges BAM skills with TwinOS skill execution.

## Key Features
- Skill discovery
- Skill installation
- Version management
- Usage tracking

## API Endpoints
- `GET /api/skills` - List BAM skills
- `POST /api/install` - Install skill
- `GET /api/status` - Installation status

## Startup
```bash
cd platform/skills/bam-skill-adapter && npm run dev
```
