# Employee Identity

**Service:** Employee Management
**Port:** 4702 (via gateway)
**Prefix:** `/api/employee`

---

## Overview

The Employee Identity service provides deep employee identity management for HR systems (CorpPerks, Workforce OS). It tracks employment details, skills, documents, and leave balances.

## Features

- **Employment Details:** Title, department, manager, work location
- **Employment Types:** Full-time, part-time, contract, intern
- **Skills Management:** Track skills with proficiency levels
- **Certifications:** Mark certified skills with dates
- **Document Management:** Store employment documents
- **Leave Tracking:** CL, SL, EL balances
- **Compensation:** Payroll ID, cost center, band
- **Performance:** Review tracking
- **Employment Lifecycle:** Onboarding to termination

## Employment Types

| Type | Description |
|------|-------------|
| `full-time` | Full-time employee |
| `part-time` | Part-time employee |
| `contract` | Contract worker |
| `intern` | Intern |

## Employment Statuses

| Status | Description |
|--------|-------------|
| `active` | Currently employed |
| `on-leave` | On leave |
| `terminated` | Employment ended |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employee/me` | Get my employee profile |
| PUT | `/api/employee/me` | Update profile |
| POST | `/api/employee/me/skills` | Add skill |
| POST | `/api/employee/me/documents` | Add document |
| PUT | `/api/employee/me/leave` | Update leave balance |
| GET | `/api/employee/user/:userId` | Get user employee (admin) |
| POST | `/api/employee/user/:userId/terminate` | Terminate employment (admin) |
| GET | `/api/employee/stats` | Statistics (admin) |

## Usage Example

### Add Skill
```bash
curl -X POST http://localhost:4702/api/employee/me/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "JavaScript",
    "level": "expert",
    "certified": true,
    "certifiedAt": "2026-01-15"
  }'
```

### Add Document
```bash
curl -X POST http://localhost:4702/api/employee/me/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "id_proof",
    "name": "Passport",
    "url": "https://example.com/passport.pdf",
    "expiryDate": "2030-01-15"
  }'
```

### Update Leave Balance
```bash
curl -X PUT http://localhost:4702/api/employee/me/leave \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cl": 12,
    "sl": 10,
    "el": 20
  }'
```

## File Structure

```
employee/
├── src/
│   ├── models/
│   │   └── employee.model.js
│   └── routes/
│       └── employee.routes.js
└── CLAUDE.md
```
