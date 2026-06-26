# Plugin Framework

## Overview
Extensibility framework for skills.

## Purpose
Allows third-party skill development.

## Key Features
- Plugin API
- Sandboxed execution
- Event hooks
- Lifecycle management

## API Endpoints
- `GET /api/plugins` - List plugins
- `POST /api/plugins` - Register plugin
- `POST /api/plugins/:id/enable` - Enable plugin

## Startup
```bash
cd platform/skills/plugin-framework && npm run dev
```
