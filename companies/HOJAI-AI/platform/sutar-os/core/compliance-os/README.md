# Compliance OS

## Purpose
SOC2, ISO27001, GDPR, HIPAA, PCI-DSS controls management with audit trails and evidence collection.

## Port
4873

## Features
- Multi-framework compliance tracking (SOC2, ISO27001, GDPR, HIPAA, PCI-DSS)
- Control status management (compliant, non_compliant, in_progress, not_applicable)
- Evidence collection and approval workflow
- Finding management with severity levels
- Risk score calculation
- Audit logging with filtering
- Framework reports and exports
- Dashboard with compliance rates

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness check |
| GET | /api/controls | List controls with filtering |
| GET | /api/controls/:id | Get control details |
| POST | /api/controls | Create a new control |
| PUT | /api/controls/:id | Update control status/owner/notes |
| DELETE | /api/controls/:id | Delete a control |
| POST | /api/controls/:id/evidence | Add evidence to control |
| POST | /api/evidence/:evidenceId/approve | Approve/reject evidence |
| GET | /api/findings | List all findings with filters |
| POST | /api/controls/:id/findings | Create finding for control |
| PUT | /api/findings/:id | Update finding status |
| GET | /api/audit | Get audit logs with filtering |
| GET | /api/audit/export | Export audit logs (JSON/CSV) |
| GET | /api/dashboard | Get compliance dashboard |
| GET | /api/reports/:framework | Generate framework report |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4873 | Service port |

## Risk Scoring

| Severity | Weight |
|----------|--------|
| Critical | 40 |
| High | 25 |
| Medium | 10 |
| Low | 5 |

Risk levels:
- Low: < 25
- Medium: 25-49
- High: 50-74
- Critical: 75+

## Finding Status

- `open` - Newly created, not addressed
- `in_progress` - Remediation underway
- `resolved` - Issue fixed
- `accepted` - Risk accepted by management

## Evidence Types

- document
- screenshot
- log
- certificate
- policy
- report