/**
 * Compliance Routes
 * Compliance Checking & Risk Assessment API Endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory compliance records
const complianceChecks: Map<string, any> = new Map();
const riskAssessments: Map<string, any> = new Map();

// Supported regulations
const regulations: Map<string, any> = new Map([
  ['gdpr', {
    regulationId: 'gdpr',
    name: 'General Data Protection Regulation',
    jurisdiction: 'EU',
    category: 'privacy',
    requirements: [
      'Data minimization',
      'Purpose limitation',
      'Consent management',
      'Right to erasure',
      'Data portability',
      'Breach notification'
    ]
  }],
  ['india-pdpa', {
    regulationId: 'india-pdpa',
    name: 'India Personal Data Protection Act',
    jurisdiction: 'India',
    category: 'privacy',
    requirements: [
      'Consent',
      'Purpose limitation',
      'Data localization',
      'Right to correction',
      'Grievance redressal'
    ]
  }],
  ['kfcci', {
    regulationId: 'kfcci',
    name: 'Karnataka Fire & Civil Defense Guidelines',
    jurisdiction: 'India/Karnataka',
    category: 'safety',
    requirements: [
      'Fire safety equipment',
      'Emergency exits',
      'NOC certification',
      'Safety drills'
    ]
  }],
  ['fema', {
    regulationId: 'fema',
    name: 'Foreign Exchange Management Act',
    jurisdiction: 'India',
    category: 'finance',
    requirements: [
      'KYC verification',
      'Reporting requirements',
      'Transaction limits',
      'Documentation'
    ]
  }],
  ['companies-act', {
    regulationId: 'companies-act',
    name: 'Companies Act 2013',
    jurisdiction: 'India',
    category: 'corporate',
    requirements: [
      'Board meetings',
      'Annual returns',
      'Auditor appointment',
      'Related party transactions',
      'CSR compliance'
    ]
  }]
]);

// GET /api/compliance/checks - List compliance checks
router.get('/checks', (req: Request, res: Response) => {
  const { entityType, status, regulation, page = 1, limit = 20 } = req.query;

  let filteredChecks = Array.from(complianceChecks.values());

  if (entityType) {
    filteredChecks = filteredChecks.filter(c => c.entityType === entityType);
  }
  if (status) {
    filteredChecks = filteredChecks.filter(c => c.status === status);
  }
  if (regulation) {
    filteredChecks = filteredChecks.filter(c => c.regulationId === regulation);
  }

  const start = (Number(page) - 1) * Number(limit);
  const paginatedChecks = filteredChecks.slice(start, start + Number(limit));

  res.json({
    success: true,
    checks: paginatedChecks,
    total: filteredChecks.length,
    page: Number(page),
    limit: Number(limit)
  });
});

// GET /api/compliance/checks/:id - Get compliance check by ID
router.get('/checks/:id', (req: Request, res: Response) => {
  const check = complianceChecks.get(req.params.id);

  if (!check) {
    return res.status(404).json({ error: 'Compliance check not found' });
  }

  res.json({ success: true, check });
});

// POST /api/compliance/checks - Create new compliance check
router.post('/checks', (req: Request, res: Response) => {
  const { entityType, entityId, entityName, regulationId, checkType } = req.body;

  if (!entityType || !entityId || !regulationId) {
    return res.status(400).json({ error: 'Missing required fields: entityType, entityId, regulationId' });
  }

  const checkId = uuidv4();
  const regulation = regulations.get(regulationId);

  if (!regulation) {
    return res.status(400).json({ error: `Regulation ${regulationId} not found` });
  }

  const now = new Date().toISOString();

  // Generate requirements check
  const requirements = regulation.requirements.map((req: string) => ({
    requirement: req,
    status: 'pending',
    evidence: null,
    notes: null
  }));

  const newCheck = {
    checkId,
    entityType,
    entityId,
    entityName,
    regulationId,
    regulationName: regulation.name,
    checkType: checkType || 'full', // full, partial, spot
    status: 'in-progress',
    requirements,
    complianceScore: 0,
    riskLevel: 'unknown',
    findings: [],
    recommendations: [],
    checkedBy: 'ai-system',
    checkedAt: now,
    nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    createdAt: now,
    updatedAt: now
  };

  complianceChecks.set(checkId, newCheck);

  res.status(201).json({ success: true, check: newCheck });
});

// PATCH /api/compliance/checks/:id - Update compliance check
router.patch('/checks/:id', (req: Request, res: Response) => {
  const check = complianceChecks.get(req.params.id);

  if (!check) {
    return res.status(404).json({ error: 'Compliance check not found' });
  }

  const updates = req.body;

  // Recalculate score if requirements updated
  if (updates.requirements) {
    const compliantCount = updates.requirements.filter((r: any) => r.status === 'compliant').length;
    check.complianceScore = Math.round((compliantCount / updates.requirements.length) * 100);

    if (check.complianceScore >= 90) check.riskLevel = 'low';
    else if (check.complianceScore >= 70) check.riskLevel = 'medium';
    else if (check.complianceScore >= 50) check.riskLevel = 'high';
    else check.riskLevel = 'critical';
  }

  Object.assign(check, updates);
  check.updatedAt = new Date().toISOString();
  complianceChecks.set(req.params.id, check);

  res.json({ success: true, check });
});

// POST /api/compliance/checks/:id/requirements/:reqIndex - Update requirement
router.post('/checks/:id/requirements/:reqIndex', (req: Request, res: Response) => {
  const check = complianceChecks.get(req.params.id);

  if (!check) {
    return res.status(404).json({ error: 'Compliance check not found' });
  }

  const reqIndex = parseInt(req.params.reqIndex);
  const { status, evidence, notes } = req.body;

  if (reqIndex < 0 || reqIndex >= check.requirements.length) {
    return res.status(400).json({ error: 'Invalid requirement index' });
  }

  check.requirements[reqIndex] = {
    ...check.requirements[reqIndex],
    status: status || check.requirements[reqIndex].status,
    evidence,
    notes
  };

  // Recalculate score
  const compliantCount = check.requirements.filter((r: any) => r.status === 'compliant').length;
  check.complianceScore = Math.round((compliantCount / check.requirements.length) * 100);

  if (check.complianceScore >= 90) check.riskLevel = 'low';
  else if (check.complianceScore >= 70) check.riskLevel = 'medium';
  else if (check.complianceScore >= 50) check.riskLevel = 'high';
  else check.riskLevel = 'critical';

  check.status = check.requirements.every((r: any) => r.status !== 'pending') ? 'completed' : 'in-progress';
  check.updatedAt = new Date().toISOString();

  complianceChecks.set(req.params.id, check);

  res.json({ success: true, check });
});

// GET /api/compliance/risk-assessments - List risk assessments
router.get('/risk-assessments', (req: Request, res: Response) => {
  const { entityType, level, page = 1, limit = 20 } = req.query;

  let filteredAssessments = Array.from(riskAssessments.values());

  if (entityType) {
    filteredAssessments = filteredAssessments.filter(a => a.entityType === entityType);
  }
  if (level) {
    filteredAssessments = filteredAssessments.filter(a => a.overallRisk === level);
  }

  const start = (Number(page) - 1) * Number(limit);
  const paginatedAssessments = filteredAssessments.slice(start, start + Number(limit));

  res.json({
    success: true,
    assessments: paginatedAssessments,
    total: filteredAssessments.length
  });
});

// GET /api/compliance/risk-assessments/:id - Get risk assessment
router.get('/risk-assessments/:id', (req: Request, res: Response) => {
  const assessment = riskAssessments.get(req.params.id);

  if (!assessment) {
    return res.status(404).json({ error: 'Risk assessment not found' });
  }

  res.json({ success: true, assessment });
});

// POST /api/compliance/risk-assessments - Create risk assessment
router.post('/risk-assessments', (req: Request, res: Response) => {
  const { entityType, entityId, entityName, factors } = req.body;

  if (!entityType || !entityId) {
    return res.status(400).json({ error: 'Missing required fields: entityType, entityId' });
  }

  const assessmentId = uuidv4();
  const now = new Date().toISOString();

  // Calculate risk factors
  const riskFactors = factors || [
    { category: 'operational', score: 50, weight: 0.3, description: 'Operational processes' },
    { category: 'financial', score: 50, weight: 0.25, description: 'Financial health' },
    { category: 'regulatory', score: 50, weight: 0.25, description: 'Regulatory compliance' },
    { category: 'reputational', score: 50, weight: 0.2, description: 'Reputation and brand' }
  ];

  // Calculate weighted score
  const weightedScore = riskFactors.reduce((sum: number, f: any) => sum + (f.score * f.weight), 0);

  let overallRisk: string;
  if (weightedScore < 30) overallRisk = 'low';
  else if (weightedScore < 50) overallRisk = 'medium';
  else if (weightedScore < 70) overallRisk = 'high';
  else overallRisk = 'critical';

  const assessment = {
    assessmentId,
    entityType,
    entityId,
    entityName,
    riskFactors,
    overallScore: Math.round(weightedScore),
    overallRisk,
    status: 'completed',
    mitigations: [],
    nextReviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days
    createdAt: now
  };

  riskAssessments.set(assessmentId, assessment);

  res.status(201).json({ success: true, assessment });
});

// GET /api/compliance/regulations - List regulations
router.get('/regulations', (req: Request, res: Response) => {
  const { category, jurisdiction } = req.query;

  let filteredRegs = Array.from(regulations.values());

  if (category) {
    filteredRegs = filteredRegs.filter(r => r.category === category);
  }
  if (jurisdiction) {
    filteredRegs = filteredRegs.filter(r => r.jurisdiction === jurisdiction);
  }

  res.json({ success: true, regulations: filteredRegs });
});

// GET /api/compliance/regulations/:id - Get regulation details
router.get('/regulations/:id', (req: Request, res: Response) => {
  const regulation = regulations.get(req.params.id);

  if (!regulation) {
    return res.status(404).json({ error: 'Regulation not found' });
  }

  res.json({ success: true, regulation });
});

// POST /api/compliance/kyc - KYC verification
router.post('/kyc', (req: Request, res: Response) => {
  const { entityType, entityId, documents, verificationLevel } = req.body;

  if (!entityType || !entityId) {
    return res.status(400).json({ error: 'Missing required fields: entityType, entityId' });
  }

  const kycId = uuidv4();
  const now = new Date().toISOString();

  // Simulate KYC verification
  const kycRecord = {
    kycId,
    entityType,
    entityId,
    verificationLevel: verificationLevel || 'standard',
    status: 'pending',
    documents: documents || [],
    checks: {
      identity: 'pending',
      address: 'pending',
      pan: 'pending',
      aadhaar: 'pending',
      gstin: 'pending'
    },
    riskFlags: [],
    verifiedAt: null,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    createdAt: now
  };

  res.status(201).json({ success: true, kyc: kycRecord });
});

// GET /api/compliance/dashboard - Compliance dashboard
router.get('/dashboard', (req: Request, res: Response) => {
  const checks = Array.from(complianceChecks.values());
  const assessments = Array.from(riskAssessments.values());

  const stats = {
    totalChecks: checks.length,
    compliantChecks: checks.filter(c => c.riskLevel === 'low').length,
    nonCompliantChecks: checks.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').length,
    pendingChecks: checks.filter(c => c.status === 'in-progress').length,
    totalAssessments: assessments.length,
    criticalRisks: assessments.filter(a => a.overallRisk === 'critical').length,
    highRisks: assessments.filter(a => a.overallRisk === 'high').length
  };

  res.json({
    success: true,
    stats,
    recentChecks: checks.slice(-5).reverse(),
    atRiskEntities: assessments.filter(a => a.overallRisk === 'critical' || a.overallRisk === 'high').slice(0, 5)
  });
});

export default router;
