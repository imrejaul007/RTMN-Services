# HOJAI Cloud — Phase 2 Plan

> **Date:** 2026-06-25
> **Phase:** 2 of N
> **Prerequisite:** Phase 1 Complete (6 services on ports 4380-4440)

---

## Phase 1 Recap

| Service | Port | Status |
|---------|------|--------|
| HOJAI Cloud v1.2 | 4380 | ✅ |
| App Store API | 4400 | ✅ |
| Cost Tracker | 4410 | ✅ |
| Secrets Manager | 4420 | ✅ |
| Voice Studio API | 4430 | ✅ |
| Workflow Builder API | 4440 | ✅ |

---

## Phase 2 Priorities

### P1 — High Priority

#### 1. Developer Portal (Docs + API Explorer)
- **Effort:** 3 weeks
- **Purpose:** Docs site for all HOJAI Cloud services
- **Features:**
  - Interactive API explorer
  - SDK documentation
  - Quickstart guides
  - Authentication guides
  - Code examples

#### 2. Billing Integration
- **Effort:** 2 weeks
- **Purpose:** Connect Cost Tracker to actual billing
- **Features:**
  - Stripe/Razorpay integration
  - Invoice generation
  - Payment methods
  - Usage-based billing

#### 3. Deployment Pipeline (CI/CD)
- **Effort:** 2 weeks
- **Purpose:** Connect to GitHub/GitLab for auto-deploy
- **Features:**
  - Git webhook integration
  - Build pipeline
  - Preview deployments on PR
  - Production deployments on merge

### P2 — Medium Priority

#### 4. Team Collaboration
- **Effort:** 2 weeks
- **Purpose:** Multi-user support
- **Features:**
  - Team/organization management
  - Role-based access control
  - Shared projects
  - Activity logs

#### 5. Analytics Dashboard
- **Effort:** 2 weeks
- **Purpose:** Usage analytics for companies
- **Features:**
  - Real-time metrics
  - Usage trends
  - Cost breakdowns
  - Performance monitoring

#### 6. Notification System
- **Effort:** 1 week
- **Purpose:** Alert users about important events
- **Features:**
  - Email notifications
  - Webhook notifications
  - In-app notifications

### P3 — Lower Priority

#### 7. Marketplace Payments
- **Effort:** 2 weeks
- **Purpose:** Revenue sharing for app publishers
- **Features:**
  - Payment splitting
  - Revenue dashboard
  - Payout processing

#### 8. Advanced Voice Features
- **Effort:** 3 weeks
- **Purpose:** Enhanced voice capabilities
- **Features:**
  - Voice cloning
  - Custom voices
  - IVR builder
  - Call recording

---

## New Services (Phase 2)

| Service | Port | Purpose |
|---------|------|---------|
| developer-portal | 4450 | Docs + API explorer |
| billing-service | 4460 | Stripe/Razorpay integration |
| deployment-pipeline | 4470 | CI/CD for deployments |
| collaboration-service | 4480 | Teams + RBAC |
| analytics-service | 4490 | Usage analytics |
| notification-service | 4495 | Email/webhook notifications |

---

## Implementation Order

### Week 1-2: Developer Portal
```
services/developer-portal/ (port 4450)
- Static docs site
- API explorer (Swagger/OpenAPI)
- Quickstart guides
```

### Week 3-4: Billing Integration
```
services/billing-service/ (port 4460)
- Stripe integration
- Invoice generation
- Usage-based billing
```

### Week 5-6: Deployment Pipeline
```
services/deployment-pipeline/ (port 4470)
- Git webhook handler
- Build system
- Preview deployments
```

### Week 7-8: Team Collaboration
```
services/collaboration-service/ (port 4480)
- Team management
- RBAC
- Shared projects
```

### Week 9-10: Analytics + Notifications
```
services/analytics-service/ (port 4490)
- Real-time metrics
- Usage trends

services/notification-service/ (port 4495)
- Email/webhook
- In-app alerts
```

---

## Phase 2 Success Criteria

- [ ] Developer Portal live with API explorer
- [ ] Stripe integration working for billing
- [ ] GitHub webhook triggering preview deployments
- [ ] Teams with RBAC functional
- [ ] Analytics dashboard showing real metrics

---

## Risks

| Risk | Mitigation |
|------|------------|
| Stripe integration complexity | Use Stripe Connect for marketplace |
| Git webhook reliability | Queue system with retries |
| Multi-tenancy performance | Database connection pooling |

---

*Last updated: 2026-06-25*
