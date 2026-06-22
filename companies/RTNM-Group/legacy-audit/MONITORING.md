# RTNM-Group Monitoring Guide

**Last Updated:** 2026-05-16

---

## Services Monitored

| Service | Purpose | Health Endpoint |
|---------|---------|-----------------|
| REZ-identity-service | Identity management | /health |
| REZ-capital-service | Capital financing | /health |
| REZ-bnpl-service | BNPL payments | /health |
| rez-admin-service | Admin API | /health |
| REZ-secrets-manager | Secrets vault | /health |

---

## Security Monitoring

### Authentication Failures

- Monitor failed login attempts
- Alert on unusual patterns
- Rate limit enforcement

### API Usage

- Track request volumes
- Monitor latency
- Alert on anomalies

---

## Compliance

### Data Privacy

- GDPR compliance checks
- Data retention policies
- Audit logging

---

## Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High Error Rate | > 1% | Page on-call |
| Slow Response | > 2s | Investigate |
| Auth Failures | > 10/min | Review security |
