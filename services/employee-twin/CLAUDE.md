# Employee Twin Service

**Version:** 1.0.0
**Port:** 4891
**Status:** Ready for Development

## Overview

The Employee Twin service manages agent/employee profiles with skills, performance metrics, schedules, training records, and AI-generated insights. It provides a comprehensive view of employee capabilities and workload.

## Features

- **Multi-tenant support** - Isolated data per tenant via `tenantId`
- **Skills Management** - Languages, products, channels, soft skills with proficiency levels
- **Performance Tracking** - Tickets handled, CSAT, resolution time, trends
- **Schedule Management** - Shift types, working days, WFH status
- **Training Records** - History, pending, overdue, certifications
- **AI Insights** - Strengths, improvement areas, recommendations
- **Workload Analysis** - Current load vs capacity, forecasts

## API Endpoints

### Employees
```
POST   /api/employees                    - Create employee
GET    /api/employees                    - List employees (paginated)
GET    /api/employees/:employeeId        - Get employee details
PUT    /api/employees/:employeeId        - Update employee
DELETE /api/employees/:employeeId        - Terminate employee
GET    /api/employees/:employeeId/insights - Get AI insights
GET    /api/employees/:employeeId/workload - Get workload analysis
GET    /api/employees/department/:dept    - Get department employees
GET    /api/employees/team/:managerId    - Get team members
```

### Skills
```
POST   /api/skills/:employeeId           - Create/update skills
GET    /api/skills/:employeeId           - Get employee skills
PATCH  /api/skills/:employeeId/languages  - Update languages
PATCH  /api/skills/:employeeId/products   - Update products
PATCH  /api/skills/:employeeId/channels   - Update channels
PATCH  /api/skills/:employeeId/soft-skills - Update soft skills
POST   /api/skills/:employeeId/languages  - Add language
POST   /api/skills/:employeeId/products   - Add product
POST   /api/skills/:employeeId/channels   - Add channel
GET    /api/skills/search/by-skill       - Find employees by skill
DELETE /api/skills/:employeeId           - Delete skills record
```

### Schedule
```
POST   /api/schedule/:employeeId         - Create schedule
GET    /api/schedule/:employeeId/current - Get current schedule
GET    /api/schedule/:employeeId         - Get all schedules
PUT    /api/schedule/:scheduleId         - Update schedule
PATCH  /api/schedule/:employeeId/wfh     - Toggle WFH status
GET    /api/schedule/by-shift/:type       - Get by shift type
GET    /api/schedule/wfh/employees       - Get WFH employees
GET    /api/schedule/today/working       - Get working today
DELETE /api/schedule/:scheduleId         - Deactivate schedule
```

### Training
```
POST   /api/training/:employeeId         - Create training record
GET    /api/training/:employeeId         - Get all training
GET    /api/training/:employeeId/pending - Get pending training
GET    /api/training/:employeeId/overdue - Get overdue training
GET    /api/training/:employeeId/stats   - Get training stats
GET    /api/training/record/:id          - Get training by ID
PUT    /api/training/record/:id          - Update training
PATCH  /api/training/record/:id/complete - Mark complete
GET    /api/training/due/all             - Get all due training
DELETE /api/training/record/:id         - Delete training
```

### Performance
```
POST   /api/performance/:employeeId       - Create record
GET    /api/performance/:employeeId       - Get all records
GET    /api/performance/:employeeId/latest - Get latest
GET    /api/performance/:employeeId/trends - Get trends
GET    /api/performance/:employeeId/stats  - Get statistics
PUT    /api/performance/record/:id        - Update record
POST   /api/performance/compare           - Compare employees
GET    /api/performance/department/:dept/stats - Department stats
DELETE /api/performance/record/:id        - Delete record
```

### Health Check
```
GET    /health                            - Service health
```

## Data Models

### Employee
- `tenantId`, `employeeId` (unique)
- `firstName`, `lastName`, `email`
- `department`, `role`, `level`
- `managerId`, `hireDate`, `status`
- `skills`, `certifications`, `schedules`, `trainings`, `performanceRecords`

### Skills
- `languages` - `{ language, proficiency, certified }`
- `products` - `{ productName, proficiency, yearsOfExperience }`
- `channels` - `{ channel, proficiency, certifications }`
- `softSkills` - `{ skill, level }`
- `overallProficiency` (calculated)

### Schedule
- `shiftType` - morning, afternoon, evening, night, flexible, rotating
- `workingDays` - array of days
- `startTime`, `endTime`
- `isWorkFromHome`, `wfhDays`
- `weeklyHours`

### Training
- `trainingName`, `trainingType`, `provider`
- `status` - enrolled, in_progress, completed, failed, cancelled
- `score`, `certificateObtained`, `certificateUrl`
- `isMandatory`, `dueDate`, `renewalRequired`

### Performance
- `period` - daily, weekly, monthly, quarterly, annual
- `ticketsHandled`, `ticketsResolved`, `ticketsEscalated`
- `csat` (1-5), `nps` (-100 to 100)
- `averageResolutionTime` (seconds)
- `qualityScore`, `productivityIndex`, `attendanceRate`
- `overallScore` (calculated)

## Insights Generated

```json
{
  "overview": { "tenure", "experienceLevel", "role", "department" },
  "strengths": ["multilingual", "high CSAT", ...],
  "improvementAreas": ["resolution time", ...],
  "skillProficiency": { "overall", "breakdown", "topSkills", "skillGaps" },
  "performance": { "overallScore", "csatAverage", "resolutionRate", "trend" },
  "training": { "completedCount", "pendingCount", "complianceStatus" },
  "schedule": { "shiftType", "isWFH", "weeklyHours" },
  "workload": { "currentLoad", "capacity", "utilizationPercentage", "status" },
  "recommendations": [...]
}
```

## Workload Calculation

```
capacity.weeklyHours = from schedule (default 40)
capacity.maxTicketsPerWeek = (weeklyHours - training - meetings - breaks) / 0.5

utilizationPercentage = (totalLoadHours / weeklyHours) * 100
status:
  - underutilized: < 50%
  - optimal: 50-100%
  - high: 100-130%
  - critical: > 130%
```

## Multi-Tenancy

All requests must include `x-tenant-id` header:
```
x-tenant-id: tenant-123
```

## Quick Start

```bash
# Install dependencies
cd services/employee-twin
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your MongoDB URI

# Start service
npm run dev

# Or build and run
npm run build
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4891 | Server port |
| MONGODB_URI | mongodb://localhost:27017/employee-twin | MongoDB connection |
| ALLOWED_ORIGINS | http://localhost:4891 | CORS origins |

## Dependencies

- express: Web framework
- mongoose: MongoDB ODM
- cors: Cross-origin resource sharing
- helmet: Security headers
- zod: Schema validation
- uuid: Unique ID generation

## Integration

Connect to other RTMN services via REST API:

- **REZ-event-bus** (port 4510) - Publish employee events
- **REZ-ecosystem-connector** (port 4399) - Service discovery
- **CorpID** (port 4702) - Identity verification

## Health Check

```bash
curl http://localhost:4891/health
```

Response:
```json
{
  "status": "healthy",
  "service": "employee-twin",
  "timestamp": "2026-06-16T00:00:00.000Z"
}
```
