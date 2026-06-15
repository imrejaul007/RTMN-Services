import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5035;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Stores
const clients = new Map();
const cases = new Map();
const documents = new Map();
const lawyers = new Map();
const appointments = new Map();
const invoices = new Map();

function initSampleData() {
  const sampleLawyers = [
    { id: 'l1', name: 'Atty. Sarah Davis', specialty: 'corporate', barNumber: 'BAR-001', status: 'available' },
    { id: 'l2', name: 'Atty. Michael Chen', specialty: 'litigation', barNumber: 'BAR-002', status: 'available' },
  ];
  sampleLawyers.forEach(l => lawyers.set(l.id, { ...l, createdAt: new Date().toISOString() }));
  logger.info('Legal OS initialized');
}
initSampleData();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'legal-os', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Clients
app.get('/api/clients', (req, res) => {
  const { status } = req.query;
  let result = Array.from(clients.values());
  if (status) result = result.filter(c => c.status === status);
  res.json({ success: true, count: result.length, clients: result });
});

app.post('/api/clients', (req, res) => {
  const { name, email, phone, address, type } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const client = {
    id: uuidv4(),
    name,
    email: email || null,
    phone: phone || null,
    address: address || {},
    type: type || 'individual',
    status: 'active',
    createdAt: new Date().toISOString()
  };
  clients.set(client.id, client);
  res.status(201).json({ success: true, client });
});

// Cases
app.get('/api/cases', (req, res) => {
  const { status, type, clientId } = req.query;
  let result = Array.from(cases.values());
  if (status) result = result.filter(c => c.status === status);
  if (type) result = result.filter(c => c.type === type);
  if (clientId) result = result.filter(c => c.clientId === clientId);
  res.json({ success: true, count: result.length, cases: result });
});

app.post('/api/cases', (req, res) => {
  const { clientId, type, title, description, assignedLawyerId, priority } = req.body;
  if (!clientId || !type || !title) {
    return res.status(400).json({ success: false, error: 'clientId, type, and title required' });
  }
  const legalCase = {
    id: uuidv4(),
    caseNumber: `CASE-${Date.now().toString(36).toUpperCase()}`,
    clientId,
    type,
    title,
    description: description || '',
    assignedLawyerId: assignedLawyerId || null,
    priority: priority || 'normal',
    status: 'open',
    documents: [],
    createdAt: new Date().toISOString()
  };
  cases.set(legalCase.id, legalCase);
  res.status(201).json({ success: true, case: legalCase });
});

app.patch('/api/cases/:id/status', (req, res) => {
  const legalCase = cases.get(req.params.id);
  if (!legalCase) return res.status(404).json({ success: false, error: 'Case not found' });
  if (req.body.status) legalCase.status = req.body.status;
  if (req.body.assignedLawyerId) legalCase.assignedLawyerId = req.body.assignedLawyerId;
  legalCase.updatedAt = new Date().toISOString();
  cases.set(legalCase.id, legalCase);
  res.json({ success: true, case: legalCase });
});

// Lawyers
app.get('/api/lawyers', (req, res) => {
  const { specialty, status } = req.query;
  let result = Array.from(lawyers.values());
  if (specialty) result = result.filter(l => l.specialty === specialty);
  if (status) result = result.filter(l => l.status === status);
  res.json({ success: true, count: result.length, lawyers: result });
});

app.post('/api/lawyers', (req, res) => {
  const { name, specialty, barNumber, email } = req.body;
  if (!name || !specialty) {
    return res.status(400).json({ success: false, error: 'Name and specialty required' });
  }
  const lawyer = {
    id: uuidv4(),
    name,
    specialty,
    barNumber: barNumber || null,
    email: email || null,
    status: 'available',
    casesHandled: 0,
    createdAt: new Date().toISOString()
  };
  lawyers.set(lawyer.id, lawyer);
  res.status(201).json({ success: true, lawyer });
});

// Documents
app.get('/api/documents', (req, res) => {
  const { caseId, type } = req.query;
  let result = Array.from(documents.values());
  if (caseId) result = result.filter(d => d.caseId === caseId);
  if (type) result = result.filter(d => d.type === type);
  res.json({ success: true, count: result.length, documents: result });
});

app.post('/api/documents', (req, res) => {
  const { caseId, title, type, content, uploadedBy } = req.body;
  if (!caseId || !title || !type) {
    return res.status(400).json({ success: false, error: 'caseId, title, and type required' });
  }
  const doc = {
    id: uuidv4(),
    caseId,
    title,
    type,
    content: content || '',
    uploadedBy: uploadedBy || null,
    status: 'draft',
    version: 1,
    createdAt: new Date().toISOString()
  };
  documents.set(doc.id, doc);
  res.status(201).json({ success: true, document: doc });
});

app.patch('/api/documents/:id', (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
  if (req.body.content) doc.content = req.body.content;
  if (req.body.status) doc.status = req.body.status;
  doc.version++;
  doc.updatedAt = new Date().toISOString();
  documents.set(doc.id, doc);
  res.json({ success: true, document: doc });
});

// Appointments
app.get('/api/appointments', (req, res) => {
  const { caseId, lawyerId } = req.query;
  let result = Array.from(appointments.values());
  if (caseId) result = result.filter(a => a.caseId === caseId);
  if (lawyerId) result = result.filter(a => a.lawyerId === lawyerId);
  res.json({ success: true, count: result.length, appointments: result });
});

app.post('/api/appointments', (req, res) => {
  const { caseId, lawyerId, clientId, date, time, type, notes } = req.body;
  if (!caseId || !lawyerId || !date) {
    return res.status(400).json({ success: false, error: 'caseId, lawyerId, and date required' });
  }
  const appt = {
    id: uuidv4(),
    caseId,
    lawyerId,
    clientId: clientId || null,
    date,
    time: time || '09:00',
    type: type || 'consultation',
    notes: notes || '',
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };
  appointments.set(appt.id, appt);
  res.status(201).json({ success: true, appointment: appt });
});

// Invoices
app.get('/api/invoices', (req, res) => {
  const { caseId, status } = req.query;
  let result = Array.from(invoices.values());
  if (caseId) result = result.filter(i => i.caseId === caseId);
  if (status) result = result.filter(i => i.status === status);
  res.json({ success: true, count: result.length, invoices: result });
});

app.post('/api/invoices', (req, res) => {
  const { caseId, clientId, items, paymentMethod } = req.body;
  if (!caseId || !items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'caseId and items required' });
  }
  const subtotal = items.reduce((sum, i) => sum + (i.rate * i.hours), 0);
  const tax = subtotal * 0.1;
  const invoice = {
    id: uuidv4(),
    invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
    caseId,
    clientId: clientId || null,
    items,
    subtotal,
    tax,
    total: subtotal + tax,
    status: 'pending',
    paymentMethod: paymentMethod || 'bank_transfer',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };
  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, invoice });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    success: true,
    analytics: {
      totalClients: clients.size,
      totalCases: cases.size,
      openCases: Array.from(cases.values()).filter(c => c.status === 'open').length,
      totalLawyers: lawyers.size,
      totalDocuments: documents.size,
      totalAppointments: appointments.size,
      totalInvoices: invoices.size,
      pendingInvoices: Array.from(invoices.values()).filter(i => i.status === 'pending').length
    }
  });
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  logger.info(`⚖️ Legal OS running on port ${PORT}`);
});

export default app;
