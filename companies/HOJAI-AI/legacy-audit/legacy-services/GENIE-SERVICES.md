# Genie Services - Canonical Locations

## Overview

This document clarifies the canonical (authoritative) locations for Genie services and resolves any duplicate directories.

## Canonical Service Locations

The following locations are the **authoritative sources** for Genie services:

| Service | Canonical Location | Notes |
|---------|-------------------|-------|
| `genie-memory-service` | `companies/hojai-ai/genie-memory-service/` | Full implementation with src/ |
| `genie-briefing-service` | `companies/hojai-ai/genie-briefing-service/` | Full implementation with src/ |
| `genie-relationship-service` | `companies/hojai-ai/services/genie-relationship-service/` | |
| `genie-privacy-service` | `companies/hojai-ai/services/genie-privacy-service/` | |
| `genie-sync-service` | `companies/hojai-ai/services/genie-sync-service/` | |
| `genie-voice-service` | `companies/hojai-ai/services/genie-voice-service/` | |
| `genie-calendar-service` | `companies/hojai-ai/services/genie-calendar-service/` | |
| `genie-email-service` | `companies/hojai-ai/services/genie-email-service/` | |
| `genie-meeting-service` | `companies/hojai-ai/services/genie-meeting-service/` | |

## Service Ports

| Service | Port | Default |
|---------|------|---------|
| `genie-memory-service` | 4703 | ✓ |
| `genie-relationship-service` | 4704 | ✓ |
| `genie-briefing-service` | 4706 | ✓ |
| `genie-sync-service` | 4707 | ✓ |
| `genie-voice-service` | 4712 | ✓ |
| `genie-calendar-service` | 4709 | ✓ |
| `genie-email-service` | 4710 | ✓ |
| `genie-meeting-service` | 4713 | ✓ |

## Deprecated/Merged Locations

The following directories are **deprecated** and should not be used:

| Deprecated Location | Reason | Use Instead |
|---------------------|--------|-------------|
| `companies/hojai-ai/services/genie-memory-service/` | Duplicate, minimal implementation | `companies/hojai-ai/genie-memory-service/` |
| `companies/hojai-ai/services/genie-briefing-service/` | Duplicate, minimal implementation | `companies/hojai-ai/genie-briefing-service/` |

## Docker Compose

All Genie services are orchestrated via Docker Compose in:
- `docker/docker-compose.genie.yml` - Standalone Genie suite
- `docker/docker-compose.full.yml` - Full RTNM ecosystem

## Environment Variables

Genie services use the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GENIE_MEMORY` | `http://localhost:4703` | Genie Memory service URL |
| `GENIE_RELATION` | `http://localhost:4704` | Genie Relationship service URL |
| `GENIE_BRIEFING` | `http://localhost:4706` | Genie Briefing service URL |
| `HOJAI_GENIE_URL` | `http://localhost:4703` | HOJAI Genie API URL |
| `HOJAI_GENIE_API_KEY` | `''` | HOJAI Genie API key |

## Client Integration

### DO App Backend
- **File:** `companies/REZ-Consumer/do/do-backend/src/services/genieMemoryClient.ts`
- **Default URL:** `http://localhost:4703`

### DO App Mobile
- **File:** `companies/REZ-Consumer/do/src/hooks/useGenieMemory.ts`
- **Default URL:** `http://localhost:4703`

---

**Last Updated:** 2026-06-12
