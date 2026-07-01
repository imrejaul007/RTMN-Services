/**
 * LegalOS - Contract Intelligence & Compliance
 *
 * Legal operations platform
 * Inspired by: Ironclad + DocuSign + LawGeex + GDPR Pro
 *
 * Modules:
 * - Contract Lifecycle
 * - Compliance Engine
 * - Document Management
 * - AI Review
 * - Risk Assessment
 * - Multi-jurisdiction
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface Contract {
  id: string;
  title: string;
  type: 'nda' | 'msa' | 'sow' | 'lease' | 'employment' | 'vendor' | 'customer' | 'partnership';
  status: 'draft' | 'review' | 'negotiation' | 'pending_signature' | 'active' | 'expiring' | 'expired' | 'terminated';

  parties: Party[];
  value?: { amount: number; currency: string };

  // Lifecycle
  effectiveDate?: Date;
  expirationDate?: Date;
  renewal: 'auto' | 'manual' | 'none';

  // Clauses
  clauses: Clause[];

  // Signatures
  signatures: Signature[];

  // Metadata
  jurisdiction?: string;
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface Party {
  name: string;
  email: string;
  role: 'requestor' | 'signer' | 'witness' | 'approver';
  signed: boolean;
  signedAt?: Date;
}

export interface Clause {
  id: string;
  title: string;
  content: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskReason?: string;
  suggestedModification?: string;
  accepted?: boolean;
}

export interface Signature {
  party: string;
  signed: boolean;
  signedAt?: Date;
  signedDoc?: string;
  ip?: string;
}

// ============================================================
// COMPLIANCE TYPES
// ============================================================

export interface ComplianceRequirement {
  id: string;
  regulation: 'gdpr' | 'hipaa' | 'pci_dss' | 'soc2' | 'iso27001' | 'custom';
  type: 'data_handling' | 'retention' | 'access_control' | 'audit' | 'reporting';
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';

  controls: Control[];
  evidence?: string;
  nextAudit?: Date;
  risk: 'low' | 'medium' | 'high';
}

export interface Control {
  id: string;
  name: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'not_tested';
  evidence?: string;
  findings?: string;
  remediation?: string;
  dueDate?: Date;
}

// ============================================================
// DOCUMENT TYPES
// ============================================================

export interface LegalDocument {
  id: string;
  title: string;
  type: 'contract' | 'policy' | 'certificate' | 'approval' | 'correspondence';
  status: 'draft' | 'review' | 'approved' | 'archived';

  content?: string;
  attachments: string[];

  metadata: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// STORAGE
// ============================================================

const contracts = new Map<string, Contract>();
const compliance = new Map<string, ComplianceRequirement>();
const documents = new Map<string, LegalDocument>();

// ============================================================
// CONTRACT ROUTES
// ============================================================

router.post('/contracts', async (req, res) => {
  try {
    const contract: Contract = {
      id: crypto.randomUUID(),
      title: req.body.title || 'New Contract',
      type: req.body.type || 'vendor',
      status: 'draft',
      parties: req.body.parties || [],
      value: req.body.value,
      renewal: req.body.renewal || 'manual',
      clauses: [],
      signatures: [],
      tags: req.body.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    contracts.set(contract.id, contract);
    res.status(201).json({ success: true, contract });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/contracts', async (req, res) => {
  try {
    const { status, type } = req.query;
    let result = Array.from(contracts.values());

    if (status) result = result.filter(c => c.status === status);
    if (type) result = result.filter(c => c.type === type);

    res.json({ success: true, contracts: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/contracts/:id', async (req, res) => {
  try {
    const contract = contracts.get(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    res.json({ success: true, contract });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/contracts/:id/review', async (req, res) => {
  try {
    const contract = contracts.get(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    // AI clause analysis
    contract.clauses = analyzeClauses(req.body.content || contract.clauses[0]?.content || '');
    contract.status = 'review';
    contract.updatedAt = new Date();

    contracts.set(req.params.id, contract);
    res.json({ success: true, contract });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/contracts/:id/sign', async (req, res) => {
  try {
    const { party, signedDoc } = req.body;
    const contract = contracts.get(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    const sig = contract.signatures.find(s => s.party === party);
    if (sig) {
      sig.signed = true;
      sig.signedAt = new Date();
      sig.signedDoc = signedDoc;
    }

    // Check if all signed
    const allSigned = contract.signatures.every(s => s.signed);
    if (allSigned) contract.status = 'active';

    contract.updatedAt = new Date();
    contracts.set(req.params.id, contract);
    res.json({ success: true, contract });
  } catch (error: any) {
    res.status(500).json({ status: false, error: error.message });
  }
});

// ============================================================
// COMPLIANCE ROUTES
// ============================================================

router.post('/compliance/audit', async (req, res) => {
  try {
    const { regulation } = req.body;

    const requirement: ComplianceRequirement = {
      id: crypto.randomUUID(),
      regulation: regulation || 'gdpr',
      type: 'data_handling',
      status: 'partial',
      controls: generateControls(regulation),
      risk: 'medium',
    };

    compliance.set(requirement.id, requirement);
    res.status(201).json({ success: true, requirement });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/compliance/dashboard', async (req, res) => {
  try {
    const all = Array.from(compliance.values());

    const summary = {
      total: all.length,
      compliant: all.filter(c => c.status === 'compliant').length,
      partial: all.filter(c => c.status === 'partial').length,
      nonCompliant: all.filter(c => c.status === 'non_compliant').length,
      highRisk: all.filter(c => c.risk === 'high').length,
    };

    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function analyzeClauses(content: string): Clause[] {
  const clauses: Clause[] = [];

  const risks = [
    { keyword: 'unlimited liability', level: 'critical' as const, reason: 'Unlimited financial exposure' },
    { keyword: '90 days', level: 'high' as const, reason: 'Long payment terms' },
    { keyword: 'auto-renewal', level: 'medium' as const, reason: 'Continuous obligation' },
    { keyword: 'indemnify', level: 'high' as const, reason: 'Legal obligation' },
  ];

  for (const risk of risks) {
    if (content.toLowerCase().includes(risk.keyword)) {
      clauses.push({
        id: crypto.randomUUID(),
        title: `Risk: ${risk.keyword}`,
        content: risk.keyword,
        riskLevel: risk.level,
        riskReason: risk.reason,
      });
    }
  }

  return clauses;
}

function generateControls(regulation: string): Control[] {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Access Control',
      description: 'Control who accesses data',
      status: 'compliant',
    },
    {
      id: crypto.randomUUID(),
      name: 'Data Encryption',
      description: 'Encrypt data at rest and in transit',
      status: 'compliant',
    },
    {
      id: crypto.randomUUID(),
      name: 'Audit Logging',
      description: 'Log all data access',
      status: 'not_tested',
    },
  ];
}

export default router;
