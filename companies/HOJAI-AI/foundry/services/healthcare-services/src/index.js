/**
 * Healthcare Services
 * Port: 4730
 * Doctor, Pharmacy, Insurance, Health Records, Telemedicine
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
app.use(cors(), express.json());
const PORT = process.env.PORT || 4730;

const doctors = new Map();
const appointments = new Map();
const prescriptions = new Map();
const patients = new Map();

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'healthcare-services' }));

// Doctors
app.get('/api/doctors', (req, res) => {
  const { specialty, city, available } = req.query;
  let results = Array.from(doctors.values());
  if (specialty) results = results.filter(d => d.specialty === specialty);
  if (available) results = results.filter(d => d.nextAvailable);
  res.json({ success: true, count: results.length, doctors: results });
});

app.get('/api/doctors/:id', (req, res) => {
  const doctor = doctors.get(req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  res.json({ success: true, doctor });
});

app.post('/api/doctors', requireInternal, (req, res) => {
  const doctor = { id: uuidv4(), ...req.body, rating: 0, reviews: 0, createdAt: new Date().toISOString() };
  doctors.set(doctor.id, doctor);
  res.status(201).json({ success: true, doctor });
});

// Appointments
app.post('/api/appointments', requireInternal, (req, res) => {
  const { doctorId, patientId, date, time, type } = req.body;
  const appointment = {
    id: uuidv4(), doctorId, patientId, date, time, type,
    status: 'confirmed', fee: 500, createdAt: new Date().toISOString()
  };
  appointments.set(appointment.id, appointment);
  res.status(201).json({ success: true, appointment });
});

app.get('/api/appointments', (req, res) => {
  const { patientId, doctorId, date } = req.query;
  let results = Array.from(appointments.values());
  if (patientId) results = results.filter(a => a.patientId === patientId);
  if (doctorId) results = results.filter(a => a.doctorId === doctorId);
  res.json({ success: true, count: results.length, appointments: results });
});

// Prescriptions
app.post('/api/prescriptions', requireInternal, (req, res) => {
  const prescription = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  prescriptions.set(prescription.id, prescription);
  res.status(201).json({ success: true, prescription });
});

app.get('/api/prescriptions/:id', (req, res) => {
  const prescription = prescriptions.get(req.params.id);
  if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
  res.json({ success: true, prescription });
});

// Patients / Health Records
app.post('/api/patients', requireInternal, (req, res) => {
  const patient = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  patients.set(patient.id, patient);
  res.status(201).json({ success: true, patient });
});

app.get('/api/patients/:id/records', (req, res) => {
  const patient = patients.get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ success: true, records: [] });
});

// Telemedicine
app.post('/api/telemedicine/connect', requireInternal, (req, res) => {
  const { appointmentId } = req.body;
  res.json({ success: true, sessionUrl: `https://meet.hojai.health/${uuidv4()}`, expiresIn: '30 mins' });
});

// Lab Tests
app.get('/api/labs', (req, res) => {
  res.json({ success: true, labs: [
    { id: 'l1', name: 'Thyrocare', tests: 100, price: 500 },
    { id: 'l2', name: 'Dr Lal Pathlabs', tests: 150, price: 600 }
  ]});
});

app.post('/api/labs/book', requireInternal, (req, res) => {
  const { labId, tests, patientId, date } = req.body;
  res.status(201).json({ success: true, booking: { id: uuidv4(), labId, tests, patientId, date, status: 'confirmed' } });
});

app.listen(PORT, () => console.log(`\n🏥 Healthcare Services — PORT ${PORT}\n`));
export default app;
