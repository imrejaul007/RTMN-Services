/**
 * HOJAI Clinic AI - Healthcare AI Operating System
 * Port: 3000
 *
 * Simplified entry point for build
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// ============================================
// SCHEMAS
// ============================================

// Patient Schema
const PatientSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  bloodType: String,
  allergies: [String],
  medicalHistory: [String],
  emergencyContact: {
    name: String,
    phone: String,
    relation: String,
  },
  abhaId: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

PatientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

PatientSchema.methods.getAge = function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const Patient = mongoose.model('Patient', PatientSchema);

// Doctor Schema
const DoctorSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  specialization: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  licenseNumber: String,
  experience: Number,
  consultationFee: Number,
  availableDays: [String],
  workingHours: {
    start: String,
    end: String,
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Doctor = mongoose.model('Doctor', DoctorSchema);

// Appointment Schema
const AppointmentSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointmentDate: { type: Date, required: true },
  slotTime: { type: String, required: true },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  reason: String,
  notes: String,
  followUpRequired: Boolean,
  followUpDate: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Appointment = mongoose.model('Appointment', AppointmentSchema);

// Prescription Schema
const PrescriptionSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  diagnosis: { type: String, required: true },
  medications: [{
    medicine: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String,
  }],
  tests: [String],
  advice: String,
  followUpDate: Date,
  nextVisitNotes: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Prescription = mongoose.model('Prescription', PrescriptionSchema);

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-clinic-ai',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1;
    res.json({ status: mongoStatus ? 'ready' : 'not ready', mongo: mongoStatus });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

// ============================================
// PATIENT API
// ============================================

app.get('/api/patients', async (req, res) => {
  try {
    const { clinicId, search, limit = 50 } = req.query;
    const filter: any = { isActive: true };
    if (clinicId) filter.clinicId = clinicId;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const patients = await Patient.find(filter).limit(Number(limit));
    res.json({ success: true, count: patients.length, patients });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// DOCTOR API
// ============================================

app.get('/api/doctors', async (req, res) => {
  try {
    const { clinicId, specialization, limit = 50 } = req.query;
    const filter: any = { isActive: true };
    if (clinicId) filter.clinicId = clinicId;
    if (specialization) filter.specialization = specialization;
    const doctors = await Doctor.find(filter).limit(Number(limit));
    res.json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/api/doctors', async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.status(201).json({ success: true, doctor });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// APPOINTMENT API
// ============================================

app.get('/api/appointments', async (req, res) => {
  try {
    const { clinicId, patientId, doctorId, date, status, limit = 50 } = req.query;
    const filter: any = { isActive: true };
    if (clinicId) filter.clinicId = clinicId;
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (date) filter.appointmentDate = new Date(date as string);
    if (status) filter.status = status;
    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName phone')
      .populate('doctorId', 'firstName lastName specialization')
      .limit(Number(limit));
    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    res.status(201).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// PRESCRIPTION API
// ============================================

app.get('/api/prescriptions', async (req, res) => {
  try {
    const { clinicId, patientId, doctorId, limit = 50 } = req.query;
    const filter: any = { isActive: true };
    if (clinicId) filter.clinicId = clinicId;
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    const prescriptions = await Prescription.find(filter)
      .populate('patientId', 'firstName lastName')
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json({ success: true, count: prescriptions.length, prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/api/prescriptions', async (req, res) => {
  try {
    const prescription = new Prescription(req.body);
    await prescription.save();
    res.status(201).json({ success: true, prescription });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// AI AGENTS API
// ============================================

app.post('/api/ai/triage', async (req, res) => {
  try {
    const { symptoms, vitals } = req.body;

    let urgencyLevel = 'routine';
    let recommendedAction = 'Schedule regular appointment';

    const urgentSymptoms = ['high fever', 'severe pain', 'fracture', 'chest pain', 'difficulty breathing'];
    if (symptoms?.some((s: string) => urgentSymptoms.some(u => s.toLowerCase().includes(u)))) {
      urgencyLevel = 'urgent';
      recommendedAction = 'Visit clinic today or urgent care';
    } else if (symptoms?.some((s: string) => s.toLowerCase().includes('moderate'))) {
      urgencyLevel = 'semi-urgent';
      recommendedAction = 'Schedule within 24-48 hours';
    }

    res.json({
      success: true,
      triage: {
        urgencyLevel,
        recommendedAction,
        symptomsAnalyzed: symptoms?.length || 0,
        vitalsChecked: vitals ? true : false,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/api/ai/care-plan', async (req, res) => {
  try {
    const { patientId, condition } = req.body;
    res.json({
      success: true,
      carePlan: {
        patientId,
        condition,
        recommendations: [
          'Follow up in 2 weeks',
          'Monitor symptoms daily',
          'Take medications as prescribed',
        ],
        lifestyleAdvice: [
          'Maintain healthy diet',
          'Regular exercise',
          'Adequate rest',
        ],
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// DATABASE CONNECTION
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-clinic';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err));

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🏥 HOJAI Clinic AI (${PORT})                         ║
║   Healthcare AI Operating System                      ║
║                                                       ║
║   Endpoints:                                         ║
║   GET  /health                                       ║
║   GET  /api/patients                                 ║
║   POST /api/patients                                 ║
║   GET  /api/doctors                                  ║
║   POST /api/doctors                                  ║
║   GET  /api/appointments                             ║
║   POST /api/appointments                             ║
║   GET  /api/prescriptions                            ║
║   POST /api/prescriptions                            ║
║   POST /api/ai/triage                                ║
║   POST /api/ai/care-plan                             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;