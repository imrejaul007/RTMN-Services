# CLAUDE.md - Sutar Contract Os

## Project Overview

**Name:** sutar-contract-os
**Type:** SUTAR OS Service
**Port:** 4190
**Description:** Contract OS - Smart contract management
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
| PORT | No | 4190 | Service port |
| NODE_ENV | No | development | Environment |
| LOG_LEVEL | No | info | Logging level |

## Features

| Feature | Status |
|---------|--------|
| Contract generation | Implemented |
| Digital signatures | Implemented |
| Terms management | Implemented |
| Compliance | Implemented |

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
