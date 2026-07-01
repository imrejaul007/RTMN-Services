/**
 * ProcurementOS - Contract Management
 */
import { Router } from 'express';
const router = Router();

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  type: 'master_service' | 'rate_card' | 'nda' | 'sow' | 'framework';
  supplierId: string;
  supplierName: string;
  value: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  renewal: 'auto' | 'manual' | 'none';
  renewalDays: number;
  status: 'draft' | 'active' | 'expiring' | 'expired' | 'terminated';
  terms: ContractTerm[];
  clauses: Clause[];
  deliverables: Deliverable[];
  milestones: Milestone[];
  amendments: Amendment[];
  documents: ContractDoc[];
  createdBy: string;
  approvedBy?: string;
  signedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractTerm {
  id: string;
  name: string;
  description: string;
  type: 'payment' | 'delivery' | 'quality' | 'termination' | 'confidentiality';
  value?: string;
}

export interface Clause {
  id: string;
  title: string;
  content: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  riskReason?: string;
  suggestedModification?: string;
  accepted: boolean;
}

export interface Deliverable {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  completed: number;
  pending: number;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  amount: number;
  status: 'pending' | 'completed' | 'invoiced';
  completedAt?: Date;
}

export interface Amendment {
  id: string;
  number: string;
  type: 'scope' | 'pricing' | 'timeline' | 'terms';
  description: string;
  effectiveDate: Date;
  approvedBy?: string;
  createdAt: Date;
}

export interface ContractDoc {
  id: string;
  name: string;
  type: 'contract' | 'sow' | 'nda' | 'sla' | 'amendment' | 'renewal';
  url: string;
  version: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface VendorRisk {
  id: string;
  supplierId: string;
  supplierName: string;
  financial: { score: number; factors: string[] };
  operational: { score: number; factors: string[] };
  compliance: { score: number; factors: string[] };
  reputational: { score: number; factors: string[] };
  overall: number;
  tier: 'A' | 'B' | 'C' | 'D';
  controls: RiskControl[];
  assessments: Assessment[];
  nextReview: Date;
  status: 'active' | 'review_required' | 'approved';
  updatedAt: Date;
}

export interface RiskControl {
  control: string;
  description: string;
  evidence?: string;
  status: 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_applicable';
  lastTestDate?: Date;
}

export interface Assessment {
  date: Date;
  type: 'financial' | 'operational' | 'compliance' | 'full';
  score: number;
  assessor: string;
  findings: string[];
  recommendations: string[];
}

export interface SpendAnalytics {
  category: string;
  period: string;
  totalSpend: number;
  budget?: number;
  variance: number;
  topSuppliers: SupplierSpend[];
  byMonth: MonthlySpend[];
  contracts: ContractSpend[];
  savings: SavingsRecord[];
}

export interface SupplierSpend {
  supplierId: string;
  supplierName: string;
  spend: number;
  orders: number;
  avgOrderValue: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface MonthlySpend {
  month: string;
  planned: number;
  actual: number;
  variance: number;
}

export interface ContractSpend {
  contractId: string;
  contractNumber: string;
  supplierId: string;
  supplierName: string;
  committed: number;
  utilized: number;
  remaining: number;
}

export interface SavingsRecord {
  id: string;
  type: 'price_reduction' | 'volume_discount' | 'payment_terms' | 'efficiency';
  category: string;
  amount: number;
  contractId?: string;
  achievedAt: Date;
  verifiedBy?: string;
}

export interface ApprovalWorkflow {
  id: string;
  type: 'po' | 'contract' | 'supplier' | 'payment' | 'rfq';
  referenceId: string;
  referenceNumber: string;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  currentLevel: number;
  levels: ApprovalLevel[];
  requestedBy: string;
  requestedAt: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  comments?: string;
}

export interface ApprovalLevel {
  level: number;
  approverId: string;
  approverName: string;
  approverRole: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comments?: string;
  approvedAt?: Date;
}

const contracts = new Map<string, Contract>();
const risks = new Map<string, VendorRisk>();
const analytics = new Map<string, SpendAnalytics>();
const approvals = new Map<string, ApprovalWorkflow[]>();

// Routes
router.post('/contracts', (req, res) => {
  const c: Contract = { id: crypto.randomUUID(), contractNumber: `CNT-${Date.now()}`, status: 'draft', terms: [], clauses: [], deliverables: [], milestones: [], amendments: [], documents: [], createdAt: new Date(), updatedAt: new Date(), ...req.body };
  contracts.set(c.id, c);
  res.status(201).json({ success: true, contract: c });
});

router.get('/contracts', (req, res) => {
  let r = Array.from(contracts.values());
  if (req.query.status) r = r.filter(c => c.status === req.query.status);
  res.json({ success: true, contracts: r });
});

router.get('/contracts/:id', (req, res) => {
  const c = contracts.get(req.params.id);
  c ? res.json({ success: true, contract: c }) : res.status(404).json({ error: 'Contract not found' });
});

router.patch('/contracts/:id/renew', (req, res) => {
  const c = contracts.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contract not found' });
  c.endDate = new Date(c.endDate.getTime() + 365 * 86400000);
  c.status = 'active';
  contracts.set(req.params.id, c);
  res.json({ success: true, contract: c });
});

router.post('/risks', (req, res) => {
  const r: VendorRisk = { id: crypto.randomUUID(), overall: 50, tier: 'B', controls: [], assessments: [], nextReview: new Date(), status: 'pending_review', updatedAt: new Date(), ...req.body };
  risks.set(r.supplierId, r);
  res.status(201).json({ success: true, risk: r });
});

router.get('/risks', (req, res) => res.json({ success: true, risks: Array.from(risks.values()) }));

router.get('/analytics/spend', (req, res) => {
  const { period } = req.query;
  const data = Array.from(analytics.values()).find(a => a.period === period) || { category: 'All', period: period as string, totalSpend: 0, topSuppliers: [], byMonth: [], contracts: [], savings: [] };
  res.json({ success: true, analytics: data });
});

router.post('/approvals', (req, res) => {
  const a: ApprovalWorkflow = { id: crypto.randomUUID(), levels: [], status: 'pending', currentLevel: 1, requestedAt: new Date(), ...req.body };
  const existing = approvals.get(a.type) || [];
  existing.push(a);
  approvals.set(a.type, existing);
  res.status(201).json({ success: true, approval: a });
});

router.get('/approvals/:type', (req, res) => res.json({ success: true, approvals: approvals.get(req.params.type) || [] }));

router.patch('/approvals/:type/:id', (req, res) => {
  const list = approvals.get(req.params.type) || [];
  const a = list.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Approval not found' });
  Object.assign(a, req.body);
  if (req.body.status === 'approved' || req.body.status === 'rejected') a.resolvedAt = new Date();
  approvals.set(req.params.type, list);
  res.json({ success: true, approval: a });
});

export default router;
</parameter>
