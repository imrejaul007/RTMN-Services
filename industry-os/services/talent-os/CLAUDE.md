# Talent OS

**Port:** 5282  
**Status:** ✅ Built (June 26, 2026)

AI-Powered Talent Acquisition & Management: Sourcing, screening, interviewing, matching, and workforce planning.

## AI Agents (4)

| Agent | Purpose |
|-------|---------|
| Candidate Sourcing Agent | Passive search, job posting optimization, outreach |
| Screening Agent | Resume screening, assessments, candidate scoring |
| Interview Intelligence Agent | Interview scheduling, fit analysis, feedback generation |
| Matching Agent | Job-to-candidate matching, salary recommendations |

## Key Features

- **Sourcing**: Passive candidate search, job board optimization, referral programs
- **Screening**: Resume parsing, skills matching, automated assessments
- **Interviewing**: Smart scheduling, fit scoring, structured feedback
- **Matching**: AI-powered matching, salary benchmarking, culture fit analysis
- **Pipeline Analytics**: Conversion rates, time-to-hire, source effectiveness

## Endpoints

```
POST /api/candidates               # Add candidate
GET  /api/candidates              # List candidates
POST /api/jobs                    # Create job
GET  /api/jobs                    # List jobs
POST /api/applications            # Submit application
POST /api/sourcing/:jobId/find   # Find candidates
POST /api/screening/:jobId/resume # Screen resume
POST /api/interviews              # Schedule interview
GET  /api/analytics/pipeline     # Pipeline analytics
```

## Start

```bash
cd industry-os/services/talent-os
npm start
# http://localhost:5282/health
```

## Dependencies

- express, cors, helmet, express-rate-limit
