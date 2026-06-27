# Autonomous Recruitment Agent - Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Priority:** HIGH

## Executive Summary

AI-powered recruitment agent that autonomously sources candidates, conducts initial screening, schedules interviews, and reduces hiring time by 70%.

**Core Value:** "Your AI Recruiter That Works 24/7"

---

## Problem Statement

| Pain Point | Current Reality | Solution |
|------------|-----------------|----------|
| Manual sourcing | Hours of LinkedIn scrolling | AI candidate discovery |
| Resume screening | Thousands of applications | AI screening & scoring |
| Scheduling chaos | Email back-and-forth | Auto calendar sync |
| Bias in hiring | Unconscious bias | AI standardization |
| Long time-to-hire | Weeks/months | Streamlined automation |
| High cost-per-hire | Agency fees 15-25% | Direct sourcing |

---

## Target Market

- **Staffing agencies** with high volume hiring
- **IT companies** with tech talent needs
- **Startups** needing quick scaling
- **Enterprises** with recurring hiring needs
- **RPOs** (Recruitment Process Outsourcers)

---

## Product Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              AUTONOMOUS RECRUITMENT AGENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT LAYER                                                   │
│  ├── Job Requirements ──── Hiring Manager Input                 │
│  ├── Resume Database ──── Existing Candidates                  │
│  ├── Job Boards ───────── LinkedIn, Naukri, Indeed            │
│  └── Internal ATS ──────── Existing hiring system              │
│                                                                 │
│  AI PROCESSING LAYER                                           │
│  ├── Resume Parser (AI Intelligence)                          │
│  ├── Skill Matcher (AI Intelligence)                          │
│  ├── Candidate Ranker (AI Intelligence)                        │
│  ├── Interview Scheduler (Calendar Integration)                  │
│  └── Salary Analyzer (Market Data)                             │
│                                                                 │
│  TWIN LAYER                                                    │
│  ├── Job Twin ──────────── Job requirements & history        │
│  ├── Candidate Twin ────── Skills, experience, preferences   │
│  └── Company Twin ──────── Culture, team, growth              │
│                                                                 │
│  OUTPUT LAYER                                                  │
│  ├── Shortlisted Candidates                                    │
│  ├── Interview Schedule                                        │
│  ├── Offer Package                                            │
│  └── Onboarding Checklist                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

### 1. Smart Job Analysis

| Feature | Description |
|---------|-------------|
| JD Parser | Extract requirements from job description |
| Skills Extractor | Identify must-have vs nice-to-have |
| Salary Benchmark | Market rate for role/level/location |
| Timeline Predictor | Expected time-to-fill |
| Source Strategy | Best channels for this role |
| Competition Analysis | What other companies pay |

### 2. AI Candidate Sourcing

| Feature | Description |
|---------|-------------|
| Resume Parser | Extract structured data from any format |
| Skill Matching | Match candidates to requirements |
| Diversity Scoring | Track diversity metrics |
| Experience Weighting | Prioritize relevant experience |
| Location Filter | Remote/hybrid/onsite matching |
| Availability Check | Notice period, start date |

### 3. Intelligent Screening

| Feature | Description |
|---------|-------------|
| Resume Scoring | 0-100 match score |
| Gap Analyzer | Employment gap explanations |
| Red Flag Detector | Gaps, job hopping, gaps |
| Culture Fit Score | Based on company twin |
| Growth Trajectory | Career progression analysis |
| Certification Check | Required credentials verified |

### 4. Conversational Screening

| Feature | Description |
|---------|-------------|
| WhatsApp Bot | Initial candidate interaction |
| Voice Screening | 2-min phone screen |
| Custom Questions | Role-specific screening |
| Availability Capture | Candidate preferences |
| Document Collection | Resume, certs, ID |
| FAQ Answering | Common questions answered |

### 5. Interview Intelligence

| Feature | Description |
|---------|-------------|
| Interview Builder | Generate structured questions |
| Interviewer Assignment | Match to candidate profile |
| Calendar Sync | Auto-schedule across timezones |
| Reminder System | Reduce no-shows |
| Interview Guide | Help interviewers assess |
| Real-time Notes | AI note-taking |

### 6. Assessment Integration

| Feature | Description |
|---------|-------------|
| Test Scheduler | Send assessments automatically |
| Score Integration | Import results |
| Skill Verification | Technical evaluation |
| Personality Assessment | Culture fit metrics |
| Reference Check | Automated reference calls |

### 7. Offer & Negotiation

| Feature | Description |
|---------|-------------|
| Offer Builder | Auto-generate packages |
| Negotiation Support | Market data for discussion |
| Counter-offer Tracker | Track responses |
| Deadline Manager | Keep process moving |
| Signing Automation | DocuSign integration |

### 8. Analytics Dashboard

| Feature | Description |
|---------|-------------|
| Pipeline Analytics | Funnel visualization |
| Source Effectiveness | Which channels work |
| Time-to-Hire | By role, department |
| Cost-per-Hire | Per channel, per role |
| Quality of Hire | 90-day retention |
| Recruiter Productivity | Candidates per recruiter |

---

## API Endpoints

```bash
# Jobs
POST /api/jobs                    # Create job requisition
GET  /api/jobs                   # List all jobs
GET  /api/jobs/:id               # Job details

# Candidates
GET  /api/candidates/sourced      # AI-sourced candidates
GET  /api/candidates/screened     # Screened shortlist
POST /api/candidates/screen        # Submit screening results
GET  /api/candidates/:id          # Candidate profile

# Screening
POST /api/screen/conversation     # Start screening chat
POST /api/screen/voice           # Voice screening

# Interviews
POST /api/interviews/schedule     # Auto-schedule interview
GET  /api/interviews/calendar     # Interview calendar
POST /api/interviews/notes        # Submit interview notes

# Offers
POST /api/offers/create           # Generate offer
POST /api/offers/negotiate        # Negotiation support

# Analytics
GET  /api/analytics/pipeline     # Pipeline metrics
GET  /api/analytics/sources      # Source effectiveness
GET  /api/analytics/time-to-hire  # Time metrics
```

---

## Integration Points

| Service | Port | Role |
|---------|------|------|
| TalentAI Recruiter | 4011 | Candidate sourcing |
| TalentAI Interviewer | 4012 | Interview automation |
| AI Intelligence | 4881 | Resume parsing, matching |
| Workforce OS | 5077 | HR data sync |
| BLR Marketplace | - | Candidate marketplace |
| RAZO Keyboard | 4299 | WhatsApp screening |

---

## Pricing Model

| Tier | Price | Features |
|------|-------|---------|
| Starter | INR4999/mo | Up to 20 jobs, 100 candidates |
| Growth | INR14999/mo | Unlimited jobs, AI sourcing |
| Enterprise | INR39999/mo | Custom integrations, dedicated CSM |

**Additional:** INR500-5000 per hire (by level)

---

## Development Effort

| Component | Weeks | Complexity |
|-----------|-------|------------|
| Job Analysis AI | 2 | Medium |
| Resume Parser | 2 | High |
| Screening Bot | 3 | High |
| Interview Scheduler | 2 | Medium |
| Offer Engine | 1 | Low |
| Analytics | 2 | Medium |
| Mobile App | 2 | Medium |
| **Total** | **14 weeks** | - |

---

## Success Metrics (6 months)

| Metric | Target |
|--------|--------|
| Customers | 100 |
| Avg Time-to-Hire | 15 days |
| Avg Cost-per-Hire | INR8000 |
| Quality of Hire | 85% retention |
| NPS | 55+ |

---

*Last Updated: June 28, 2026*
