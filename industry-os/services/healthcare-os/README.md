# Healthcare OS

Industry-specific digital twin for healthcare management within RTMN.

## Port

**5020** - Healthcare OS

## API Endpoints

### Patients
- `GET /api/patients` - List patients
- `GET /api/patients/:id` - Get patient
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient

### Doctors
- `GET /api/doctors` - List doctors
- `GET /api/doctors/:id` - Get doctor
- `POST /api/doctors` - Add doctor

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PATCH /api/appointments/:id/status` - Update status

### Prescriptions & Records
- `GET/POST /api/prescriptions` - Prescription management
- `GET/POST /api/records` - Medical records

### Analytics
- `GET /api/analytics` - Dashboard stats
