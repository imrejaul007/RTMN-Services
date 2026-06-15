import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5020;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Stores
const patients = new Map();
const appointments = new Map();
const doctors = new Map();
const prescriptions = new Map();
const medicalRecords = new Map();

// Initialize
function initSampleData() {
  const sampleDoctors = [
    { id: 'd1', name: 'Dr. Smith', specialty: 'general', status: 'available' },
    { id: 'd2', name: 'Dr. Johnson', specialty: 'cardiology', status: 'available' },
    { id: 'd3', name: 'Dr. Williams', specialty: 'pediatrics', status: 'available' },
  ];
  sampleDoctors.forEach(d => doctors.set(d.id, { ...d, createdAt: new Date().toISOString() }));
  logger.info('Healthcare OS initialized');
}
initSampleData();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'healthcare-os', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Patients
app.get('/api/patients', (req, res) => {
  const { status } = req.query;
  let result = Array.from(patients.values());
  if (status) result = result.filter(p => p.status === status);
  res.json({ success: true, count: result.length, patients: result });
});

app.get('/api/patients/:id', (req, res) => {
  const patient = patients.get(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  res.json({ success: true, patient });
});

app.post('/api/patients', (req, res) => {
  const { name, dob, gender, bloodType, allergies, emergencyContact } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const patient = {
    id: uuidv4(),
    name,
    dob: dob || null,
    gender: gender || 'unknown',
    bloodType: bloodType || null,
    allergies: allergies || [],
    emergencyContact: emergencyContact || {},
    status: 'active',
    createdAt: new Date().toISOString()
  };
  patients.set(patient.id, patient);
  res.status(201).json({ success: true, patient });
});

app.put('/api/patients/:id', (req, res) => {
  const patient = patients.get(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  const updated = { ...patient, ...req.body, id: patient.id };
  patients.set(patient.id, updated);
  res.json({ success: true, patient: updated });
});

// Doctors
app.get('/api/doctors', (req, res) => {
  const { specialty, status } = req.query;
  let result = Array.from(doctors.values());
  if (specialty) result = result.filter(d => d.specialty === specialty);
  if (status) result = result.filter(d => d.status === status);
  res.json({ success: true, count: result.length, doctors: result });
});

app.get('/api/doctors/:id', (req, res) => {
  const doctor = doctors.get(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });
  res.json({ success: true, doctor });
});

app.post('/api/doctors', (req, res) => {
  const { name, specialty, licenseNumber, qualifications } = req.body;
  if (!name || !specialty) return res.status(400).json({ success: false, error: 'Name and specialty required' });
  const doctor = {
    id: uuidv4(),
    name,
    specialty,
    licenseNumber: licenseNumber || null,
    qualifications: qualifications || [],
    status: 'available',
    createdAt: new Date().toISOString()
  };
  doctors.set(doctor.id, doctor);
  res.status(201).json({ success: true, doctor });
});

// Appointments
app.get('/api/appointments', (req, res) => {
  const { patientId, doctorId, status, date } = req.query;
  let result = Array.from(appointments.values());
  if (patientId) result = result.filter(a => a.patientId === patientId);
  if (doctorId) result = result.filter(a => a.doctorId === doctorId);
  if (status) result = result.filter(a => a.status === status);
  if (date) result = result.filter(a => a.date.startsWith(date));
  res.json({ success: true, count: result.length, appointments: result });
});

app.post('/api/appointments', (req, res) => {
  const { patientId, doctorId, date, time, reason, duration } = req.body;
  if (!patientId || !doctorId || !date || !time) {
    return res.status(400).json({ success: false, error: 'patientId, doctorId, date, and time required' });
  }
  const appointment = {
    id: uuidv4(),
    patientId,
    doctorId,
    date,
    time,
    duration: duration || 30,
    reason: reason || '',
    status: 'scheduled',
    notes: '',
    createdAt: new Date().toISOString()
  };
  appointments.set(appointment.id, appointment);
  res.status(201).json({ success: true, appointment });
});

app.patch('/api/appointments/:id/status', (req, res) => {
  const appt = appointments.get(req.params.id);
  if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });
  appt.status = req.body.status || appt.status;
  appt.updatedAt = new Date().toISOString();
  appointments.set(appt.id, appt);
  res.json({ success: true, appointment: appt });
});

// Prescriptions
app.get('/api/prescriptions', (req, res) => {
  const { patientId } = req.query;
  let result = Array.from(prescriptions.values());
  if (patientId) result = result.filter(p => p.patientId === patientId);
  res.json({ success: true, count: result.length, prescriptions: result });
});

app.post('/api/prescriptions', (req, res) => {
  const { patientId, doctorId, medications, instructions } = req.body;
  if (!patientId || !doctorId || !medications) {
    return res.status(400).json({ success: false, error: 'patientId, doctorId, and medications required' });
  }
  const prescription = {
    id: uuidv4(),
    patientId,
    doctorId,
    medications,
    instructions: instructions || '',
    status: 'active',
    createdAt: new Date().toISOString()
  };
  prescriptions.set(prescription.id, prescription);
  res.status(201).json({ success: true, prescription });
});

// Medical Records
app.get('/api/records', (req, res) => {
  const { patientId } = req.query;
  let result = Array.from(medicalRecords.values());
  if (patientId) result = result.filter(r => r.patientId === patientId);
  res.json({ success: true, count: result.length, records: result });
});

app.post('/api/records', (req, res) => {
  const { patientId, doctorId, type, diagnosis, notes, attachments } = req.body;
  if (!patientId || !doctorId || !type) {
    return res.status(400).json({ success: false, error: 'patientId, doctorId, and type required' });
  }
  const record = {
    id: uuidv4(),
    patientId,
    doctorId,
    type,
    diagnosis: diagnosis || '',
    notes: notes || '',
    attachments: attachments || [],
    createdAt: new Date().toISOString()
  };
  medicalRecords.set(record.id, record);
  res.status(201).json({ success: true, record });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    success: true,
    analytics: {
      totalPatients: patients.size,
      totalDoctors: doctors.size,
      totalAppointments: appointments.size,
      scheduledAppointments: Array.from(appointments.values()).filter(a => a.status === 'scheduled').length,
      activePrescriptions: Array.from(prescriptions.values()).filter(p => p.status === 'active').length,
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  logger.info(`🏥 Healthcare OS running on port ${PORT}`);
});

export default app;
