# Fitness OS

**Industry:** Fitness  
**Port:** 5110  
**Status:** ✅ RUNNING  
**Digital Twins:** Member, Trainer, Class, Membership

## Overview

Fitness OS is a comprehensive fitness club management system that handles:
- Member management
- Trainer management
- Class scheduling
- Membership plans
- Attendance tracking

## Quick Start

```bash
cd fitness-os
npm install
npm start
```

## API Endpoints

### Members
- `GET /api/members` - List members
- `POST /api/members` - Add member
- `GET /api/members/:id` - Get member
- `PUT /api/members/:id` - Update member

### Trainers
- `GET /api/trainers` - List trainers
- `POST /api/trainers` - Add trainer
- `GET /api/trainers/:id` - Get trainer

### Classes
- `GET /api/classes` - List classes
- `POST /api/classes` - Create class
- `GET /api/classes/:id` - Get class

### Memberships
- `GET /api/memberships` - List memberships
- `POST /api/memberships` - Create membership

### Attendance
- `GET /api/attendance` - List attendance
- `POST /api/attendance` - Check in

### Analytics
- `GET /api/analytics` - Dashboard analytics

### Health
- `GET /health` - Health check

## Membership Types

| Type | Duration | Features |
|------|----------|----------|
| Basic | Monthly | Gym access |
| Premium | Monthly | Gym + Classes |
| Elite | Yearly | All access |
| Personal | Custom | Personal training |

## Digital Twins

| Twin | Purpose |
|------|---------|
| Member Twin | Member profiles |
| Trainer Twin | Trainer profiles |
| Class Twin | Class schedules |
| Membership Twin | Membership tracking |