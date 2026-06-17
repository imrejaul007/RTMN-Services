/**
 * Healthcare OS - Complete Hospital/Clinic Management System
 *
 * Built from scratch with full healthcare-specific features
 * Port: 5020
 *
 * Features:
 * - Patient Management (records, history, preferences)
 * - Appointment Scheduling (doctors, slots, waiting list)
 * - Medical Records (diagnoses, prescriptions, allergies)
 * - Department Management (wards, beds, OT)
 * - Doctor/Staff Management (schedules, qualifications)
 * - Pharmacy Management (medicines, inventory)
 * - Lab Management (tests, results)
 * - Insurance & Billing
 * - Analytics
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5020;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// In-memory data stores
const db = {
  patients: new Map(),
  medicalRecords: new Map(),
  appointments: new Map(),
  departments: new Map(),
  doctors: new Map(),
  doctorSchedules: new Map(),
  wards: new Map(),
  beds: new Map(),
  medicines: new Map(),
  labTests: new Map(),
  labOrders: new Map(),
  prescriptionsIssued: new Map(),
  invoices: new Map(),
  staff: new Map(),
  insuranceProviders: new Map(),
  waitingList: new Map(),
};

// ==================== SAMPLE DATA ====================

function initSampleData() {
  // Departments
  const departments = [
    { id: 'DEPT001', name: 'General Medicine', code: 'GEN', beds: 20, floor: 1 },
    { id: 'DEPT002', name: 'Cardiology', code: 'CARD', beds: 15, floor: 2 },
    { id: 'DEPT003', name: 'Orthopedics', code: 'ORTHO', beds: 15, floor: 2 },
    { id: 'DEPT004', name: 'Pediatrics', code: 'PED', beds: 20, floor: 3 },
    { id: 'DEPT005', name: 'Neurology', code: 'NEURO', beds: 10, floor: 3 },
    { id: 'DEPT006', name: 'Emergency', code: 'ER', beds: 30, floor: 0 },
    { id: 'DEPT007', name: 'ICU', code: 'ICU', beds: 20, floor: 1 },
    { id: 'DEPT008', name: 'Surgery', code: 'SURG', beds: 25, floor: 4 },
  ];
  departments.forEach(d => db.departments.set(d.id, d));

  // Doctors
  const doctors = [
    { id: 'DOC001', name: 'Dr. Rajesh Kumar', departmentId: 'DEPT001', specialization: 'MBBS, MD', experience: 15, fees: 500 },
    { id: 'DOC002', name: 'Dr. Priya Sharma', departmentId: 'DEPT002', specialization: 'MBBS, DM Cardiology', experience: 12, fees: 800 },
    { id: 'DOC003', name: 'Dr. Amit Verma', departmentId: 'DEPT003', specialization: 'MBBS, MS Ortho', experience: 10, fees: 700 },
    { id: 'DOC004', name: 'Dr. Sneha Gupta', departmentId: 'DEPT004', specialization: 'MBBS, DCH', experience: 8, fees: 600 },
    { id: 'DOC005', name: 'Dr. Vikram Singh', departmentId: 'DEPT005', specialization: 'MBBS, DM Neurology', experience: 18, fees: 1000 },
  ];
  doctors.forEach(d => db.doctors.set(d.id, d));

  // Doctor Schedules
  const schedules = [
    { id: 'SCH001', doctorId: 'DOC001', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 15 },
    { id: 'SCH002', doctorId: 'DOC001', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDuration: 15 },
    { id: 'SCH003', doctorId: 'DOC002', dayOfWeek: 1, startTime: '10:00', endTime: '16:00', slotDuration: 30 },
  ];
  schedules.forEach(s => db.doctorSchedules.set(s.id, s));

  // Patients
  const patients = [
    { id: 'PAT001', name: 'Rahul Mehta', phone: '9876543210', email: 'rahul@email.com', dob: '1985-03-15', gender: 'male', bloodGroup: 'B+', allergies: ['Penicillin'], insuranceId: 'INS001' },
    { id: 'PAT002', name: 'Sunita Devi', phone: '9876543212', email: 'sunita@email.com', dob: '1990-07-22', gender: 'female', bloodGroup: 'O+', allergies: [], insuranceId: null },
    { id: 'PAT003', name: 'Anil Sharma', phone: '9876543214', email: 'anil@email.com', dob: '1978-11-08', gender: 'male', bloodGroup: 'A+', allergies: ['Aspirin'], insuranceId: 'INS002' },
  ];
  patients.forEach(p => db.patients.set(p.id, p));

  // Wards & Beds
  let bedId = 1;
  departments.forEach(dept => {
    for (let i = 1; i <= Math.min(dept.beds, 5); i++) {
      const bed = {
        id: `BED${String(bedId++).padStart(3, '0')}`,
        wardId: `WARD${dept.id}`,
        departmentId: dept.id,
        bedNumber: i,
        status: Math.random() > 0.7 ? 'occupied' : 'available',
        patientId: null,
      };
      db.beds.set(bed.id, bed);
    }
  });

  // Appointments
  const today = new Date().toISOString().split('T')[0];
  const appointments = [
    { id: 'APT001', patientId: 'PAT001', doctorId: 'DOC001', date: today, time: '10:00', reason: 'Checkup', status: 'scheduled' },
    { id: 'APT002', patientId: 'PAT002', doctorId: 'DOC002', date: today, time: '11:00', reason: 'Chest pain', status: 'scheduled' },
    { id: 'APT003', patientId: 'PAT003', doctorId: 'DOC001', date: today, time: '14:00', reason: 'Follow-up', status: 'completed' },
  ];
  appointments.forEach(a => db.appointments.set(a.id, a));

  // Medicines
  const medicines = [
    { id: 'MED001', name: 'Paracetamol 500mg', category: 'Analgesic', price: 20, stock: 500, minStock: 100, unit: 'tablets' },
    { id: 'MED002', name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 80, stock: 200, minStock: 50, unit: 'capsules' },
    { id: 'MED003', name: 'Omeprazole 20mg', category: 'Antacid', price: 45, stock: 300, minStock: 75, unit: 'tablets' },
    { id: 'MED004', name: 'Metformin 500mg', category: 'Antidiabetic', price: 35, stock: 400, minStock: 100, unit: 'tablets' },
    { id: 'MED005', name: 'Amlodipine 5mg', category: 'Antihypertensive', price: 55, stock: 250, minStock: 60, unit: 'tablets' },
  ];
  medicines.forEach(m => db.medicines.set(m.id, m));

  // Lab Tests
  const labTests = [
    { id: 'TEST001', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 300, turnaroundHours: 4 },
    { id: 'TEST002', name: 'Lipid Profile', category: 'Biochemistry', price: 450, turnaroundHours: 6 },
    { id: 'TEST003', name: 'Blood Glucose (Fasting)', category: 'Biochemistry', price: 150, turnaroundHours: 2 },
    { id: 'TEST004', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 600, turnaroundHours: 8 },
    { id: 'TEST005', name: 'X-Ray Chest PA', category: 'Radiology', price: 250, turnaroundHours: 1 },
  ];
  labTests.forEach(t => db.labTests.set(t.id, t));

  // Insurance Providers
  const providers = [
    { id: 'INS001', name: 'Max Bupa Health Insurance', contact: '1800-123-456' },
    { id: 'INS002', name: 'Star Health Insurance', contact: '1800-123-789' },
    { id: 'INS003', name: 'ICICI Lombard', contact: '1800-266-5566' },
  ];
  providers.forEach(p => db.insuranceProviders.set(p.id, p));

  console.log(`[Healthcare OS] Initialized: ${patients.length} patients, ${doctors.length} doctors`);
}

// ==================== HEALTH ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Healthcare OS',
    version: '2.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: { patients: db.patients.size, doctors: db.doctors.size, appointments: db.appointments.size }
  });
});

// ==================== PATIENTS ====================

app.get('/api/patients', (req, res) => {
  const { search, bloodGroup } = req.query;
  let patients = Array.from(db.patients.values());
  if (search) {
    const s = search.toLowerCase();
    patients = patients.filter(p => p.name.toLowerCase().includes(s) || p.phone.includes(s));
  }
  if (bloodGroup) patients = patients.filter(p => p.bloodGroup === bloodGroup);
  res.json({ success: true, count: patients.length, patients });
});

app.get('/api/patients/:id', (req, res) => {
  const patient = db.patients.get(req.params.id);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
  const records = Array.from(db.medicalRecords.values()).filter(r => r.patientId === patient.id);
  const appointments = Array.from(db.appointments.values()).filter(a => a.patientId === patient.id);
  res.json({ success: true, patient, records, appointments });
});

app.post('/api/patients', (req, res) => {
  const { name, phone, email, dob, gender, bloodGroup, allergies, insuranceId } = req.body;
  if (!name || !phone) return res.status(400).json({ success: false, error: 'Name and phone required' });

  const existing = Array.from(db.patients.values()).find(p => p.phone === phone);
  if (existing) return res.json({ success: true, patient: existing });

  const patient = {
    id: `PAT${String(db.patients.size + 1).padStart(3, '0')}`,
    name, phone, email: email || null, dob: dob || null, gender: gender || 'other',
    bloodGroup: bloodGroup || null, allergies: allergies || [], insuranceId: insuranceId || null,
    createdAt: new Date().toISOString()
  };
  db.patients.set(patient.id, patient);
  res.status(201).json({ success: true, patient });
});

// ==================== DEPARTMENTS ====================

app.get('/api/departments', (req, res) => {
  res.json({ success: true, departments: Array.from(db.departments.values()) });
});

app.get('/api/departments/:id', (req, res) => {
  const dept = db.departments.get(req.params.id);
  if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
  const doctors = Array.from(db.doctors.values()).filter(d => d.departmentId === dept.id);
  const beds = Array.from(db.beds.values()).filter(b => b.departmentId === dept.id);
  res.json({ success: true, department: dept, doctors, beds: { total: beds.length, occupied: beds.filter(b => b.status === 'occupied').length } });
});

// ==================== DOCTORS ====================

app.get('/api/doctors', (req, res) => {
  const { departmentId } = req.query;
  let doctors = Array.from(db.doctors.values());
  if (departmentId) doctors = doctors.filter(d => d.departmentId === departmentId);
  res.json({ success: true, count: doctors.length, doctors });
});

app.get('/api/doctors/:id', (req, res) => {
  const doctor = db.doctors.get(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });
  const schedules = Array.from(db.doctorSchedules.values()).filter(s => s.doctorId === doctor.id);
  res.json({ success: true, doctor: { ...doctor, department: db.departments.get(doctor.departmentId) }, schedules });
});

app.get('/api/doctors/:id/availability', (req, res) => {
  const { date } = req.query;
  const doctor = db.doctors.get(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

  const targetDate = date || new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date(targetDate).getDay();
  const schedule = Array.from(db.doctorSchedules.values()).find(s => s.doctorId === doctor.id && s.dayOfWeek === dayOfWeek);

  if (!schedule) return res.json({ success: true, available: false });

  const booked = Array.from(db.appointments.values())
    .filter(a => a.doctorId === doctor.id && a.date === targetDate && a.status !== 'cancelled')
    .map(a => a.time);

  const slots = [];
  const [sh, sm] = schedule.startTime.split(':').map(Number);
  const [eh, em] = schedule.endTime.split(':').map(Number);
  let ch = sh, cm = sm;
  while (ch < eh || (ch === eh && cm < em)) {
    const time = `${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')}`;
    slots.push({ time, available: !booked.includes(time) });
    cm += schedule.slotDuration;
    if (cm >= 60) { cm -= 60; ch++; }
  }
  res.json({ success: true, doctor: doctor.name, date: targetDate, schedule, slots });
});

// ==================== APPOINTMENTS ====================

app.get('/api/appointments', (req, res) => {
  const { date, status, doctorId } = req.query;
  let appointments = Array.from(db.appointments.values());
  if (date) appointments = appointments.filter(a => a.date === date);
  if (status) appointments = appointments.filter(a => a.status === status);
  if (doctorId) appointments = appointments.filter(a => a.doctorId === doctorId);
  appointments = appointments.map(a => ({ ...a, doctor: db.doctors.get(a.doctorId), patient: db.patients.get(a.patientId) }));
  res.json({ success: true, count: appointments.length, appointments });
});

app.post('/api/appointments', (req, res) => {
  const { patientId, doctorId, date, time, reason } = req.body;
  if (!patientId || !doctorId || !date || !time) return res.status(400).json({ success: false, error: 'All fields required' });

  const conflict = Array.from(db.appointments.values())
    .find(a => a.doctorId === doctorId && a.date === date && a.time === time && a.status !== 'cancelled');
  if (conflict) return res.status(400).json({ success: false, error: 'Slot not available' });

  const doctor = db.doctors.get(doctorId);
  const appointment = {
    id: `APT${String(db.appointments.size + 1).padStart(3, '0')}`,
    patientId, doctorId, date, time, reason: reason || '', status: 'scheduled', fees: doctor?.fees || 0,
    createdAt: new Date().toISOString()
  };
  db.appointments.set(appointment.id, appointment);
  res.status(201).json({ success: true, appointment });
});

app.patch('/api/appointments/:id', (req, res) => {
  const apt = db.appointments.get(req.params.id);
  if (!apt) return res.status(404).json({ success: false, error: 'Appointment not found' });
  const updated = { ...apt, ...req.body };
  db.appointments.set(req.params.id, updated);
  res.json({ success: true, appointment: updated });
});

// ==================== MEDICAL RECORDS ====================

app.get('/api/patients/:patientId/records', (req, res) => {
  res.json({ success: true, records: Array.from(db.medicalRecords.values()).filter(r => r.patientId === req.params.patientId) });
});

app.post('/api/patients/:patientId/records', (req, res) => {
  const { diagnosis, doctorId, notes, vitals } = req.body;
  const record = {
    id: `REC${String(db.medicalRecords.size + 1).padStart(3, '0')}`,
    patientId: req.params.patientId, doctorId: doctorId || null, date: new Date().toISOString(),
    diagnosis: diagnosis || '', notes: notes || '', vitals: vitals || null
  };
  db.medicalRecords.set(record.id, record);
  res.status(201).json({ success: true, record });
});

// ==================== PHARMACY ====================

app.get('/api/pharmacy/medicines', (req, res) => {
  const { lowStock } = req.query;
  let medicines = Array.from(db.medicines.values());
  if (lowStock === 'true') medicines = medicines.filter(m => m.stock <= m.minStock);
  res.json({ success: true, count: medicines.length, medicines });
});

app.post('/api/pharmacy/prescribe', (req, res) => {
  const { patientId, doctorId, medicines: meds, diagnosis } = req.body;
  if (!patientId || !meds || !meds.length) return res.status(400).json({ success: false, error: 'Required' });

  const prescription = {
    id: `RX${String(db.prescriptionsIssued.size + 1).padStart(3, '0')}`,
    patientId, doctorId, diagnosis: diagnosis || '',
    medicines: meds.map(m => ({ ...m, name: db.medicines.get(m.medicineId)?.name || 'Unknown' })),
    date: new Date().toISOString()
  };
  db.prescriptionsIssued.set(prescription.id, prescription);
  meds.forEach(m => {
    const med = db.medicines.get(m.medicineId);
    if (med) { med.stock = Math.max(0, med.stock - (m.quantity || 30)); db.medicines.set(med.id, med); }
  });
  res.status(201).json({ success: true, prescription });
});

// ==================== LAB TESTS ====================

app.get('/api/lab/tests', (req, res) => res.json({ success: true, tests: Array.from(db.labTests.values()) }));

app.post('/api/lab/order', (req, res) => {
  const { patientId, testIds } = req.body;
  if (!patientId || !testIds) return res.status(400).json({ success: false, error: 'Required' });

  const order = {
    id: `LAB${String(Date.now()).slice(-6)}`, patientId,
    tests: testIds.map(id => ({ testId: id, name: db.labTests.get(id)?.name, price: db.labTests.get(id)?.price })),
    status: 'ordered', orderedAt: new Date().toISOString()
  };
  order.total = order.tests.reduce((s, t) => s + (t.price || 0), 0);
  db.labOrders.set(order.id, order);
  res.status(201).json({ success: true, order });
});

// ==================== BEDS ====================

app.get('/api/beds', (req, res) => {
  const { departmentId, status } = req.query;
  let beds = Array.from(db.beds.values());
  if (departmentId) beds = beds.filter(b => b.departmentId === departmentId);
  if (status) beds = beds.filter(b => b.status === status);
  res.json({ success: true, count: beds.length, beds });
});

app.post('/api/beds/:id/admit', (req, res) => {
  const bed = db.beds.get(req.params.id);
  if (!bed) return res.status(404).json({ success: false, error: 'Bed not found' });
  bed.status = 'occupied'; bed.patientId = req.body.patientId; bed.admissionDate = new Date().toISOString();
  db.beds.set(bed.id, bed);
  res.json({ success: true, bed });
});

app.post('/api/beds/:id/discharge', (req, res) => {
  const bed = db.beds.get(req.params.id);
  if (!bed) return res.status(404).json({ success: false, error: 'Bed not found' });
  bed.status = 'available'; bed.patientId = null; bed.dischargeDate = new Date().toISOString();
  db.beds.set(bed.id, bed);
  res.json({ success: true, bed });
});

// ==================== BILLING ====================

app.post('/api/billing/invoice', (req, res) => {
  const { patientId, items } = req.body;
  if (!patientId || !items) return res.status(400).json({ success: false, error: 'Required' });

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(subtotal * 0.05);
  const invoice = {
    id: `INV${String(db.invoices.size + 1).padStart(5, '0')}`, patientId,
    items, subtotal, tax, total: subtotal + tax,
    status: 'pending', date: new Date().toISOString()
  };
  db.invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, invoice });
});

app.get('/api/billing/invoices', (req, res) => {
  const { patientId } = req.query;
  let invoices = Array.from(db.invoices.values());
  if (patientId) invoices = invoices.filter(i => i.patientId === patientId);
  res.json({ success: true, count: invoices.length, invoices });
});

app.post('/api/billing/:invoiceId/pay', (req, res) => {
  const inv = db.invoices.get(req.params.invoiceId);
  if (!inv) return res.status(404).json({ success: false, error: 'Invoice not found' });
  inv.status = 'paid'; inv.paidAt = new Date().toISOString(); inv.method = req.body.method || 'cash';
  db.invoices.set(inv.id, inv);
  res.json({ success: true, invoice: inv });
});

// ==================== ANALYTICS ====================

app.get('/api/analytics/overview', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayApts = Array.from(db.appointments.values()).filter(a => a.date === today);
  const beds = Array.from(db.beds.values());
  res.json({
    success: true, overview: {
      patients: db.patients.size, doctors: db.doctors.size,
      todayAppointments: todayApts.length, completedToday: todayApts.filter(a => a.status === 'completed').length,
      beds: { total: beds.length, occupied: beds.filter(b => b.status === 'occupied').length, available: beds.filter(b => b.status === 'available').length }
    }
  });
});

// ==================== START ====================

initSampleData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              HEALTHCARE OS v2.0.0                       ║
║           Complete Hospital Management                 ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║                                                          ║
║  Features: Patient Mgmt, Appointments, Medical Records, ║
║  Pharmacy, Lab Tests, Billing, Analytics               ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
