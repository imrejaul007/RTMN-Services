# CLAUDE.md - Sutar Trust Engine

## Project Overview

**Name:** sutar-trust-engine
**Type:** SUTAR OS Service
**Port:** 4180
**Description:** Trust Engine - Trust score verification
**Company:** HOJAI AI
**Product:** SUTAR OS

## Tech Stack

- Node.js 20+
- Express.js
- TypeScript
- Zod (validation)

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Development server (watch mode) |
| `npm run build` | Build for production |
| `npm start` | Production server |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4180 | Service port |
| NODE_ENV | No | development | Environment |
| LOG_LEVEL | No | info | Logging level |

## Features

| Feature | Status |
|---------|--------|
| Credit check | Implemented |
| Trust validation | Implemented |
| Payment history | Implemented |
| Dispute analysis | Implemented |

## Architecture

This service follows the SUTAR OS 12-layer canonical architecture.

## Integration

### Upstream Services
- SUTAR Gateway (4140)
- SUTAR Intent Bus (4154)

### Downstream Services
- HOJAI Memory (4520)
- RABTUL Services (4001-4005)

---

**Last Updated:** 2026-06-13
