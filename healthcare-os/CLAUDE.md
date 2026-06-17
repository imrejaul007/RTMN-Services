# Healthcare OS

**Industry:** Healthcare  
**Port:** 5020  
**Status:** ✅ RUNNING  
**Digital Twins:** Patient, Doctor, Appointment, Prescription

## Overview

Healthcare OS is a comprehensive healthcare management system that handles:
- Patient management
- Doctor scheduling
- Appointments
- Prescriptions
- Medical records

## Quick Start

```bash
cd healthcare-os
npm install
npm start
```

## API Endpoints

### Patients
- `GET /api/patients` - List patients
- `POST /api/patients` - Register patient
- `GET /api/patients/:id` - Get patient
- `PUT /api/patients/:id` - Update patient

### Doctors
- `GET /api/doctors` - List doctors
- `POST /api/doctors` - Add doctor
- `GET /api/doctors/:id` - Get doctor

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Book appointment
- `GET /api/appointments/:id` - Get appointment
- `PATCH /api/appointments/:id/status` - Update status

### Prescriptions
- `GET /api/prescriptions` - List prescriptions
- `POST /api/prescriptions` - Create prescription

### Records
- `GET /api/records` - List records
- `POST /api/records` - Create record

### Analytics
- `GET /api/analytics` - Dashboard analytics

### Health
- `GET /health` - Health check

## Digital Twins

| Twin | Purpose |
|------|---------|
| Patient Twin | Patient profiles, history |
| Doctor Twin | Doctor profiles, schedules |
| Appointment Twin | Appointments, availability |
| Prescription Twin | Prescriptions, medications |