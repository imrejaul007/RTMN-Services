/**
 * ProcurementOS - Supplier Management
 * Complete vendor lifecycle management
 */
import { Router } from 'express';
const router = Router();

export interface Supplier {
  id: string;
  code: string;
  name: string;
  type: 'manufacturer' | 'distributor' | 'service' | 'freelancer';
  category: string[];
  subcategory?: string[];
  email: string;
  phone: string;
  website?: string;
  address: Address;
  gstin?: string;
  pan?: string;
  tan?: string;

  // Contacts
  primaryContact: Contact;
  contacts: Contact[];

  // Banking
  bank: BankInfo;

  // Rating & Risk
  rating: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';

  // Compliance
  documents: ComplianceDoc[];
  certifications: string[];
  verified: boolean;
  kybStatus: 'pending' | 'in_review' | 'approved' | 'rejected';

  // Business
  paymentTerms: number;
  creditLimit: number;
  taxRate: number;

  // Stats
  totalOrders: number;
  totalValue: number;
  onTimeDelivery: number;
  qualityScore: number;

  // Status
  status: 'active' | 'inactive' | 'blocked' | 'blacklisted';
  blockedReason?: string;
  blockedAt?: Date;
  blockedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  landmark?: string;
}

export interface Contact {
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  designation: string;
  department?: string;
  isPrimary: boolean;
  whatsapp?: string;
}

export interface BankInfo {
  accountName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  branchAddress?: string;
  cancelledCheque?: string;
  accountType: 'savings' | 'current';
}

export interface ComplianceDoc {
  type: 'gst_certificate' | 'pan_card' | 'address_proof' | 'msme' | 'toggle_contract' | 'quality_cert';
  documentId: string;
  url: string;
  uploadedAt: Date;
  expiryDate?: Date;
  status: 'valid' | 'expiring' | 'expired';
}

export interface SupplierCapability {
  category: string;
  products: string[];
  capacity: number;
  currentLoad: number;
  certifications: string[];
}

export interface SupplierPerformance {
  supplierId: string;
  period: string;

  quality: { score: number; defects: number; returns: number };
  delivery: { onTime: number; late: number; avgDays: number };
  cost: { competitiveness: number; priceStability: number };
  communication: { responsiveness: number; clarity: number };
  compliance: { documents: number; renewals: number };

  overallScore: number;
  recommendation: 'approved' | 'probation' | 'terminated';
}

export interface SupplierOnboarding {
  id: string;
  supplierId: string;
  status: 'kyb_pending' | 'documents_pending' | 'evaluation' | 'approval_pending' | 'onboarding' | 'completed';

  kybChecks: KYBCheck[];
  documents: DocumentCheck[];
  evaluation?: VendorEvaluation;

  assignedTo?: string;
  dueDate: Date;
  completedAt?: Date;

  createdAt: Date;
}

export interface KYBCheck {
  check: string;
  status: 'pending' | 'passed' | 'failed';
  evidence?: string;
  verifiedAt?: Date;
}

export interface DocumentCheck {
  type: string;
  required: boolean;
  status: 'pending' | 'submitted' | 'verified' | 'rejected';
  document?: string;
  submittedAt?: Date;
}

export interface VendorEvaluation {
  questionnaire: EvaluationQuestion[];
  capabilityAssessment: CapabilityAssessment[];
  riskAssessment: RiskAssessment;
  overallRecommendation: 'approve' | 'approve_with_terms' | 'reject';
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
}

export interface EvaluationQuestion {
  category: string;
  question: string;
  response?: string;
  weight: number;
  score?: number;
}

export interface CapabilityAssessment {
  category: string;
  rating: number;
  comments?: string;
}

export interface RiskAssessment {
  financial: number;
  operational: number;
  compliance: number;
  reputational: number;
  overall: number;
}

const suppliers = new Map<string, Supplier>();
const capabilities = new Map<string, SupplierCapability[]>();
const performances = new Map<string, SupplierPerformance[]>();
const onboardings = new Map<string, SupplierOnboarding>();

// Initialize sample suppliers
function initSampleData() {
  const sample: Supplier = {
    id: 'SUP001',
    code: 'SUP-ACME-001',
    name: 'Acme Supplies Pvt Ltd',
    type: 'distributor',
    category: ['Industrial', 'Electronics'],
    email: 'orders@acme-supplies.com',
    phone: '+91 9876543210',
    address: { line1: '123 Industrial Area', city: 'Bangalore', state: 'Karnataka', pincode: '560001', country: 'India' },
    gstin: '29AABCU9603R1ZM',
    primaryContact: { name: 'Rajesh Kumar', email: 'rajesh@acme.com', designation: 'Sales Manager', isPrimary: true },
    contacts: [],
    bank: { accountName: 'Acme Supplies Pvt Ltd', accountNumber: '1234567890', bankName: 'HDFC Bank', ifscCode: 'HDFC0001234', accountType: 'current' },
    rating: 4.5,
    riskScore: 15,
    riskLevel: 'low',
    documents: [
      { type: 'gst_certificate', documentId: 'DOC001', url: '/docs/gst.pdf', uploadedAt: new Date(), status: 'valid' },
    ],
    certifications: ['ISO 9001', 'ISO 14001'],
    verified: true,
    kybStatus: 'approved',
    paymentTerms: 30,
    creditLimit: 500000,
    taxRate: 18,
    totalOrders: 156,
    totalValue: 4500000,
    onTimeDelivery: 94,
    qualityScore: 96,
    status: 'active',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
  };
  suppliers.set(sample.id, sample);
}
initSampleData();

router.post('/suppliers', (req, res) => {
  const s: Supplier = {
    id: crypto.randomUUID(),
    code: `SUP-${Date.now()}`,
    ...req.body,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  suppliers.set(s.id, s);
  res.status(201).json({ success: true, supplier: s });
});

router.get('/suppliers', (req, res) => {
  const { status, category, riskLevel } = req.query;
  let result = Array.from(suppliers.values());
  if (status) result = result.filter(s => s.status === status);
  if (category) result = result.filter(s => s.category.includes(category as string));
  if (riskLevel) result = result.filter(s => s.riskLevel === riskLevel);
  res.json({ success: true, suppliers: result, count: result.length });
});

router.get('/suppliers/:id', (req, res) => {
  const s = suppliers.get(req.params.id);
  if (!s) return res.status(404).json({ success: false, error: 'Supplier not found' });
  const caps = capabilities.get(s.id) || [];
  const perfs = performances.get(s.id) || [];
  res.json({ success: true, supplier: s, capabilities: caps, performances: perfs });
});

router.patch('/suppliers/:id', (req, res) => {
  const s = suppliers.get(req.params.id);
  if (!s) return res.status(404).json({ success: false, error: 'Supplier not found' });
  Object.assign(s, req.body, { updatedAt: new Date() });
  suppliers.set(req.params.id, s);
  res.json({ success: true, supplier: s });
});

router.post('/suppliers/:id/block', (req, res) => {
  const s = suppliers.get(req.params.id);
  if (!s) return res.status(404).json({ success: false, error: 'Supplier not found' });
  s.status = 'blocked';
  s.blockedReason = req.body.reason;
  s.blockedAt = new Date();
  s.blockedBy = req.body.blockedBy || 'system';
  s.updatedAt = new Date();
  suppliers.set(req.params.id, s);
  res.json({ success: true, supplier: s });
});

router.post('/suppliers/:id/rate', (req, res) => {
  const s = suppliers.get(req.params.id);
  if (!s) return res.status(404).json({ success: false, error: 'Supplier not found' });
  const perf: SupplierPerformance = {
    supplierId: req.params.id,
    period: req.body.period || new Date().toISOString().slice(0, 7),
    ...req.body.performance,
    overallScore: req.body.performance?.quality?.score || 0,
    recommendation: 'approved',
  };
  const existing = performances.get(req.params.id) || [];
  existing.push(perf);
  performances.set(req.params.id, existing);
  res.json({ success: true, performance: perf });
});

router.get('/suppliers/:id/performance', (req, res) => {
  const perfs = performances.get(req.params.id) || [];
  const { period } = req.query;
  let result = perfs;
  if (period) result = result.filter(p => p.period === period as string);
  res.json({ success: true, performances: result });
});

router.post('/suppliers/:id/capabilities', (req, res) => {
  const caps: SupplierCapability = { ...req.body };
  const existing = capabilities.get(req.params.id) || [];
  existing.push(caps);
  capabilities.set(req.params.id, existing);
  res.status(201).json({ success: true, capability: caps });
});

router.get('/suppliers/ratings', (req, res) => {
  const all = Array.from(suppliers.values()).filter(s => s.status === 'active');
  const avg = all.length > 0 ? all.reduce((s, s) => s.rating + s, 0) / all.length : 0;
  const distribution = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  all.forEach(s => {
    const bucket = Math.floor(s.rating) || 0;
    if (bucket >= 5) distribution['5']++;
    else if (bucket >= 4) distribution['4']++;
    else if (bucket >= 3) distribution['3']++;
    else if (bucket >= 2) distribution['2']++;
    else distribution['1']++;
  });
  res.json({ success: true, avgRating: avg.toFixed(2), distribution, total: all.length });
});

export default router;
</parameter>
