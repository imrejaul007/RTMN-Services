# Fitness OS - Development Guide

**Port:** 5110  
**Type:** Industry OS (Fitness/Gym Management)  
**Tagline:** "Smart fitness club management"
**Status:** ✅ PRODUCTION READY

---

## Overview

Fitness OS is a comprehensive fitness club management platform that handles member management, trainer profiles, class scheduling, membership tracking, and attendance for gyms and fitness centers.

---

## Core Features

### Member Management
- Member CRUD with contact information
- Emergency contact details
- Membership type (basic, standard, premium, vip)
- Health info and fitness goals
- Attendance history
- CRM sync to REZ CRM Hub

### Trainer Management
- Trainer CRUD with specialties
- Certifications tracking
- Availability status
- Working hours
- Performance tracking

### Class Management
- Class CRUD with trainer assignment
- Schedule (day, time, recurring)
- Capacity management
- Enrollment tracking
- Categories: yoga, pilates, spinning, strength, hiit, dance, martial_arts, swimming

### Membership Plans
- Membership CRUD
- Type options: monthly, quarterly, yearly, lifetime
- Start/end date
- Pricing
- Auto-renewal

### Attendance Tracking
- Check-in with timestamp
- Check-out with timestamp
- Class tracking
- Member and date filtering
- Today's check-in count

### Workout Management
- Workout CRUD
- Exercise library
- Custom workouts
- Member assignment
- Progress tracking

### Analytics Dashboard
- Member statistics
- Trainer stats
- Class stats
- Attendance trends
- Today metrics

---

## Authentication & Database

### Authentication System
- **Register:** `POST /auth/register` - Create new business/account
- **Login:** `POST /auth/login` - Authenticate and get token
- **Verify:** `GET /auth/verify` - Validate JWT token
- **requireAuth middleware** - Protects API endpoints

### Database
- **MongoDB Support** - Full persistence via MONGODB_URI
- **Demo Mode** - Runs in-memory without MongoDB
- **Multi-tenancy** - All data isolated by tenantId/businessId

### CRM Integration
- **REZ CRM Hub** - Member sync on registration
- **Contact Management** - Unified member records
- **Industry Tagging** - Automatic industry classification (fitness)

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Service port | No (default: 5110) |
| MONGODB_URI | MongoDB connection string | No (demo mode if not set) |
| CRM_HUB_URL | REZ CRM Hub URL | No (default: http://localhost:4056) |
| SERVICE_NAME | Service identifier for logs | No |

---

## API Endpoints

### Health
```
GET /health - Health check
```

### Members
```
GET  /api/members            - List members
POST /api/members            - Create member
GET  /api/members/:id        - Get member
PUT  /api/members/:id        - Update member
DELETE /api/members/:id      - Delete member
```

### Trainers
```
GET  /api/trainers           - List trainers
POST /api/trainers           - Create trainer
GET  /api/trainers/:id       - Get trainer
PUT  /api/trainers/:id       - Update trainer
DELETE /api/trainers/:id     - Delete trainer
```

### Classes
```
GET  /api/classes            - List classes
POST /api/classes            - Create class
GET  /api/classes/:id        - Get class
PUT  /api/classes/:id        - Update class
DELETE /api/classes/:id      - Delete class
```

### Memberships
```
GET  /api/memberships        - List memberships
POST /api/memberships        - Create membership
GET  /api/memberships/:id   - Get membership
PUT  /api/memberships/:id   - Update membership
DELETE /api/memberships/:id - Delete membership
```

### Attendance
```
GET  /api/attendance         - List attendance
GET  /api/attendance?memberId=xxx - Filter by member
GET  /api/attendance?date=2026-06-15 - Filter by date
POST /api/attendance        - Check-in member
PATCH /api/attendance/:id/checkout - Check-out member
```

### Workouts
```
GET  /api/workouts           - List workouts
POST /api/workouts           - Create workout
GET  /api/workouts/:id       - Get workout
PUT  /api/workouts/:id       - Update workout
DELETE /api/workouts/:id     - Delete workout
```

### Analytics
```
GET /api/analytics - Get analytics dashboard
```

### Authentication
```
POST /auth/register - Register business
POST /auth/login    - Login
GET  /auth/verify   - Verify token
```

---

## Testing

```bash
# Health check
curl http://localhost:5110/health

# Register
curl -X POST http://localhost:5110/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessId":"biz_123","email":"owner@gym.com","password":"secret"}'

# Login
curl -X POST http://localhost:5110/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@gym.com","password":"secret"}'

# Create member
curl -X POST http://localhost:5110/api/members \
  -H "Content-Type: application/json" \
  -d '{"Name":"John Doe","email":"john@example.com","phone":"+1234567890","membershipType":"premium"}'

# List members
curl http://localhost:5110/api/members

# Create trainer
curl -X POST http://localhost:5110/api/trainers \
  -H "Content-Type: application/json" \
  -d '{"Name":"Sarah","specialties":["yoga","pilates"],"certifications":["RYT-500"]}'

# Create class
curl -X POST http://localhost:5110/api/classes \
  -H "Content-Type: application/json" \
  -d '{"Name":"Morning Yoga","trainerId":"trainer-uuid","schedule":{"day":"monday","time":"07:00"},"capacity":20,"duration":60}'

# Create membership
curl -X POST http://localhost:5110/api/memberships \
  -H "Content-Type: application/json" \
  -d '{"memberId":"member-uuid","type":"yearly","price":1200}'

# Check-in member
curl -X POST http://localhost:5110/api/attendance \
  -H "Content-Type: application/json" \
  -d '{"memberId":"member-uuid","classId":"class-uuid"}'

# Get analytics
curl http://localhost:5110/api/analytics
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Fitness OS (Port 5110)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Members   │  │   Trainers  │  │   Classes   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                    │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐            │
│  │ Memberships │  │  Schedule   │  │ Attendance  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                    │
│         └────────────────┬┴────────────────┘                    │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │  Analytics  │                              │
│                   └──────┬──────┘                              │
│                          │                                      │
│  ┌─────────────┐  ┌─────▼──────┐  ┌─────────────┐            │
│  │  Workouts   │  │  Auth/DB   │  │   CRM Hub  │            │
│  └─────────────┘  └────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Digital Twins

Fitness OS supports Digital Twin architecture:
- **Member Twin** - Health profile and progress
- **Trainer Twin** - Availability and skills
- **Class Twin** - Schedule and capacity
- **Membership Twin** - Plan status and billing
- **Attendance Twin** - Check-in patterns

---

## RTNM Ecosystem Integration

| Service | Port | Purpose |
|---------|------|---------|
| REZ CRM Hub | 4056 | Member sync |
| CorpID | 4702 | Business identity |
| GoalOS | 4242 | Fitness goals |
| MemoryOS | 4703 | Member history |

---

**Last Updated:** June 15, 2026
