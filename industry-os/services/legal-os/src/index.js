/**
 * Legal OS - AI Company Platform
 *
 * Complete Legal Practice Management System
 * Port: 5035
 * Industry: Legal Services
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5035;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================

const INDUSTRY = 'legal';

// ============================================
// IN-MEMORY DATABASE
// ============================================

const clients = new Map();
const matters = new Map();
const lawyers = new Map();
const documents = new Map();
const appointments = new Map();
const invoices = new Map();
const payments = new Map();
const tasks = new Map();
const courts = new Map();
const contracts = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();
const authBusinesses = new Map();

// ============================================
// SAMPLE DATA - LAW FIRMS & CLIENTS
// ============================================

// Initialize sample lawyers
const sampleLawyers = [
  {
    id: 'LAW001',
    name: 'Adv. Priya Sharma',
    email: 'priya.sharma@lexpoint.in',
    phone: '+91 98765 43210',
    specialization: 'Corporate Law',
    barLicense: 'DL/2015/12345',
    experience: 12,
    hourlyRate: 5000,
    status: 'available',
    avatar: '👩‍⚖️',
    skills: ['M&A', 'Contracts', 'Compliance', 'Due Diligence'],
    casesHandled: 156
  },
  {
    id: 'LAW002',
    name: 'Adv. Rajesh Kumar',
    email: 'rajesh.kumar@lexpoint.in',
    phone: '+91 98765 43211',
    specialization: 'Litigation',
    barLicense: 'MH/2012/98765',
    experience: 18,
    hourlyRate: 7500,
    status: 'available',
    avatar: '👨‍⚖️',
    skills: ['Civil Litigation', 'Criminal Defense', 'Appeals', 'Arbitration'],
    casesHandled: 234
  },
  {
    id: 'LAW003',
    name: 'Adv. Anita Desai',
    email: 'anita.desai@lexpoint.in',
    phone: '+91 98765 43212',
    specialization: 'Family Law',
    barLicense: 'KA/2018/45678',
    experience: 8,
    hourlyRate: 3500,
    status: 'available',
    avatar: '👩‍⚖️',
    skills: ['Divorce', 'Custody', 'Property Settlement', 'Will Drafting'],
    casesHandled: 89
  }
];
sampleLawyers.forEach(lawyer => lawyers.set(lawyer.id, lawyer));

// Initialize sample clients
const sampleClients = [
  {
    id: 'CLT001',
    name: 'TechCorp Solutions Pvt Ltd',
    email: 'legal@techcorp.in',
    phone: '+91 11 4567 8900',
    type: 'corporate',
    gstin: '07AAACT1234A1ZB',
    address: 'B-45, Sector 62, Noida, UP 201301',
    contactPerson: 'Vikram Singh',
    status: 'active',
    totalMatters: 5,
    outstandingBalance: 250000,
    avatar: '🏢',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'CLT002',
    name: 'GreenLeaf Organics Ltd',
    email: 'compliance@greenleaf.in',
    phone: '+91 80 4567 8901',
    type: 'corporate',
    gstin: '29AAACG1234A1ZY',
    address: '45, MG Road, Bangalore 560001',
    contactPerson: 'Meera Nair',
    status: 'active',
    totalMatters: 3,
    outstandingBalance: 85000,
    avatar: '🌿',
    createdAt: '2024-03-20T09:30:00Z'
  },
  {
    id: 'CLT003',
    name: 'Rajesh Agarwal',
    email: 'rajesh.a@email.com',
    phone: '+91 98300 12345',
    type: 'individual',
    address: '12A, Park Street, Kolkata 700016',
    status: 'active',
    totalMatters: 2,
    outstandingBalance: 45000,
    avatar: '👤',
    createdAt: '2024-06-01T14:00:00Z'
  },
  {
    id: 'CLT004',
    name: 'Metro Builders Consortium',
    email: 'legal@metrobuilders.co',
    phone: '+91 22 2345 6789',
    type: 'corporate',
    gstin: '27AABCM1234A1ZX',
    address: '501, Maker Chambers, Nariman Point, Mumbai 400021',
    contactPerson: 'Sanjay Patil',
    status: 'active',
    totalMatters: 8,
    outstandingBalance: 420000,
    avatar: '🏗️',
    createdAt: '2023-09-10T11:00:00Z'
  }
];
sampleClients.forEach(client => clients.set(client.id, client));

// Initialize sample matters
const sampleMatters = [
  {
    id: 'MAT001',
    caseNumber: 'LC-2024-001',
    title: 'TechCorp M&A Acquisition',
    clientId: 'CLT001',
    type: 'corporate',
    status: 'active',
    priority: 'high',
    assignedLawyer: 'LAW001',
    description: 'Due diligence and documentation for acquisition of DataSoft Inc.',
    estimatedValue: 50000000,
    filedDate: '2024-01-20',
    court: null,
    opposingCounsel: 'Singh & Associates',
    documents: [],
    activities: [
      { date: '2024-01-20', action: 'Matter opened', lawyer: 'LAW001' },
      { date: '2024-02-05', action: 'Due diligence initiated', lawyer: 'LAW001' },
      { date: '2024-03-10', action: 'Share purchase agreement drafted', lawyer: 'LAW001' }
    ],
    billing: { hours: 45, amount: 225000 },
    nextHearing: null,
    createdAt: '2024-01-20T10:00:00Z'
  },
  {
    id: 'MAT002',
    caseNumber: 'LC-2024-002',
    title: 'GreenLeaf FDI Compliance Review',
    clientId: 'CLT002',
    type: 'compliance',
    status: 'active',
    priority: 'medium',
    assignedLawyer: 'LAW001',
    description: 'FEMA compliance review for foreign investment restructuring.',
    estimatedValue: 1000000,
    filedDate: '2024-02-15',
    court: null,
    opposingCounsel: null,
    documents: [],
    activities: [
      { date: '2024-02-15', action: 'Matter opened', lawyer: 'LAW001' },
      { date: '2024-02-28', action: 'Compliance audit completed', lawyer: 'LAW001' }
    ],
    billing: { hours: 20, amount: 100000 },
    nextHearing: null,
    createdAt: '2024-02-15T09:00:00Z'
  },
  {
    id: 'MAT003',
    caseNumber: 'LIT-2023-089',
    title: 'Agarwal vs. State Bank - Loan Dispute',
    clientId: 'CLT003',
    type: 'civil',
    status: 'active',
    priority: 'high',
    assignedLawyer: 'LAW002',
    description: 'Dispute regarding loan recovery and interest calculation.',
    estimatedValue: 2500000,
    filedDate: '2023-06-15',
    court: 'Delhi High Court',
    opposingCounsel: 'Khaitan & Co',
    documents: [],
    activities: [
      { date: '2023-06-15', action: 'Case filed', lawyer: 'LAW002' },
      { date: '2023-08-20', action: 'First hearing - matter admitted', lawyer: 'LAW002' },
      { date: '2024-01-10', action: 'Evidence submission completed', lawyer: 'LAW002' },
      { date: '2024-04-15', action: 'Next hearing scheduled', lawyer: 'LAW002' }
    ],
    billing: { hours: 120, amount: 900000 },
    nextHearing: '2024-05-20',
    createdAt: '2023-06-15T14:00:00Z'
  },
  {
    id: 'MAT004',
    caseNumber: 'FAM-2024-015',
    title: 'Agarwal Divorce Settlement',
    clientId: 'CLT003',
    type: 'family',
    status: 'active',
    priority: 'medium',
    assignedLawyer: 'LAW003',
    description: 'Mutual consent divorce proceedings and property settlement.',
    estimatedValue: 10000000,
    filedDate: '2024-03-01',
    court: 'Family Court, Delhi',
    opposingCounsel: "Women's Rights Foundation",
    documents: [],
    activities: [
      { date: '2024-03-01', action: 'Case filed under HMA Section 13B', lawyer: 'LAW003' },
      { date: '2024-03-15', action: 'First motion hearing', lawyer: 'LAW003' }
    ],
    billing: { hours: 15, amount: 52500 },
    nextHearing: '2024-05-25',
    createdAt: '2024-03-01T11:00:00Z'
  },
  {
    id: 'MAT005',
    caseNumber: 'LIT-2022-156',
    title: 'Metro Builders Contract Breach',
    clientId: 'CLT004',
    type: 'civil',
    status: 'active',
    priority: 'high',
    assignedLawyer: 'LAW002',
    description: 'Contractor breach of construction agreement - recovery of damages.',
    estimatedValue: 150000000,
    filedDate: '2022-09-20',
    court: 'Bombay High Court',
    opposingCounsel: 'Crawford Bayley',
    documents: [],
    activities: [
      { date: '2022-09-20', action: 'Plaint filed', lawyer: 'LAW002' },
      { date: '2022-11-30', action: 'Written statement filed by defendant', lawyer: 'LAW002' },
      { date: '2023-05-15', action: 'Documentary evidence exchanged', lawyer: 'LAW002' },
      { date: '2024-02-20', action: 'Expert witness appointed', lawyer: 'LAW002' },
      { date: '2024-04-18', action: 'Next hearing scheduled', lawyer: 'LAW002' }
    ],
    billing: { hours: 280, amount: 2100000 },
    nextHearing: '2024-06-15',
    createdAt: '2022-09-20T10:00:00Z'
  }
];
sampleMatters.forEach(matter => matters.set(matter.id, matter));

// Initialize sample invoices
const sampleInvoices = [
  {
    id: 'INV001',
    invoiceNumber: 'LP/2024/0045',
    clientId: 'CLT001',
    matterId: 'MAT001',
    amount: 75000,
    tax: 13500,
    total: 88500,
    status: 'pending',
    dueDate: '2024-04-30',
    items: [
      { description: 'Legal consultation - M&A structuring', hours: 5, rate: 5000 },
      { description: 'Due diligence review', hours: 10, rate: 5000 }
    ],
    createdAt: '2024-03-25T10:00:00Z'
  },
  {
    id: 'INV002',
    invoiceNumber: 'LP/2024/0044',
    clientId: 'CLT004',
    matterId: 'MAT005',
    amount: 150000,
    tax: 27000,
    total: 177000,
    status: 'pending',
    dueDate: '2024-05-15',
    items: [
      { description: 'Court appearance - Bombay High Court', hours: 8, rate: 7500 },
      { description: 'Drafting rejoinder', hours: 12, rate: 5000 }
    ],
    createdAt: '2024-04-01T14:00:00Z'
  }
];
sampleInvoices.forEach(invoice => invoices.set(invoice.id, invoice));

// Initialize sample documents
const sampleDocuments = [
  {
    id: 'DOC001',
    name: 'Share Purchase Agreement - DataSoft',
    type: 'agreement',
    matterId: 'MAT001',
    clientId: 'CLT001',
    uploadedBy: 'LAW001',
    size: '2.5 MB',
    pages: 45,
    status: 'final',
    createdAt: '2024-03-10T09:00:00Z'
  },
  {
    id: 'DOC002',
    name: 'TechCorp Certificate of Incorporation',
    type: 'certificate',
    matterId: 'MAT001',
    clientId: 'CLT001',
    uploadedBy: 'LAW001',
    size: '156 KB',
    pages: 5,
    status: 'verified',
    createdAt: '2024-01-22T11:00:00Z'
  },
  {
    id: 'DOC003',
    name: 'Plaint - Agarwal vs SBI',
    type: 'pleading',
    matterId: 'MAT003',
    clientId: 'CLT003',
    uploadedBy: 'LAW002',
    size: '1.8 MB',
    pages: 32,
    status: 'filed',
    createdAt: '2023-06-15T14:00:00Z'
  }
];
sampleDocuments.forEach(doc => documents.set(doc.id, doc));

// Initialize courts
const sampleCourts = [
  { id: 'CRT001', name: 'Supreme Court of India', jurisdiction: 'national', location: 'New Delhi', type: 'Supreme' },
  { id: 'CRT002', name: 'Delhi High Court', jurisdiction: 'state', location: 'New Delhi', type: 'High Court' },
  { id: 'CRT003', name: 'Bombay High Court', jurisdiction: 'state', location: 'Mumbai', type: 'High Court' },
  { id: 'CRT004', name: 'Family Court, Delhi', jurisdiction: 'state', location: 'New Delhi', type: 'Family Court' },
  { id: 'CRT005', name: 'NCLT, New Delhi', jurisdiction: 'tribunal', location: 'New Delhi', type: 'Tribunal' }
];
sampleCourts.forEach(court => courts.set(court.id, court));

// ============================================
// AUTHENTICATION
// ============================================

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password, role, businessName } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash: hashPassword(password),
    role: role || 'partner',
    name: businessName || email.split('@')[0],
    industry: INDUSTRY,
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============================================
// CLIENT MANAGEMENT
// ============================================

app.get('/api/clients', requireAuth, (req, res) => {
  const { status, type } = req.query;
  let result = Array.from(clients.values());
  if (status) result = result.filter(c => c.status === status);
  if (type) result = result.filter(c => c.type === type);
  res.json({ success: true, count: result.length, clients: result });
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Get client's matters
  const clientMatters = Array.from(matters.values()).filter(m => m.clientId === client.id);
  const clientInvoices = Array.from(invoices.values()).filter(i => i.clientId === client.id);

  res.json({ success: true, client, matters: clientMatters, invoices: clientInvoices });
});

app.post('/api/clients', requireAuth, (req, res) => {
  const client = {
    id: 'CLT' + String(clients.size + 1).padStart(3, '0'),
    ...req.body,
    status: 'active',
    totalMatters: 0,
    outstandingBalance: 0,
    avatar: req.body.type === 'corporate' ? '🏢' : '👤',
    createdAt: new Date().toISOString()
  };
  clients.set(client.id, client);
  res.status(201).json({ success: true, client });
});

app.patch('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const updated = { ...client, ...req.body };
  clients.set(client.id, updated);
  res.json({ success: true, client: updated });
});

// ============================================
// MATTER/CASE MANAGEMENT
// ============================================

app.get('/api/matters', requireAuth, (req, res) => {
  const { status, type, priority, lawyerId, clientId } = req.query;
  let result = Array.from(matters.values());
  if (status) result = result.filter(m => m.status === status);
  if (type) result = result.filter(m => m.type === type);
  if (priority) result = result.filter(m => m.priority === priority);
  if (lawyerId) result = result.filter(m => m.assignedLawyer === lawyerId);
  if (clientId) result = result.filter(m => m.clientId === clientId);

  res.json({ success: true, count: result.length, matters: result });
});

app.get('/api/matters/:id', requireAuth, (req, res) => {
  const matter = matters.get(req.params.id);
  if (!matter) return res.status(404).json({ error: 'Matter not found' });

  // Enrich with client and lawyer info
  const client = clients.get(matter.clientId);
  const lawyer = lawyers.get(matter.assignedLawyer);
  const matterDocs = Array.from(documents.values()).filter(d => d.matterId === matter.id);

  res.json({ success: true, matter, client, lawyer, documents: matterDocs });
});

app.post('/api/matters', requireAuth, (req, res) => {
  const { clientId, title, type, priority, assignedLawyer, description, court, estimatedValue } = req.body;

  if (!clientId || !title || !type) {
    return res.status(400).json({ error: 'clientId, title, type required' });
  }

  const matterCount = matters.size + 1;
  const matter = {
    id: 'MAT' + String(matterCount).padStart(3, '0'),
    caseNumber: `LC-2024-${String(matterCount).padStart(3, '0')}`,
    title,
    clientId,
    type,
    status: 'active',
    priority: priority || 'medium',
    assignedLawyer: assignedLawyer || null,
    description: description || '',
    estimatedValue: estimatedValue || 0,
    filedDate: new Date().toISOString().split('T')[0],
    court: court || null,
    opposingCounsel: null,
    documents: [],
    activities: [
      { date: new Date().toISOString().split('T')[0], action: 'Matter opened', lawyer: assignedLawyer }
    ],
    billing: { hours: 0, amount: 0 },
    nextHearing: null,
    createdAt: new Date().toISOString()
  };

  matters.set(matter.id, matter);

  // Update client matter count
  const client = clients.get(clientId);
  if (client) {
    client.totalMatters++;
    clients.set(client.id, client);
  }

  res.status(201).json({ success: true, matter });
});

app.patch('/api/matters/:id', requireAuth, (req, res) => {
  const matter = matters.get(req.params.id);
  if (!matter) return res.status(404).json({ error: 'Matter not found' });

  const updated = { ...matter, ...req.body };
  matters.set(matter.id, updated);
  res.json({ success: true, matter: updated });
});

app.post('/api/matters/:id/activities', requireAuth, (req, res) => {
  const matter = matters.get(req.params.id);
  if (!matter) return res.status(404).json({ error: 'Matter not found' });

  const activity = {
    date: new Date().toISOString().split('T')[0],
    action: req.body.action,
    lawyer: req.body.lawyer || matter.assignedLawyer,
    notes: req.body.notes
  };

  matter.activities.push(activity);
  matters.set(matter.id, matter);

  res.json({ success: true, activity });
});

app.post('/api/matters/:id/hearing', requireAuth, (req, res) => {
  const matter = matters.get(req.params.id);
  if (!matter) return res.status(404).json({ error: 'Matter not found' });

  const { date, purpose, notes } = req.body;

  const hearing = {
    id: 'HEAR' + Date.now(),
    matterId: matter.id,
    date,
    purpose: purpose || 'General hearing',
    notes,
    createdBy: req.session.userId,
    createdAt: new Date().toISOString()
  };

  appointments.set(hearing.id, hearing);
  matter.nextHearing = date;
  matter.activities.push({
    date,
    action: `Hearing scheduled: ${purpose}`,
    lawyer: matter.assignedLawyer
  });
  matters.set(matter.id, matter);

  res.status(201).json({ success: true, hearing });
});

// ============================================
// LAWYER MANAGEMENT
// ============================================

app.get('/api/lawyers', requireAuth, (req, res) => {
  const { specialization, status } = req.query;
  let result = Array.from(lawyers.values());
  if (specialization) result = result.filter(l => l.specialization === specialization);
  if (status) result = result.filter(l => l.status === status);

  res.json({ success: true, count: result.length, lawyers: result });
});

app.get('/api/lawyers/:id', requireAuth, (req, res) => {
  const lawyer = lawyers.get(req.params.id);
  if (!lawyer) return res.status(404).json({ error: 'Lawyer not found' });

  // Get lawyer's matters
  const lawyerMatters = Array.from(matters.values()).filter(m => m.assignedLawyer === lawyer.id);

  // Get workload stats
  const activeMatters = lawyerMatters.filter(m => m.status === 'active');
  const totalBilling = lawyerMatters.reduce((sum, m) => sum + m.billing.amount, 0);

  res.json({
    success: true,
    lawyer,
    matters: lawyerMatters,
    stats: {
      activeMatters: activeMatters.length,
      totalMatters: lawyerMatters.length,
      totalBilling
    }
  });
});

app.post('/api/lawyers', requireAuth, (req, res) => {
  const lawyer = {
    id: 'LAW' + String(lawyers.size + 1).padStart(3, '0'),
    ...req.body,
    status: 'available',
    avatar: req.body.gender === 'male' ? '👨‍⚖️' : '👩‍⚖️',
    casesHandled: 0,
    createdAt: new Date().toISOString()
  };
  lawyers.set(lawyer.id, lawyer);
  res.status(201).json({ success: true, lawyer });
});

app.patch('/api/lawyers/:id', requireAuth, (req, res) => {
  const lawyer = lawyers.get(req.params.id);
  if (!lawyer) return res.status(404).json({ error: 'Lawyer not found' });
  const updated = { ...lawyer, ...req.body };
  lawyers.set(lawyer.id, updated);
  res.json({ success: true, lawyer: updated });
});

// ============================================
// DOCUMENT MANAGEMENT
// ============================================

app.get('/api/documents', requireAuth, (req, res) => {
  const { matterId, clientId, type } = req.query;
  let result = Array.from(documents.values());
  if (matterId) result = result.filter(d => d.matterId === matterId);
  if (clientId) result = result.filter(d => d.clientId === clientId);
  if (type) result = result.filter(d => d.type === type);

  res.json({ success: true, count: result.length, documents: result });
});

app.get('/api/documents/:id', requireAuth, (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ success: true, document: doc });
});

app.post('/api/documents', requireAuth, (req, res) => {
  const { name, type, matterId, clientId } = req.body;

  const doc = {
    id: 'DOC' + Date.now(),
    name,
    type: type || 'general',
    matterId: matterId || null,
    clientId: clientId || null,
    uploadedBy: req.session.userId,
    size: req.body.size || '0 KB',
    pages: req.body.pages || 1,
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  documents.set(doc.id, doc);

  // Link to matter
  if (matterId) {
    const matter = matters.get(matterId);
    if (matter) {
      matter.documents.push(doc.id);
      matters.set(matter.id, matter);
    }
  }

  res.status(201).json({ success: true, document: doc });
});

app.patch('/api/documents/:id', requireAuth, (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const updated = { ...doc, ...req.body };
  documents.set(doc.id, updated);
  res.json({ success: true, document: updated });
});

// ============================================
// BILLING & INVOICING
// ============================================

app.get('/api/invoices', requireAuth, (req, res) => {
  const { clientId, status, matterId } = req.query;
  let result = Array.from(invoices.values());
  if (clientId) result = result.filter(i => i.clientId === clientId);
  if (status) result = result.filter(i => i.status === status);
  if (matterId) result = result.filter(i => i.matterId === matterId);

  res.json({ success: true, count: result.length, invoices: result });
});

app.get('/api/invoices/:id', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const client = clients.get(invoice.clientId);
  const matter = matters.get(invoice.matterId);

  res.json({ success: true, invoice, client, matter });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const { clientId, matterId, items, dueDate } = req.body;

  if (!clientId || !items || items.length === 0) {
    return res.status(400).json({ error: 'clientId and items required' });
  }

  const invoiceCount = invoices.size + 1;
  const amount = items.reduce((sum, item) => sum + (item.hours * item.rate), 0);
  const tax = Math.round(amount * 0.18);

  const invoice = {
    id: 'INV' + String(invoiceCount).padStart(3, '0'),
    invoiceNumber: `LP/2024/${String(invoiceCount).padStart(4, '0')}`,
    clientId,
    matterId: matterId || null,
    amount,
    tax,
    total: amount + tax,
    status: 'pending',
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items,
    createdAt: new Date().toISOString()
  };

  invoices.set(invoice.id, invoice);

  // Update matter billing
  if (matterId) {
    const matter = matters.get(matterId);
    if (matter) {
      matter.billing.hours += items.reduce((sum, item) => sum + item.hours, 0);
      matter.billing.amount += amount;
      matters.set(matter.id, matter);
    }
  }

  // Update client outstanding
  const client = clients.get(clientId);
  if (client) {
    client.outstandingBalance += invoice.total;
    clients.set(client.id, client);
  }

  res.status(201).json({ success: true, invoice });
});

app.patch('/api/invoices/:id/status', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  invoice.status = req.body.status;
  invoices.set(invoice.id, invoice);

  res.json({ success: true, invoice });
});

// ============================================
// PAYMENTS
// ============================================

app.get('/api/payments', requireAuth, (req, res) => {
  const { clientId, invoiceId } = req.query;
  let result = Array.from(payments.values());
  if (clientId) result = result.filter(p => p.clientId === clientId);
  if (invoiceId) result = result.filter(p => p.invoiceId === invoiceId);

  res.json({ success: true, count: result.length, payments: result });
});

app.post('/api/payments', requireAuth, (req, res) => {
  const { invoiceId, amount, method, reference } = req.body;

  const invoice = invoices.get(invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const payment = {
    id: 'PAY' + Date.now(),
    invoiceId,
    clientId: invoice.clientId,
    amount,
    method: method || 'bank_transfer',
    reference: reference || null,
    status: 'completed',
    createdBy: req.session.userId,
    createdAt: new Date().toISOString()
  };

  payments.set(payment.id, payment);

  // Update invoice status
  const totalPaid = Array.from(payments.values())
    .filter(p => p.invoiceId === invoiceId && p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid >= invoice.total) {
    invoice.status = 'paid';
  } else if (totalPaid > 0) {
    invoice.status = 'partial';
  }
  invoices.set(invoice.id, invoice);

  // Update client outstanding
  const client = clients.get(invoice.clientId);
  if (client) {
    client.outstandingBalance = Math.max(0, client.outstandingBalance - amount);
    clients.set(client.id, client);
  }

  res.status(201).json({ success: true, payment, invoice });
});

// ============================================
// TASKS
// ============================================

app.get('/api/tasks', requireAuth, (req, res) => {
  const { assignedTo, status, priority, matterId } = req.query;
  let result = Array.from(tasks.values());
  if (assignedTo) result = result.filter(t => t.assignedTo === assignedTo);
  if (status) result = result.filter(t => t.status === status);
  if (priority) result = result.filter(t => t.priority === priority);
  if (matterId) result = result.filter(t => t.matterId === matterId);

  res.json({ success: true, count: result.length, tasks: result });
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const task = {
    id: 'TASK' + Date.now(),
    ...req.body,
    status: 'pending',
    createdBy: req.session.userId,
    createdAt: new Date().toISOString()
  };
  tasks.set(task.id, task);
  res.status(201).json({ success: true, task });
});

app.patch('/api/tasks/:id', requireAuth, (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const updated = { ...task, ...req.body };
  tasks.set(task.id, updated);
  res.json({ success: true, task: updated });
});

// ============================================
// COURTS
// ============================================

app.get('/api/courts', requireAuth, (req, res) => {
  const { jurisdiction, type } = req.query;
  let result = Array.from(courts.values());
  if (jurisdiction) result = result.filter(c => c.jurisdiction === jurisdiction);
  if (type) result = result.filter(c => c.type === type);

  res.json({ success: true, count: result.length, courts: result });
});

// ============================================
// CONTRACTS (for contract drafting)
// ============================================

app.get('/api/contracts', requireAuth, (req, res) => {
  const { clientId, status, type } = req.query;
  let result = Array.from(contracts.values());
  if (clientId) result = result.filter(c => c.clientId === clientId);
  if (status) result = result.filter(c => c.status === status);
  if (type) result = result.filter(c => c.type === type);

  res.json({ success: true, count: result.length, contracts: result });
});

app.post('/api/contracts', requireAuth, (req, res) => {
  const contract = {
    id: 'CON' + Date.now(),
    ...req.body,
    status: 'draft',
    createdBy: req.session.userId,
    createdAt: new Date().toISOString()
  };
  contracts.set(contract.id, contract);
  res.status(201).json({ success: true, contract });
});

app.patch('/api/contracts/:id', requireAuth, (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  const updated = { ...contract, ...req.body };
  contracts.set(contract.id, updated);
  res.json({ success: true, contract: updated });
});

// ============================================
// CALENDAR & APPOINTMENTS
// ============================================

app.get('/api/appointments', requireAuth, (req, res) => {
  const { lawyerId, date, type } = req.query;
  let result = Array.from(appointments.values());
  if (lawyerId) result = result.filter(a => a.lawyerId === lawyerId);
  if (date) result = result.filter(a => a.date === date);
  if (type) result = result.filter(a => a.type === type);

  res.json({ success: true, count: result.length, appointments: result });
});

app.post('/api/appointments', requireAuth, (req, res) => {
  const appointment = {
    id: 'APPT' + Date.now(),
    ...req.body,
    createdBy: req.session.userId,
    createdAt: new Date().toISOString()
  };
  appointments.set(appointment.id, appointment);
  res.status(201).json({ success: true, appointment });
});

// ============================================
// ANALYTICS & REPORTS
// ============================================

app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const matterList = Array.from(matters.values());
  const invoiceList = Array.from(invoices.values());
  const clientList = Array.from(clients.values());

  const totalRevenue = invoiceList
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0);

  const pendingRevenue = invoiceList
    .filter(i => i.status === 'pending' || i.status === 'partial')
    .reduce((sum, i) => sum + i.total, 0);

  const activeMatters = matterList.filter(m => m.status === 'active');
  const highPriorityMatters = activeMatters.filter(m => m.priority === 'high');

  const casesByType = {};
  matterList.forEach(m => {
    casesByType[m.type] = (casesByType[m.type] || 0) + 1;
  });

  const revenueByMonth = {};
  invoiceList.filter(i => i.status === 'paid').forEach(inv => {
    const month = inv.createdAt.substring(0, 7);
    revenueByMonth[month] = (revenueByMonth[month] || 0) + inv.total;
  });

  res.json({
    success: true,
    overview: {
      totalClients: clientList.length,
      activeClients: clientList.filter(c => c.status === 'active').length,
      totalMatters: matterList.length,
      activeMatters: activeMatters.length,
      highPriorityMatters: highPriorityMatters.length,
      totalRevenue,
      pendingRevenue,
      outstandingInvoices: invoiceList.filter(i => i.status === 'pending').length,
      casesByType,
      revenueByMonth
    }
  });
});

app.get('/api/analytics/lawyers', requireAuth, (req, res) => {
  const lawyerList = Array.from(lawyers.values());
  const matterList = Array.from(matters.values());

  const lawyerStats = lawyerList.map(lawyer => {
    const lawyerMatters = matterList.filter(m => m.assignedLawyer === lawyer.id);
    const activeMatters = lawyerMatters.filter(m => m.status === 'active');
    const totalBilling = lawyerMatters.reduce((sum, m) => sum + m.billing.amount, 0);
    const totalHours = lawyerMatters.reduce((sum, m) => sum + m.billing.hours, 0);

    return {
      ...lawyer,
      stats: {
        totalMatters: lawyerMatters.length,
        activeMatters: activeMatters.length,
        totalHours,
        totalBilling,
        avgRate: totalHours > 0 ? totalBilling / totalHours : 0
      }
    };
  });

  res.json({ success: true, lawyers: lawyerStats });
});

app.get('/api/analytics/clients', requireAuth, (req, res) => {
  const clientList = Array.from(clients.values());

  const topClients = clientList
    .map(client => {
      const clientMatters = Array.from(matters.values()).filter(m => m.clientId === client.id);
      const clientInvoices = Array.from(invoices.values()).filter(i => i.clientId === client.id);
      const totalRevenue = clientInvoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.total, 0);

      return {
        ...client,
        stats: {
          totalMatters: clientMatters.length,
          activeMatters: clientMatters.filter(m => m.status === 'active').length,
          totalRevenue,
          outstandingBalance: client.outstandingBalance
        }
      };
    })
    .sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue);

  res.json({ success: true, clients: topClients });
});

// ============================================
// RTMN LAYER INTEGRATIONS
// ============================================

app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({
    layer: 1,
    name: 'Intelligence',
    capabilities: ['Legal Research AI', 'Case Prediction', 'Document Analysis', 'Compliance Check'],
    status: 'available'
  });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({
    layer: 2,
    name: 'Customer Growth',
    capabilities: ['Client Acquisition', 'Referrals', 'Marketing', 'CRM'],
    status: 'available'
  });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({
    layer: 3,
    name: 'Commerce',
    capabilities: ['Legal Services', 'Retainer Billing', 'Subscription'],
    status: 'available'
  });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({
    layer: 4,
    name: 'Finance',
    capabilities: ['Invoicing', 'Payment Collection', 'Trust Accounting', 'Financial Reporting'],
    status: 'available'
  });
});

app.get('/api/layer/workforce', requireAuth, (req, res) => {
  res.json({
    layer: 5,
    name: 'Workforce',
    capabilities: ['Staff Management', 'Paralegal Tracking', 'Calendar', 'Attendance'],
    status: 'available'
  });
});

app.get('/api/layers', requireAuth, async (req, res) => {
  res.json({
    industry: INDUSTRY,
    service: 'Legal OS',
    layers: 15,
    version: '2.0.0'
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Legal OS',
    version: '2.0.0',
    port: PORT,
    industry: 'Legal Services',
    timestamp: new Date().toISOString(),
    stats: {
      clients: clients.size,
      matters: matters.size,
      lawyers: lawyers.size,
      documents: documents.size,
      invoices: invoices.size,
      appointments: appointments.size
    }
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                  LEGAL OS v2.0.0                       ║
║           Complete Legal Practice Management           ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║                                                          ║
║  Features:                                             ║
║  • Client Management (Corporate & Individual)          ║
║  • Matter/Case Management                              ║
║  • Lawyer Profiles & Assignments                        ║
║  • Document Management                                 ║
║  • Billing & Invoicing                                 ║
║  • Court Calendar & Hearings                           ║
║  • Contracts Drafting                                  ║
║  • Task Management                                    ║
║  • Analytics & Reporting                              ║
║                                                          ║
║  RTMN Integrations:                                   ║
║  • Memory OS (4703) - Client Memory                   ║
║  • CorpID (4702) - Identity Verification              ║
║  • Decision Engine (4240) - Compliance Check          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
