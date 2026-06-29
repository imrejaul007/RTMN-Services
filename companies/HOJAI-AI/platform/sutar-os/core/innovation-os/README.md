# InnovationOS

> **Ideas management, R&D tracking, pilot metrics, and innovation pipeline for SUTAR OS**

**Port:** 4865
**Package:** `@hojai/innovation-os`

## Overview

InnovationOS provides ideas management capabilities:
- **Ideas Management** — Submit, review, approve, and track innovation ideas
- **Voting System** — Community voting with up/down votes and comments
- **Pilot Metrics** — Track pilot adoption, revenue, and satisfaction
- **Goals Tracking** — Set innovation targets and track progress
- **Leaderboard** — Rank ideas by votes, impact, and ROI

## Quick Start

```bash
cd platform/sutar-os/core/innovation-os
npm install
npm run dev
# Service runs on http://localhost:4865
```

---

## API Examples

### Health Check

```bash
curl http://localhost:4865/health
```

Response:
```json
{
  "status": "ok",
  "service": "innovation-os",
  "port": 4865,
  "counts": {
    "ideas": 45,
    "goals": 5
  }
}
```

### Submit Idea

```bash
curl -X POST http://localhost:4865/api/ideas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "title": "AI-Powered Contract Review",
    "description": "Use LLM to automatically review and flag contract risks",
    "category": "technology",
    "submittedBy": "engineer_001",
    "expectedImpact": "high",
    "estimatedROI": 0.85
  }'
```

Response:
```json
{
  "id": "idea_abc123",
  "title": "AI-Powered Contract Review",
  "status": "under_review",
  "votes": 0,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### List Ideas

```bash
curl "http://localhost:4865/api/ideas?status=approved&category=technology&sort=votes"
```

Response:
```json
{
  "count": 12,
  "ideas": [
    { "id": "idea_abc123", "title": "AI-Powered Contract Review", "votes": 15, "status": "approved" }
  ]
}
```

### Vote on Idea

```bash
curl -X POST http://localhost:4865/api/ideas/idea_abc123/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"vote": "up", "voter": "manager_001"}'
```

Response:
```json
{
  "ideaId": "idea_abc123",
  "vote": "up",
  "totalVotes": 16,
  "upvotes": 16,
  "downvotes": 0
}
```

### Add Comment

```bash
curl -X POST http://localhost:4865/api/ideas/idea_abc123/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"comment": "Great idea! Can integrate with existing Legal OS.", "author": "legal_team"}'
```

Response:
```json
{
  "commentId": "comment_xyz789",
  "ideaId": "idea_abc123",
  "comment": "Great idea! Can integrate with existing Legal OS.",
  "author": "legal_team",
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### Update Pilot Metrics

```bash
curl -X PUT http://localhost:4865/api/ideas/idea_abc123/pilot \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "adoptionRate": 0.35,
    "revenueImpact": 15000,
    "satisfactionScore": 4.2
  }'
```

Response:
```json
{
  "ideaId": "idea_abc123",
  "pilot": {
    "adoptionRate": 0.35,
    "revenueImpact": 15000,
    "satisfactionScore": 4.2
  },
  "updatedAt": "2026-06-28T12:00:00.000Z"
}
```

### Create Innovation Goal

```bash
curl -X POST http://localhost:4865/api/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "title": "Q3 Innovation Target",
    "targetIdeas": 20,
    "targetDeployments": 5,
    "targetRevenue": 100000
  }'
```

Response:
```json
{
  "id": "goal_abc123",
  "title": "Q3 Innovation Target",
  "targetIdeas": 20,
  "targetDeployments": 5,
  "targetRevenue": 100000,
  "createdAt": "2026-06-28T12:00:00.000Z"
}
```

### Get Leaderboard

```bash
curl "http://localhost:4865/api/leaderboard?category=technology&limit=10"
```

Response:
```json
{
  "count": 10,
  "leaderboard": [
    { "id": "idea_abc123", "title": "AI-Powered Contract Review", "votes": 16, "impactScore": 0.92 },
    { "id": "idea_def456", "title": "Auto-escalation Rules", "votes": 12, "impactScore": 0.85 }
  ]
}
```

### Get Innovation Stats

```bash
curl http://localhost:4865/api/stats
```

Response:
```json
{
  "totalIdeas": 45,
  "byStatus": {
    "under_review": 10,
    "approved": 15,
    "pilot": 8,
    "deployed": 12
  },
  "avgVotesPerIdea": 5.2,
  "totalRevenueFromIdeas": 250000,
  "topCategory": "technology"
}
```

---

## Idea Status Lifecycle

```
under_review → approved → pilot → scale → deployed
                    ↘           ↗
                   rejected / archived
```

---

## Categories

- product
- process
- technology
- marketing
- operations

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4865 | Service port |

---

**Last Updated:** 2026-06-28
