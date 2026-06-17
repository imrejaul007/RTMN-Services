/**
 * Government OS - Civic Services Management Platform
 *
 * Complete Government/Civic Services Management System
 * Port: 5130
 * Industry: Government & Public Services
 *
 * Features:
 * - Citizen Management
 * - Service/Scheme Management (rations, pensions, certificates)
 * - Department Management
 * - Application/Grievance Tracking
 * - Document Verification (Aadhaar, PAN, Ration card)
 * - Appointment Scheduling
 * - Official/Employee Management
 * - Analytics & RTMN Layer Integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5130;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const authUsers = new Map();     // userId -> { email, passwordHash, role, createdAt }
const authSessions = new Map();  // token -> { userId, role, createdAt, expiresAt }

// Core entities
const citizens = new Map();       // citizenId -> Citizen data
const schemes = new Map();        // schemeId -> Scheme data
const departments = new Map();   // deptId -> Department data
const applications = new Map();   // appId -> Application data
const documents = new Map();     // docId -> Document data
const appointments = new Map();  // apptId -> Appointment data
const officials = new Map();      // officialId -> Official data

// Initialize sample data
function initializeSampleData() {
    // Sample Citizens
    const sampleCitizens = [
        {
            id: 'CIT001', name: 'Ramesh Kumar', aadhaar: 'XXXX-XXXX-1234', phone: '+91-9876543210',
            email: 'ramesh.kumar@email.com', address: 'Village Sundarpur, District Varanasi, UP',
            dateOfBirth: '1965-03-15', gender: 'Male', occupation: 'Farmer',
            annualIncome: 85000, caste: 'OBC', religion: 'Hindu',
            familyMembers: 5, rationCard: 'RC-UP-2024-00123', voterId: 'ABC123456',
            bankAccount: { bank: 'State Bank', accountNo: 'XXXXXX3456', ifsc: 'SBIN0001234' },
            status: 'active', createdAt: new Date().toISOString()
        },
        {
            id: 'CIT002', name: 'Sunita Devi', aadhaar: 'XXXX-XXXX-5678', phone: '+91-8765432109',
            email: 'sunita.devi@email.com', address: 'Ward 12, MG Road, Lucknow, UP',
            dateOfBirth: '1970-07-22', gender: 'Female', occupation: 'Homemaker',
            annualIncome: 45000, caste: 'SC', religion: 'Hindu',
            familyMembers: 4, rationCard: 'RC-UP-2024-00456', voterId: 'DEF789012',
            bankAccount: { bank: 'Punjab National Bank', accountNo: 'XXXXXX7890', ifsc: 'PUNB0005678' },
            status: 'active', createdAt: new Date().toISOString()
        },
        {
            id: 'CIT003', name: 'Mohammad Arif', aadhaar: 'XXXX-XXXX-9012', phone: '+91-7654321098',
            email: 'arif.mohd@email.com', address: 'Flat 302, Block A, Gomti Nagar, Lucknow, UP',
            dateOfBirth: '1985-11-08', gender: 'Male', occupation: 'Government Employee',
            annualIncome: 450000, caste: 'General', religion: 'Islam',
            familyMembers: 3, rationCard: 'RC-UP-2024-00789', voterId: 'GHI345678',
            bankAccount: { bank: 'HDFC Bank', accountNo: 'XXXXXX1234', ifsc: 'HDFC0001234' },
            status: 'active', createdAt: new Date().toISOString()
        },
        {
            id: 'CIT004', name: 'Lakshmi Gupta', aadhaar: 'XXXX-XXXX-3456', phone: '+91-6543210987',
            email: 'lakshmi.gupta@email.com', address: '45, Nehru Colony, Kanpur, UP',
            dateOfBirth: '1958-01-30', gender: 'Female', occupation: 'Retired Teacher',
            annualIncome: 120000, caste: 'General', religion: 'Hindu',
            familyMembers: 2, rationCard: 'RC-UP-2024-00112', voterId: 'JKL901234',
            bankAccount: { bank: 'Canara Bank', accountNo: 'XXXXXX5678', ifsc: 'CNRB0003456' },
            status: 'active', createdAt: new Date().toISOString()
        },
        {
            id: 'CIT005', name: 'Vikram Singh', aadhaar: 'XXXX-XXXX-7890', phone: '+91-5432109876',
            email: 'vikram.singh@email.com', address: 'Village Rampur, Tehsil Dalmau, Rae Bareli, UP',
            dateOfBirth: '1990-05-18', gender: 'Male', occupation: 'Daily Wage Worker',
            annualIncome: 65000, caste: 'OBC', religion: 'Hindu',
            familyMembers: 6, rationCard: 'RC-UP-2024-00345', voterId: 'MNO567890',
            bankAccount: { bank: 'Bank of Baroda', accountNo: 'XXXXXX9012', ifsc: 'BARB0DALMAU' },
            status: 'active', createdAt: new Date().toISOString()
        }
    ];

    sampleCitizens.forEach(c => citizens.set(c.id, c));

    // Sample Schemes
    const sampleSchemes = [
        {
            id: 'SCH001', name: 'PM Kisan Samman Nidhi', category: 'Agriculture',
            description: 'Direct income support of Rs. 6000/year to farmer families',
            eligibility: { minIncome: 150000, maxIncome: 2000000, castes: ['All'] },
            benefits: { amount: 6000, frequency: 'Yearly', type: 'Direct Transfer' },
            documents: ['Aadhaar Card', 'Land Records', 'Bank Account'],
            departmentId: 'DEPT001', status: 'active', createdAt: new Date().toISOString()
        },
        {
            id: 'SCH002', name: 'National Old Age Pension', category: 'Social Security',
            description: 'Monthly pension for senior citizens below poverty line',
            eligibility: { minAge: 60, maxIncome: 100000, castes: ['All'] },
            benefits: { amount: 500, frequency: 'Monthly', type: 'Pension' },
            documents: ['Aadhaar Card', 'Age Proof', 'Income Certificate', 'Bank Account'],
            departmentId: 'DEPT002', status: 'active', createdAt: new Date().toISOString()
        },
        {
            id: 'SCH003', name: 'Ration Card Registration', category: 'Food & Civil Supplies',
            description: 'Public Distribution System ration card for subsidized food grains',
            eligibility: { maxIncome: 100000, familySize: 'Any', castes: ['All'] },
            benefits: { amount: 0, frequency: 'Monthly', type: 'Subsidized Rations' },
            documents: ['Aadhaar Cards (all family)', 'Address Proof', 'Photo', 'Bank Account'],
            departmentId: 'DEPT003', status: 'active', createdAt: new Date().toISOString()
        },
        {
            id: 'SCH004', name: 'PM Awas Yojana (Rural)', category: 'Housing',
            description: 'Financial assistance for construction of pucca house',
            eligibility: { minIncome: 180000, maxIncome: 300000, castes: ['SC', 'ST', 'OBC', 'General'] },
            benefits: { amount: 120000, frequency: 'One-time', type: 'Grant' },
            documents: ['Aadhaar Card', 'Land Ownership Proof', 'Income Certificate', 'Bank Account', 'Caste Certificate'],
            departmentId: 'DEPT001', status: 'active', createdAt: new Date().toISOString()
        }
    ];

    sampleSchemes.forEach(s => schemes.set(s.id, s));

    // Sample Departments
    const sampleDepartments = [
        {
            id: 'DEPT001', name: 'Revenue Department', code: 'REV',
            description: 'Land records, revenue administration, disaster management',
            contact: { phone: '+91-522-2234567', email: 'revenue@up.gov.in', address: 'Lok Bhawan, Lucknow' },
            officials: ['OFF001', 'OFF002'], services: ['SCH001', 'SCH004'],
            status: 'active', createdAt: new Date().toISOString()
        },
        {
            id: 'DEPT002', name: 'Social Welfare Department', code: 'SWF',
            description: 'Pension schemes, scholarships, social security programs',
            contact: { phone: '+91-522-2237890', email: 'socialwelfare@up.gov.in', address: 'Janusagar, Lucknow' },
            officials: ['OFF003'], services: ['SCH002'],
            status: 'active', createdAt: new Date().toISOString()
        },
        {
            id: 'DEPT003', name: 'Food & Civil Supplies', code: 'FCS',
            description: 'Public distribution system, food security, price control',
            contact: { phone: '+91-522-2234568', email: 'food@up.gov.in', address: 'Kaiser Bagh, Lucknow' },
            officials: ['OFF004', 'OFF005'], services: ['SCH003'],
            status: 'active', createdAt: new Date().toISOString()
        }
    ];

    sampleDepartments.forEach(d => departments.set(d.id, d));

    // Sample Applications
    const sampleApplications = [
        {
            id: 'APP001', citizenId: 'CIT001', schemeId: 'SCH001',
            type: 'New Application', status: 'under_review',
            submittedAt: '2024-01-15T10:30:00Z', updatedAt: '2024-01-16T14:00:00Z',
            documents: [{ name: 'Aadhaar Card', verified: true }, { name: 'Land Records', verified: false }],
            officerId: 'OFF001', remarks: ['Land verification pending', 'Village accountant contacted'],
            timeline: [
                { date: '2024-01-15', action: 'Application Submitted', by: 'System', status: 'completed' },
                { date: '2024-01-16', action: 'Initial Review', by: 'OFF001', status: 'completed' }
            ]
        },
        {
            id: 'APP002', citizenId: 'CIT004', schemeId: 'SCH002',
            type: 'New Application', status: 'pending_documents',
            submittedAt: '2024-01-20T09:15:00Z', updatedAt: '2024-01-21T11:00:00Z',
            documents: [{ name: 'Aadhaar Card', verified: true }, { name: 'Age Proof', verified: false }],
            officerId: 'OFF003', remarks: ['Age proof document missing'],
            timeline: [
                { date: '2024-01-20', action: 'Application Submitted', by: 'System', status: 'completed' },
                { date: '2024-01-21', action: 'Document Verification', by: 'OFF003', status: 'pending' }
            ]
        },
        {
            id: 'APP003', citizenId: 'CIT002', schemeId: 'SCH003',
            type: 'New Application', status: 'approved',
            submittedAt: '2023-12-01T14:00:00Z', updatedAt: '2024-01-05T16:30:00Z',
            documents: [{ name: 'Aadhaar Card', verified: true }, { name: 'Address Proof', verified: true }, { name: 'Bank Account', verified: true }],
            officerId: 'OFF004', remarks: ['All documents verified', 'Ration card approved'],
            approvedAt: '2024-01-05', approvalDetails: { approvedBy: 'OFF004', cardNo: 'RC-UP-2024-00456' },
            timeline: [
                { date: '2023-12-01', action: 'Application Submitted', by: 'System', status: 'completed' },
                { date: '2023-12-10', action: 'Document Verification', by: 'OFF004', status: 'completed' },
                { date: '2024-01-05', action: 'Final Approval', by: 'OFF004', status: 'completed' }
            ]
        },
        {
            id: 'APP004', citizenId: 'CIT005', schemeId: 'SCH001',
            type: 'Renewal', status: 'pending',
            submittedAt: '2024-01-25T11:45:00Z', updatedAt: '2024-01-25T11:45:00Z',
            documents: [{ name: 'Aadhaar Card', verified: true }, { name: 'Land Records', verified: false }],
            officerId: null, remarks: [],
            timeline: [
                { date: '2024-01-25', action: 'Renewal Application Submitted', by: 'System', status: 'completed' }
            ]
        },
        {
            id: 'APP005', citizenId: 'CIT003', schemeId: 'SCH004',
            type: 'New Application', status: 'rejected',
            submittedAt: '2023-11-15T10:00:00Z', updatedAt: '2023-12-20T15:00:00Z',
            documents: [{ name: 'Aadhaar Card', verified: true }, { name: 'Income Certificate', verified: false }],
            officerId: 'OFF002', remarks: ['Income exceeds eligibility criteria'],
            rejectionReason: 'Annual income Rs. 4,50,000 exceeds maximum limit of Rs. 3,00,000 for the scheme',
            timeline: [
                { date: '2023-11-15', action: 'Application Submitted', by: 'System', status: 'completed' },
                { date: '2023-12-10', action: 'Document Verification', by: 'OFF002', status: 'completed' },
                { date: '2023-12-20', action: 'Application Rejected', by: 'OFF002', status: 'completed' }
            ]
        }
    ];

    sampleApplications.forEach(a => applications.set(a.id, a));

    // Sample Officials
    const sampleOfficials = [
        {
            id: 'OFF001', name: 'Rajesh Verma', designation: 'District Revenue Officer',
            departmentId: 'DEPT001', aadhaar: 'XXXX-XXXX-1111', phone: '+91-522-2234001',
            email: 'rajesh.verma@up.gov.in', address: 'Staff Quarters, Collectorate, Lucknow',
            role: 'approver', assignedApplications: ['APP001'], status: 'active',
            createdAt: new Date().toISOString()
        },
        {
            id: 'OFF002', name: 'Priya Sharma', designation: 'Assistant Commissioner',
            departmentId: 'DEPT001', aadhaar: 'XXXX-XXXX-2222', phone: '+91-522-2234002',
            email: 'priya.sharma@up.gov.in', address: 'Lok Bhawan, 2nd Floor, Lucknow',
            role: 'reviewer', assignedApplications: ['APP005'], status: 'active',
            createdAt: new Date().toISOString()
        },
        {
            id: 'OFF003', name: 'Anil Yadav', designation: 'Social Welfare Officer',
            departmentId: 'DEPT002', aadhaar: 'XXXX-XXXX-3333', phone: '+91-522-2234003',
            email: 'anil.yadav@up.gov.in', address: 'Janusagar, Block B, Lucknow',
            role: 'approver', assignedApplications: ['APP002'], status: 'active',
            createdAt: new Date().toISOString()
        },
        {
            id: 'OFF004', name: 'Meena Gupta', designation: 'District Supply Officer',
            departmentId: 'DEPT003', aadhaar: 'XXXX-XXXX-4444', phone: '+91-522-2234004',
            email: 'meena.gupta@up.gov.in', address: 'Food Office, Kaiser Bagh, Lucknow',
            role: 'approver', assignedApplications: ['APP003'], status: 'active',
            createdAt: new Date().toISOString()
        },
        {
            id: 'OFF005', name: 'Suresh Patel', designation: 'Tehsildar',
            departmentId: 'DEPT003', aadhaar: 'XXXX-XXXX-5555', phone: '+91-522-2234005',
            email: 'suresh.patel@up.gov.in', address: 'Tehsil Office, Gomti Nagar, Lucknow',
            role: 'reviewer', assignedApplications: [], status: 'active',
            createdAt: new Date().toISOString()
        }
    ];

    sampleOfficials.forEach(o => officials.set(o.id, o));

    // Create admin user
    authUsers.set('admin', {
        email: 'admin@government.gov.in',
        passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
        role: 'admin',
        createdAt: new Date().toISOString()
    });

    console.log(`Government OS initialized with: ${citizens.size} citizens, ${schemes.size} schemes, ${departments.size} departments, ${applications.size} applications, ${officials.size} officials`);
}

// Auth helpers
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const session = authSessions.get(token);
    if (!session) return res.status(401).json({ error: 'Invalid or expired token' });

    if (new Date() > new Date(session.expiresAt)) {
        authSessions.delete(token);
        return res.status(401).json({ error: 'Token expired' });
    }

    req.user = session;
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

// ============== HEALTH & INFO ==============

app.get('/health', (req, res) => {
    res.json({
        service: 'Government OS',
        port: PORT,
        status: 'healthy',
        version: '1.0.0',
        industry: 'Government & Civic Services',
        timestamp: new Date().toISOString(),
        stats: {
            citizens: citizens.size,
            schemes: schemes.size,
            departments: departments.size,
            applications: applications.size,
            officials: officials.size
        }
    });
});

app.get('/', (req, res) => {
    res.json({
        service: 'Government OS',
        description: 'Complete Civic Services Management Platform',
        version: '1.0.0',
        port: PORT,
        endpoints: {
            auth: ['POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/logout', 'GET /api/auth/me'],
            citizens: ['GET /api/citizens', 'POST /api/citizens', 'GET /api/citizens/:id', 'PUT /api/citizens/:id', 'GET /api/citizens/:id/applications'],
            schemes: ['GET /api/schemes', 'POST /api/schemes', 'GET /api/schemes/:id', 'PUT /api/schemes/:id'],
            departments: ['GET /api/departments', 'POST /api/departments', 'GET /api/departments/:id', 'PUT /api/departments/:id'],
            applications: ['GET /api/applications', 'POST /api/applications', 'GET /api/applications/:id', 'PUT /api/applications/:id', 'POST /api/applications/:id/approve', 'POST /api/applications/:id/reject'],
            documents: ['GET /api/documents/verify/:type/:number', 'POST /api/documents/verify'],
            appointments: ['GET /api/appointments', 'POST /api/appointments', 'GET /api/appointments/:id', 'PUT /api/appointments/:id'],
            officials: ['GET /api/officials', 'POST /api/officials', 'GET /api/officials/:id', 'PUT /api/officials/:id'],
            analytics: ['GET /api/analytics/dashboard', 'GET /api/analytics/schemes', 'GET /api/analytics/departments'],
            layers: ['GET /api/layers']
        }
    });
});

// ============== AUTH ==============

app.post('/api/auth/register', (req, res) => {
    try {
        const { email, password, role = 'citizen', citizenId } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        if (authUsers.has(email)) return res.status(409).json({ error: 'User already exists' });

        const userId = `USR-${Date.now()}`;
        authUsers.set(email, {
            userId,
            email,
            passwordHash: crypto.createHash('sha256').update(password).digest('hex'),
            role,
            citizenId,
            createdAt: new Date().toISOString()
        });

        res.status(201).json({ message: 'User registered', userId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = authUsers.get(email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (hash !== user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        authSessions.set(token, { userId: user.userId, email: user.email, role: user.role, createdAt: new Date().toISOString(), expiresAt });

        res.json({ token, user: { userId: user.userId, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
    authSessions.delete(req.headers.authorization?.replace('Bearer ', ''));
    res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = [...authUsers.values()].find(u => u.email === req.user.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ userId: user.userId, email: user.email, role: user.role });
});

// ============== CITIZENS ==============

app.get('/api/citizens', requireAuth, (req, res) => {
    const list = [...citizens.values()];
    const { search, status, page = 1, limit = 20 } = req.query;

    let filtered = list;
    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(c => c.name.toLowerCase().includes(s) || c.aadhaar.includes(s) || c.phone.includes(s));
    }
    if (status) filtered = filtered.filter(c => c.status === status);

    const total = filtered.length;
    const start = (page - 1) * limit;
    filtered = filtered.slice(start, start + parseInt(limit));

    res.json({ citizens: filtered, total, page: parseInt(page), limit: parseInt(limit) });
});

app.post('/api/citizens', requireAuth, requireRole('admin', 'officer'), (req, res) => {
    try {
        const { name, aadhaar, phone, email, address, dateOfBirth, gender, occupation, annualIncome, caste, religion, familyMembers, rationCard, voterId, bankAccount } = req.body;
        if (!name || !aadhaar) return res.status(400).json({ error: 'Name and Aadhaar required' });

        const id = `CIT${String(citizens.size + 1).padStart(3, '0')}`;
        const citizen = { id, name, aadhaar, phone, email, address, dateOfBirth, gender, occupation, annualIncome, caste, religion, familyMembers, rationCard, voterId, bankAccount, status: 'active', createdAt: new Date().toISOString() };
        citizens.set(id, citizen);
        res.status(201).json(citizen);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/citizens/:id', requireAuth, (req, res) => {
    const citizen = citizens.get(req.params.id);
    if (!citizen) return res.status(404).json({ error: 'Citizen not found' });
    res.json(citizen);
});

app.put('/api/citizens/:id', requireAuth, requireRole('admin', 'officer'), (req, res) => {
    const citizen = citizens.get(req.params.id);
    if (!citizen) return res.status(404).json({ error: 'Citizen not found' });

    const updated = { ...citizen, ...req.body, id: citizen.id, updatedAt: new Date().toISOString() };
    citizens.set(req.params.id, updated);
    res.json(updated);
});

app.get('/api/citizens/:id/applications', requireAuth, (req, res) => {
    const citizen = citizens.get(req.params.id);
    if (!citizen) return res.status(404).json({ error: 'Citizen not found' });

    const apps = [...applications.values()].filter(a => a.citizenId === req.params.id);
    res.json(apps);
});

// ============== SCHEMES ==============

app.get('/api/schemes', (req, res) => {
    const list = [...schemes.values()];
    const { category, status, search, departmentId } = req.query;

    let filtered = list;
    if (category) filtered = filtered.filter(s => s.category === category);
    if (status) filtered = filtered.filter(s => s.status === status);
    if (departmentId) filtered = filtered.filter(s => s.departmentId === departmentId);
    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(sv => sv.name.toLowerCase().includes(s) || sv.description.toLowerCase().includes(s));
    }

    res.json({ schemes: filtered, total: filtered.length });
});

app.post('/api/schemes', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { name, category, description, eligibility, benefits, documents, departmentId } = req.body;
        if (!name || !category) return res.status(400).json({ error: 'Name and category required' });

        const id = `SCH${String(schemes.size + 1).padStart(3, '0')}`;
        const scheme = { id, name, category, description, eligibility, benefits, documents, departmentId, status: 'active', createdAt: new Date().toISOString() };
        schemes.set(id, scheme);
        res.status(201).json(scheme);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/schemes/:id', (req, res) => {
    const scheme = schemes.get(req.params.id);
    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

    const dept = departments.get(scheme.departmentId);
    const stats = [...applications.values()].filter(a => a.schemeId === scheme.id);
    const statsByStatus = {
        total: stats.length,
        pending: stats.filter(a => a.status === 'pending').length,
        under_review: stats.filter(a => a.status === 'under_review').length,
        approved: stats.filter(a => a.status === 'approved').length,
        rejected: stats.filter(a => a.status === 'rejected').length
    };

    res.json({ ...scheme, department: dept, stats: statsByStatus });
});

app.put('/api/schemes/:id', requireAuth, requireRole('admin'), (req, res) => {
    const scheme = schemes.get(req.params.id);
    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

    const updated = { ...scheme, ...req.body, id: scheme.id, updatedAt: new Date().toISOString() };
    schemes.set(req.params.id, updated);
    res.json(updated);
});

// ============== DEPARTMENTS ==============

app.get('/api/departments', (req, res) => {
    const list = [...departments.values()].map(d => {
        const deptSchemes = [...schemes.values()].filter(s => s.departmentId === d.id);
        const deptApps = [...applications.values()].filter(a => {
            const scheme = schemes.get(a.schemeId);
            return scheme && scheme.departmentId === d.id;
        });
        return { ...d, schemeCount: deptSchemes.length, applicationCount: deptApps.length };
    });
    res.json({ departments: list, total: list.length });
});

app.post('/api/departments', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { name, code, description, contact } = req.body;
        if (!name || !code) return res.status(400).json({ error: 'Name and code required' });

        const id = `DEPT${String(departments.size + 1).padStart(3, '0')}`;
        const department = { id, name, code, description, contact, officials: [], services: [], status: 'active', createdAt: new Date().toISOString() };
        departments.set(id, department);
        res.status(201).json(department);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/departments/:id', (req, res) => {
    const dept = departments.get(req.params.id);
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    const deptSchemes = [...schemes.values()].filter(s => s.departmentId === dept.id);
    const deptOfficials = [...officials.values()].filter(o => o.departmentId === dept.id);
    const deptApps = [...applications.values()].filter(a => {
        const scheme = schemes.get(a.schemeId);
        return scheme && scheme.departmentId === dept.id;
    });

    res.json({ ...dept, schemes: deptSchemes, officials: deptOfficials, applicationCount: deptApps.length });
});

app.put('/api/departments/:id', requireAuth, requireRole('admin'), (req, res) => {
    const dept = departments.get(req.params.id);
    if (!dept) return res.status(404).json({ error: 'Department not found' });

    const updated = { ...dept, ...req.body, id: dept.id, updatedAt: new Date().toISOString() };
    departments.set(req.params.id, updated);
    res.json(updated);
});

// ============== APPLICATIONS ==============

app.get('/api/applications', requireAuth, (req, res) => {
    let list = [...applications.values()];
    const { status, schemeId, citizenId, departmentId, page = 1, limit = 20 } = req.query;

    if (status) list = list.filter(a => a.status === status);
    if (schemeId) list = list.filter(a => a.schemeId === schemeId);
    if (citizenId) list = list.filter(a => a.citizenId === citizenId);
    if (departmentId) {
        list = list.filter(a => {
            const scheme = schemes.get(a.schemeId);
            return scheme && scheme.departmentId === departmentId;
        });
    }

    list = list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const total = list.length;
    const start = (page - 1) * limit;
    list = list.slice(start, start + parseInt(limit)).map(a => {
        const citizen = citizens.get(a.citizenId);
        const scheme = schemes.get(a.schemeId);
        return { ...a, citizenName: citizen?.name, schemeName: scheme?.name };
    });

    res.json({ applications: list, total, page: parseInt(page), limit: parseInt(limit) });
});

app.post('/api/applications', requireAuth, (req, res) => {
    try {
        const { citizenId, schemeId, type = 'New Application', documents: appDocs } = req.body;
        if (!citizenId || !schemeId) return res.status(400).json({ error: 'Citizen ID and Scheme ID required' });

        const citizen = citizens.get(citizenId);
        if (!citizen) return res.status(404).json({ error: 'Citizen not found' });

        const scheme = schemes.get(schemeId);
        if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

        const id = `APP${String(applications.size + 1).padStart(3, '0')}`;
        const application = {
            id, citizenId, schemeId, type, status: 'pending',
            documents: (appDocs || scheme.documents || []).map(d => ({ name: d, verified: false })),
            officerId: null, remarks: [],
            timeline: [{ date: new Date().toISOString(), action: 'Application Submitted', by: 'System', status: 'completed' }],
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        applications.set(id, application);
        res.status(201).json(application);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/applications/:id', requireAuth, (req, res) => {
    const app = applications.get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const citizen = citizens.get(app.citizenId);
    const scheme = schemes.get(app.schemeId);
    const officer = officials.get(app.officerId);
    const dept = scheme ? departments.get(scheme.departmentId) : null;

    res.json({ ...app, citizen, scheme, officer, department: dept });
});

app.put('/api/applications/:id', requireAuth, requireRole('admin', 'officer'), (req, res) => {
    const app = applications.get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const { remarks, documents, officerId } = req.body;
    const updated = { ...app, updatedAt: new Date().toISOString() };
    if (remarks) updated.remarks = [...(app.remarks || []), ...remarks];
    if (documents) updated.documents = documents;
    if (officerId) updated.officerId = officerId;
    if (req.body.status) updated.status = req.body.status;

    applications.set(req.params.id, updated);
    res.json(updated);
});

app.post('/api/applications/:id/approve', requireAuth, requireRole('admin', 'officer'), (req, res) => {
    const app = applications.get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const updated = {
        ...app, status: 'approved',
        approvedAt: new Date().toISOString(),
        approvalDetails: { approvedBy: req.user.email, ...req.body },
        updatedAt: new Date().toISOString(),
        timeline: [...(app.timeline || []), { date: new Date().toISOString(), action: 'Application Approved', by: req.user.email, status: 'completed' }]
    };
    applications.set(req.params.id, updated);
    res.json(updated);
});

app.post('/api/applications/:id/reject', requireAuth, requireRole('admin', 'officer'), (req, res) => {
    const app = applications.get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const { reason } = req.body;
    const updated = {
        ...app, status: 'rejected', rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [...(app.timeline || []), { date: new Date().toISOString(), action: 'Application Rejected', by: req.user.email, status: 'completed' }]
    };
    applications.set(req.params.id, updated);
    res.json(updated);
});

// ============== DOCUMENTS ==============

app.get('/api/documents/verify/:type/:number', requireAuth, (req, res) => {
    const { type, number } = req.params;

    // Simulated document verification
    const verificationResults = {
        aadhaar: { valid: true, masked: `XXXX-XXXX-${number.slice(-4)}`, name: 'Ramesh Kumar', dob: '1965-03-15', gender: 'M', linkedPhone: true, linkedBank: true },
        pan: { valid: true, masked: `XXXXX${number.slice(-4)}`, name: 'Mohammad Arif', fatherName: 'Abdul Karim', dob: '1985-11-08', status: 'Active' },
        voterid: { valid: true, name: 'Sunita Devi', assemblyConstituency: 'Ward 12', parliamentaryConstituency: 'Lucknow', status: 'Active' },
        rationcard: { valid: true, cardNo: number, holderName: 'Lakshmi Gupta', familyMembers: 2, fairPriceShop: 'FPS-UP-1234', status: 'Active' }
    };

    const result = verificationResults[type.toLowerCase()];
    if (!result) return res.status(404).json({ error: 'Document type not supported or not found' });

    res.json({ type, number, verification: result, verifiedAt: new Date().toISOString(), verifiedBy: 'Government OS' });
});

app.post('/api/documents/verify', requireAuth, (req, res) => {
    const { type, number, name, dob } = req.body;
    if (!type || !number) return res.status(400).json({ error: 'Document type and number required' });

    // Cross-reference verification
    const result = {
        type, number,
        verified: true,
        crossReferenced: {
            aadhaarMatch: true,
            bankMatch: true,
            phoneMatch: true
        },
        riskScore: 15, // Low risk
        flags: [],
        verifiedAt: new Date().toISOString()
    };

    res.json(result);
});

// ============== APPOINTMENTS ==============

app.get('/api/appointments', requireAuth, (req, res) => {
    const list = [...appointments.values()];
    const { citizenId, officerId, status, date } = req.query;

    let filtered = list;
    if (citizenId) filtered = filtered.filter(a => a.citizenId === citizenId);
    if (officerId) filtered = filtered.filter(a => a.officerId === officerId);
    if (status) filtered = filtered.filter(a => a.status === status);
    if (date) filtered = filtered.filter(a => a.date.split('T')[0] === date);

    res.json({ appointments: filtered, total: filtered.length });
});

app.post('/api/appointments', requireAuth, (req, res) => {
    try {
        const { citizenId, officerId, departmentId, date, time, purpose, type = 'in_person' } = req.body;
        if (!citizenId || !departmentId || !date) return res.status(400).json({ error: 'Citizen ID, Department ID and date required' });

        const id = `APPT${String(appointments.size + 1).padStart(4, '0')}`;
        const appointment = {
            id, citizenId, officerId, departmentId, date, time, purpose, type, status: 'scheduled',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        appointments.set(id, appointment);
        res.status(201).json(appointment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/appointments/:id', requireAuth, (req, res) => {
    const appt = appointments.get(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appt);
});

app.put('/api/appointments/:id', requireAuth, (req, res) => {
    const appt = appointments.get(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const updated = { ...appt, ...req.body, id: appt.id, updatedAt: new Date().toISOString() };
    appointments.set(req.params.id, updated);
    res.json(updated);
});

// ============== OFFICIALS ==============

app.get('/api/officials', requireAuth, (req, res) => {
    const list = [...officials.values()].map(o => {
        const dept = departments.get(o.departmentId);
        return { ...o, departmentName: dept?.name };
    });
    res.json({ officials: list, total: list.length });
});

app.post('/api/officials', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const { name, designation, departmentId, aadhaar, phone, email, address, role = 'reviewer' } = req.body;
        if (!name || !designation || !departmentId) return res.status(400).json({ error: 'Name, designation and department required' });

        const id = `OFF${String(officials.size + 1).padStart(3, '0')}`;
        const official = { id, name, designation, departmentId, aadhaar, phone, email, address, role, assignedApplications: [], status: 'active', createdAt: new Date().toISOString() };
        officials.set(id, official);
        res.status(201).json(official);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/officials/:id', requireAuth, (req, res) => {
    const official = officials.get(req.params.id);
    if (!official) return res.status(404).json({ error: 'Official not found' });

    const dept = departments.get(official.departmentId);
    const apps = [...applications.values()].filter(a => a.officerId === official.id);
    res.json({ ...official, department: dept, assignedApplications: apps });
});

app.put('/api/officials/:id', requireAuth, requireRole('admin'), (req, res) => {
    const official = officials.get(req.params.id);
    if (!official) return res.status(404).json({ error: 'Official not found' });

    const updated = { ...official, ...req.body, id: official.id, updatedAt: new Date().toISOString() };
    officials.set(req.params.id, updated);
    res.json(updated);
});

// ============== ANALYTICS ==============

app.get('/api/analytics/dashboard', requireAuth, (req, res) => {
    const allApps = [...applications.values()];
    const allCitizens = [...citizens.values()];

    const byStatus = {
        pending: allApps.filter(a => a.status === 'pending').length,
        under_review: allApps.filter(a => a.status === 'under_review').length,
        pending_documents: allApps.filter(a => a.status === 'pending_documents').length,
        approved: allApps.filter(a => a.status === 'approved').length,
        rejected: allApps.filter(a => a.status === 'rejected').length
    };

    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.toISOString().slice(0, 7);
        const count = allApps.filter(a => a.submittedAt.startsWith(month)).length;
        monthlyTrend.push({ month, applications: count });
    }

    res.json({
        overview: {
            totalCitizens: allCitizens.length,
            totalApplications: allApps.length,
            totalSchemes: schemes.size,
            totalDepartments: departments.size,
            activeOfficials: [...officials.values()].filter(o => o.status === 'active').length
        },
        applicationStatus: byStatus,
        approvalRate: allApps.length > 0 ? ((byStatus.approved / allApps.length) * 100).toFixed(1) : 0,
        rejectionRate: allApps.length > 0 ? ((byStatus.rejected / allApps.length) * 100).toFixed(1) : 0,
        pendingRate: ((byStatus.pending + byStatus.under_review) / allApps.length * 100).toFixed(1),
        monthlyTrend,
        recentApplications: allApps.slice(-5).reverse().map(a => {
            const citizen = citizens.get(a.citizenId);
            const scheme = schemes.get(a.schemeId);
            return { id: a.id, citizenName: citizen?.name, schemeName: scheme?.name, status: a.status, submittedAt: a.submittedAt };
        })
    });
});

app.get('/api/analytics/schemes', requireAuth, (req, res) => {
    const allApps = [...applications.values()];
    const allSchemes = [...schemes.values()];

    const stats = allSchemes.map(s => {
        const schemeApps = allApps.filter(a => a.schemeId === s.id);
        return {
            id: s.id, name: s.name, category: s.category,
            totalApplications: schemeApps.length,
            approved: schemeApps.filter(a => a.status === 'approved').length,
            rejected: schemeApps.filter(a => a.status === 'rejected').length,
            pending: schemeApps.filter(a => ['pending', 'under_review'].includes(a.status)).length,
            approvalRate: schemeApps.length > 0 ? ((schemeApps.filter(a => a.status === 'approved').length / schemeApps.length) * 100).toFixed(1) : 0
        };
    }).sort((a, b) => b.totalApplications - a.totalApplications);

    res.json({ schemeStats: stats });
});

app.get('/api/analytics/departments', requireAuth, (req, res) => {
    const allApps = [...applications.values()];
    const allDepts = [...departments.values()];

    const stats = allDepts.map(d => {
        const deptSchemes = [...schemes.values()].filter(s => s.departmentId === d.id);
        const deptApps = allApps.filter(a => {
            const scheme = schemes.get(a.schemeId);
            return scheme && scheme.departmentId === d.id;
        });
        const deptOfficials = [...officials.values()].filter(o => o.departmentId === d.id);

        return {
            id: d.id, name: d.name, code: d.code,
            totalApplications: deptApps.length,
            approved: deptApps.filter(a => a.status === 'approved').length,
            pending: deptApps.filter(a => ['pending', 'under_review'].includes(a.status)).length,
            schemes: deptSchemes.length,
            officials: deptOfficials.length
        };
    });

    res.json({ departmentStats: stats });
});

// ============== RTMN LAYER INTEGRATION ==============

app.get('/api/layers', (req, res) => {
    res.json({
        service: 'Government OS',
        integration: 'RTMN Layer 15 - Consumer Network',
        layers: [
            { id: 1, name: 'Intelligence', status: 'available', endpoint: '/api/analytics/dashboard' },
            { id: 2, name: 'Customer Growth', status: 'available', endpoint: '/api/citizens' },
            { id: 3, name: 'Commerce', status: 'available', endpoint: '/api/applications' },
            { id: 4, name: 'Financial', status: 'available', endpoint: '/api/schemes' },
            { id: 5, name: 'Workforce', status: 'available', endpoint: '/api/officials' },
            { id: 6, name: 'Legal & Trust', status: 'available', endpoint: '/api/documents/verify' },
            { id: 7, name: 'Property', status: 'available', endpoint: '/api/citizens' },
            { id: 8, name: 'Health', status: 'available', endpoint: '/api/citizens' },
            { id: 9, name: 'Mobility', status: 'available', endpoint: '/api/appointments' },
            { id: 10, name: 'Identity', status: 'available', endpoint: '/api/documents/verify' },
            { id: 11, name: 'Memory', status: 'available', endpoint: '/api/analytics/dashboard' },
            { id: 12, name: 'Twins', status: 'available', endpoint: '/api/citizens' },
            { id: 13, name: 'Automation', status: 'available', endpoint: '/api/applications' },
            { id: 14, name: 'Autonomous', status: 'available', endpoint: '/api/analytics' },
            { id: 15, name: 'Network', status: 'available', endpoint: '/api/layers' }
        ]
    });
});

app.get('/api/layer/:id', (req, res) => {
    const layerId = parseInt(req.params.id);
    const layerMap = {
        1: { name: 'Intelligence', services: ['Analytics Dashboard', 'Trend Analysis', 'Predictive Models'] },
        2: { name: 'Customer Growth', services: ['Citizen Registry', 'Engagement Tracking'] },
        3: { name: 'Commerce', services: ['Application Processing', 'Scheme Benefits'] },
        4: { name: 'Financial', services: ['Benefit Disbursement', 'Budget Allocation'] },
        5: { name: 'Workforce', services: ['Official Management', 'Department Admin'] },
        6: { name: 'Legal & Trust', services: ['Document Verification', 'Compliance'] },
        7: { name: 'Property', services: ['Land Records', 'Ownership Verification'] },
        8: { name: 'Health', services: ['Health Records', 'Insurance'] },
        9: { name: 'Mobility', services: ['Appointment Scheduling', 'Field Visits'] },
        10: { name: 'Identity', services: ['Aadhaar Verification', 'Biometric Auth'] },
        11: { name: 'Memory', services: ['Application History', 'Citizen Profile'] },
        12: { name: 'Twins', services: ['Citizen Digital Twin', 'Scheme Digital Twin'] },
        13: { name: 'Automation', services: ['Auto Routing', 'Status Updates'] },
        14: { name: 'Autonomous', services: ['Auto Approval', 'Fraud Detection'] },
        15: { name: 'Network', services: ['Cross-Department', 'RTMN Integration'] }
    };

    const layer = layerMap[layerId];
    if (!layer) return res.status(404).json({ error: 'Layer not found' });

    res.json({ layerId, ...layer });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start
initializeSampleData();

app.listen(PORT, () => {
    console.log(`Government OS running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API docs: http://localhost:${PORT}/`);
});

module.exports = app;
