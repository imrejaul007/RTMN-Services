# RTMN Talent OS

**Version:** 1.0  
**Port:** 5066  
**Status:** Phase 1 - Building  
**Parent:** RTMN Workforce OS  
**Parent App:** CorpPerks TalentAI (Port 3002)

---

## Overview

Talent OS is the unified Recruitment & ATS platform that integrates with:
- CorpPerks TalentAI (existing frontend)
- Workforce OS Core (5065)
- CorpPerks Role AI Agents (4130)
- CorpPerks Intelligence (4135)

---

## Features

### Core Recruitment
- Job posting management
- Candidate pipeline
- Resume parsing & scoring
- AI-powered candidate matching
- Interview scheduling
- Offer management
- Background verification
- Talent pool

### AI Features
- AI Recruiter Agent
- AI Sourcer
- AI Interviewer
- Skills matching algorithm
- Candidate scoring
- Culture fit prediction

### Integration
- LinkedIn import
- Job board posting
- Calendar sync (meeting-service)
- HRIS sync (workforce-os)
- CorpID identity

---

## API Endpoints

### Jobs
```
GET    /api/jobs                 - List jobs
POST   /api/jobs                 - Create job
GET    /api/jobs/:id             - Job details
PATCH  /api/jobs/:id             - Update job
POST   /api/jobs/:id/publish     - Publish job
POST   /api/jobs/:id/close       - Close job
GET    /api/jobs/:id/analytics   - Job analytics
```

### Candidates
```
GET    /api/candidates           - List candidates
POST   /api/candidates           - Add candidate
GET    /api/candidates/:id       - Candidate profile
PATCH  /api/candidates/:id       - Update candidate
POST   /api/candidates/:id/move  - Move in pipeline
POST   /api/candidates/:id/score - AI score
POST   /api/candidates/:id/interview - Schedule interview
POST   /api/candidates/:id/offer - Generate offer
```

### Pipeline
```
GET    /api/pipeline/kanban      - Kanban view
GET    /api/pipeline/stats        - Funnel analytics
GET    /api/pipeline/timeline    - Time-to-hire
```

### AI
```
POST   /api/ai/score             - Score candidate
POST   /api/ai/match             - Match to jobs
POST   /api/ai/interview         - Generate questions
POST   /api/ai/sourcing          - Source candidates
```

### Talent Pool
```
GET    /api/talent-pool          - All passive candidates
POST   /api/talent-pool          - Add to pool
GET    /api/talent-pool/:id      - Candidate details
```

---

## Events Published

- `talent.job.created`
- `talent.job.published`
- `talent.candidate.applied`
- `talent.candidate.stage_changed`
- `talent.candidate.hired`

---

*Last Updated: June 17, 2026*
