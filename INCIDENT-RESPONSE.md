# Incident Response Playbook

**Last Updated:** June 15, 2026
**Owner:** RTMN Operations Team
**Review:** Quarterly

---

## Overview

This playbook defines how RTMN handles production incidents. Every team member must be familiar with their role.

**Principles:**
1. **Speed over root cause** — Restore service first, investigate later
2. **Transparency** — Communicate early and often; own the problem
3. **No blame** — Systems fail, not people. Focus on fixes, not fault
4. **Learn** — Every incident produces a post-mortem

---

## Severity Levels

| Severity | Definition | Examples | Response Time | Resolution Target |
|----------|------------|----------|--------------|-------------------|
| **SEV-1** | **Critical** — Production down, data loss, or security breach | API returns 500 for all requests; database corrupted; unauthorized access | < 5 min | < 1 hour |
| **SEV-2** | **High** — Major feature unavailable; significant user impact | BrandPulse dashboard inaccessible; 30%+ error rate | < 15 min | < 4 hours |
| **SEV-3** | **Medium** — Degraded performance; workaround available | Slow API responses (>2s); intermittent errors | < 1 hour | < 24 hours |
| **SEV-4** | **Low** — Minor issue; minimal user impact | Cosmetic bug; non-critical error logs | < 4 hours | < 1 week |

---

## On-Call Rotation

| Role | Responsibility |
|------|---------------|
| **Primary On-Call** | First responder; owns SEV-1/2 until handoff |
| **Secondary On-Call** | Backup; assists with SEV-1/2; owns SEV-3/4 |
| **Engineering Lead** | Escalation for SEV-1; makes go/no-go decisions |
| **Operations Lead** | Coordinates communication; manages escalations |
| **VP Engineering** | Final escalation; board notification if needed |

**Current rotation:** [TBD — integrate with PagerDuty]

---

## Response Procedures

### SEV-1: Critical Incident

#### 0–5 minutes: Detection & Alert

1. **Alert received** via PagerDuty / monitoring
2. **Acknowledge** within 2 minutes
3. **Create incident channel** (#incident-YYYY-MM-DD on Slack)
4. **Page secondary on-call** if not auto-escalated
5. **Initial assessment:**
   - What is broken?
   - What services are affected?
   - How many users impacted?
   - Any data loss or security concern?

#### 5–15 minutes: Communication & Triage

6. **Update status page** → "Investigating" (🟡 or 🔴)
7. **Send customer notification** — email/SMS to affected customers (for Enterprise)
8. **Brief the team:**
   - Post initial findings in incident channel
   - Assign roles: Incident Commander, Tech Lead, Communications Lead
   - Begin structured troubleshooting

9. **Triage checklist:**
   - [ ] Check monitoring dashboards (Datadog, Sentry)
   - [ ] Check recent deployments (was there a code change?)
   - [ ] Check infrastructure (AWS/GCP health, ELB, databases)
   - [ ] Check external dependencies (Stripe, MongoDB Atlas, Redis)
   - [ ] Check for unusual traffic (DDoS? spike?)

#### 15–60 minutes: Resolution

10. **Implement fix** — prioritize fastest path to recovery
    - Rollback if recent deployment
    - Scale up if load-related
    - Failover if infrastructure issue
    - Disable feature flag if isolated

11. **Verify fix:**
    - Error rate returns to normal
    - Latency returns to normal
    - No new errors in logs
    - Canary check (send test traffic)

12. **Update status page** → "Mitigating" → "Resolved"
13. **Send resolution notification** to customers

#### Post-Incident (within 48 hours)

14. **Post-mortem meeting** — blameless, focused on systems
15. **Document in post-mortem template** (see below)
16. **Create follow-up tickets** for permanent fixes
17. **Update runbook** if procedure gaps found

---

### SEV-2: High Incident

1. Acknowledge within 15 minutes
2. Create #incident channel
3. Update status page → "Investigating"
4. Notify Enterprise customers via in-app banner
5. Assign incident owner
6. Investigate and fix within 4 hours
7. Update status page when resolved
8. Post-mortem within 1 week

---

### SEV-3: Medium Incident

1. Acknowledge within 1 hour
2. Update status page if >1 hour to resolve
3. Investigate during business hours (or on-call if off-hours)
4. Fix within 24 hours
5. Document in incident log
6. Post-mortem optional (required if customer-impacting)

---

### SEV-4: Low Incident

1. Acknowledge within 4 hours
2. Log in tracking system (Linear/Jira)
3. Fix in normal sprint or backlog
4. No status page update unless >1 week

---

## Communication Templates

### Status Page: Investigating

```
We are investigating an issue affecting [Service Name].
Customers may experience [specific symptom].
We will provide an update within 30 minutes.

— RTMN Operations Team
```

### Status Page: Mitigating

```
We have identified the cause of the issue and are implementing a fix.
Estimated resolution: [TIME].
We will update every 30 minutes until resolved.

— RTMN Operations Team
```

### Status Page: Resolved

```
This incident has been resolved.
Duration: [X hours Y minutes]
Affected: [Services]
Next: We will publish a post-mortem within 5 business days.

— RTMN Operations Team
```

### Customer Email (SEV-1/2)

```
Subject: [RTMN] Service Incident - [Date]

Dear [Customer Name],

We are experiencing an issue with [Service] starting at [Time].
Impact: [Description of impact on their account]
Current status: [Investigating/Mitigating]

Our team is actively working to restore service.
We will provide updates every 30 minutes.

We apologize for the disruption. A full post-mortem will be published.
Service credits will be applied automatically per your SLA.

Contact: support@rtmn.com | +1-[TBD]

— RTMN Operations Team
```

---

## Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]
**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** SEV-[N]
**Status:** Resolved

## Summary
[2-3 sentence executive summary]

## Impact
- Services affected: [List]
- Customers impacted: [Count / percentage]
- Revenue impact: [Estimate if applicable]
- SLA impact: [Yes/No]

## Timeline (all times in UTC)
| Time | Event |
|------|-------|
| HH:MM | Alert triggered |
| HH:MM | On-call acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Fix implemented |
| HH:MM | Service restored |

## Root Cause
[Detailed explanation of what went wrong]

## Contributing Factors
- [Factor 1]
- [Factor 2]

## Resolution
[What was done to fix it]

## Lessons Learned

### What Went Well
- [Item 1]
- [Item 2]

### What Could Be Improved
- [Item 1]
- [Item 2]

## Action Items

| Action | Owner | Due Date |
|--------|-------|----------|
| [Action] | [Name] | [Date] |
| [Action] | [Name] | [Date] |

## Supporting Data
- Monitoring screenshots
- Logs
- Relevant commits
```

---

## Escalation Path

```
SEV-1: On-Call → Engineering Lead → VP Engineering → CEO
SEV-2: On-Call → Engineering Lead → VP Engineering (if >2 hours)
SEV-3: On-Call → Engineering Lead (if >12 hours)
SEV-4: Normal backlog
```

## Tools & Resources

| Tool | Purpose |
|------|---------|
| **PagerDuty** | On-call rotation, alerting, escalation |
| **Datadog** | Monitoring, dashboards, APM |
| **Sentry** | Error tracking, crash reports |
| **Status Page** | status.rtmn.io — customer-facing status |
| **Slack** (#incidents) | Internal coordination |
| **Jira/Linear** | Incident tracking, action items |
| **AWS/GCP Console** | Infrastructure management |
| **Runbooks** | [RUNBOOK.md](RUNBOOK.md) — step-by-step fixes |

---

*When in doubt, escalate. It is always better to wake someone up unnecessarily than to let a SEV-1 fester.*