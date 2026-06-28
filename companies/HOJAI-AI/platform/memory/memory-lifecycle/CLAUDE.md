# Memory Lifecycle OS

> **Service:** Memory Lifecycle OS  
> **Port:** 4899  
> **Phase:** 39  
> **Status:** Production-ready

## Overview

Manages the complete lifecycle of memories in the HOJAI Memory Layer — TTL management, compaction, pruning, archival, and GDPR compliance.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/memories` | List memories (filter by owner, type, tags, confidence, archived) |
| POST | `/api/memories` | Create memory (owner, content, type, confidence, tags, expiresAt) |
| GET | `/api/memories/:id` | Get single memory |
| PUT | `/api/memories/:id` | Update memory |
| DELETE | `/api/memories/:id` | Delete memory (triggers on-forget hooks) |
| GET | `/api/memories/expired` | Get memories past their TTL |
| POST | `/api/compact` | Merge redundant memories (keep highest confidence) |
| POST | `/api/prune` | Remove low-confidence memories |
| POST | `/api/archive` | Archive old memories (olderThanDays) |
| POST | `/api/gdpr/delete` | GDPR deletion — remove all memories for an owner |
| GET | `/api/hooks` | List lifecycle hooks |
| POST | `/api/hooks` | Register hook (name, event, callback) |
| DELETE | `/api/hooks/:id` | Remove hook |
| GET | `/api/stats` | Memory statistics (total, by-type, by-confidence-range) |

## Lifecycle Events

- `on-forget` — triggered when memory is deleted/pruned
- `on-compact` — triggered when memories are merged
- `on-archive` — triggered when memories are archived

## Compaction Logic

Groups memories by `owner:type:content_prefix` and keeps only the highest-confidence one. Tracks `compactCount` on kept memories.

## GDPR

When `POST /api/gdpr/delete` is called with an owner ID, ALL memories for that owner are permanently deleted and hooks are triggered.