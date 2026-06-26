# Product OS

**Port:** 5271  
**Status:** ✅ Built (June 26, 2026)

Product Management Platform: Feature tracking, PRDs, user stories, roadmaps, and product analytics.

## AI Agents (2)

| Agent | Purpose |
|-------|---------|
| Feature Prioritizer | Impact/effort analysis, priority scoring, sprint planning |
| Roadmap Planner | Roadmap generation, timeline optimization, stakeholder alignment |

## Key Features

- **Feature Management**: Feature tracking, status workflow, acceptance criteria
- **PRD Management**: Product requirement docs, success metrics, user stories
- **Roadmapping**: Timeline planning, milestone tracking, dependency management
- **User Stories**: Story creation, acceptance criteria, story points
- **Product Analytics**: Usage tracking, feature adoption, customer feedback

## Endpoints

```
POST /api/features                # Create feature
GET  /api/features                # List features
PATCH /api/features/:id          # Update feature
POST /api/prds                   # Create PRD
GET  /api/prds/:id               # PRD details
POST /api/roadmaps               # Create roadmap
GET  /api/roadmaps               # List roadmaps
GET  /api/roadmaps/:id/timeline # Roadmap timeline
POST /api/stories                # Create user story
```

## Start

```bash
cd industry-os/services/product-os
npm start
# http://localhost:5271/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
