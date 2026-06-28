# Innovation OS

## Purpose
Innovation OS provides ideas management, R&D tracking, pilot metrics, and innovation pipeline capabilities. It enables organizations to capture, evaluate, vote on, and progress ideas through a structured lifecycle from submission to deployment.

## Port
4865

## Features
- **Ideas Management** - Submit, review, approve, and track innovation ideas
- **Voting System** - Community voting with up/down votes and comments
- **Pilot Metrics** - Track pilot adoption, revenue, and satisfaction
- **Goals Tracking** - Set innovation targets and track progress
- **Leaderboard** - Rank ideas by votes, impact, and ROI
- **Category Filtering** - Organize by product, process, technology, marketing, operations
- **Statistics Dashboard** - Aggregate metrics on ideas pipeline

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness check |
| GET | /api/ideas | List ideas with filters (status, category, submittedBy, sort, limit) |
| GET | /api/ideas/:id | Get single idea |
| POST | /api/ideas | Create new idea |
| PUT | /api/ideas/:id | Update idea |
| POST | /api/ideas/:id/vote | Vote on idea |
| POST | /api/ideas/:id/comments | Add comment |
| PUT | /api/ideas/:id/pilot | Update pilot metrics |
| GET | /api/goals | List innovation goals |
| POST | /api/goals | Create goal |
| PUT | /api/goals/:id | Update goal progress |
| GET | /api/leaderboard | Get ideas leaderboard (category, limit) |
| GET | /api/stats | Get innovation statistics |

## Idea Status Lifecycle
```
under_review → approved → pilot → scale → deployed
                    ↘           ↗
                   rejected / archived
```

## Categories
- product
- process
- technology
- marketing
- operations

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4865 | Service port |

## Commands

```bash
npm run dev     # Development with hot reload
npm start       # Production (requires build)
npm test        # Run unit tests
npm run test:watch  # Watch mode for tests
```