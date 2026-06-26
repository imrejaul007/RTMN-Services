# Employee Twin - Port 4730

## Overview
Employee profiles, skills, performance digital twins.

## Purpose
Digital twin for employees with skills and performance tracking.

## Key Features
- Employee profiles
- Skills inventory
- Performance metrics
- Learning history
- Role capabilities

## API Endpoints

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee
- `PATCH /api/employees/:id` - Update employee

### Skills
- `GET /api/employees/:id/skills` - Get skills
- `POST /api/employees/:id/skills` - Add skill

### Performance
- `GET /api/employees/:id/performance` - Get performance

## Environment
- Port: 4730

## Startup
```bash
cd platform/twins/employee-twin && npm run dev
```
