/**
 * Compliance OS - Production Implementation
 * SOC2, ISO27001, GDPR, HIPAA, PCI-DSS controls and audit trails
 * Port: 4873
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4873;
const START_TIME = Date.now();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Types
type Framework = 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA' | 'PCI-DSS';
type ControlStatus = 'compliant' | 'non_compliant' | 'in_progress' | 'not_applicable';
type Severity = 'critical' | 'high' | 'medium' | 'low';

interface Control {
  id: string;
  framework: Framework;
  controlId: string;
  name: string;
  description: string;
  status: ControlStatus;
  owner: string;
  lastReviewed: string;
  nextReview: string;
  evidence: Evidence[];
  findings: Finding[];
  notes: string;
}

interface Evidence {
  id: string;
  controlId: string;
  type: 'document' | 'screenshot' | 'log' | 'certificate' | 'policy' | 'report';
  name: string;
  url?: string;
  content?: string;
  collectedAt: string;
  collectedBy: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

interface Finding {
  id: string;
  controlId: string;
  severity: Severity;
  description: string;
  remediation: string;
  deadline: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  createdAt: string;
  createdBy: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId: string;
  user: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  ip: string;
  userAgent: string;
}

interface Policy {
  id: string;
  name: string;
  framework: Framework;
  content: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

// In-memory stores
const controls = new Map<string, Control>();
const auditLogs: AuditLog[] = [];
const policies = new Map<string, Policy>();

// Validation schemas
const CreateControlSchema = z.object({
  framework: z.enum(['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS']),
  controlId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  owner: z.string().email(),
});

const CreateEvidenceSchema = z.object({
  type: z.enum(['document', 'screenshot', 'log', 'certificate', 'policy', 'report']),
  name: z.string().min(1),
  url: z.string().url().optional(),
  content: z.string().optional(),
});

const CreateFindingSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string().min(10),
  remediation: z.string(),
  deadline: z.string(),
});

const CreatePolicySchema = z.object({
  name: z.string().min(1),
  framework: z.enum(['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS']),
  content: z.string().min(100),
});

// Helper functions
function logAudit(action: string, entity: string, entityId: string, user: string, changes: Record<string, { old: unknown; new: unknown }>, req: Request) {
  auditLogs.push({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    entity,
    entityId,
    user,
    changes,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  });
  // Keep only last 10000 logs
  if (auditLogs.length > 10000) auditLogs.splice(0, auditLogs.length - 10000);
}

function calculateComplianceRate(framework?: Framework): number {
  let filtered = Array.from(controls.values());
  if (framework) filtered = filtered.filter(c => c.framework === framework);
  if (filtered.length === 0) return 100;
  const compliant = filtered.filter(c => c.status === 'compliant').length;
  return Math.round((compliant / filtered.length) * 100);
}

function getRiskScore(framework?: Framework): { score: number; level: 'low' | 'medium' | 'high' | 'critical' } {
  let filtered = Array.from(controls.values());
  if (framework) filtered = filtered.filter(c => c.framework === framework);

  let score = 0;
  for (const control of filtered) {
    for (const finding of control.findings) {
      if (finding.status !== 'resolved') {
        switch (finding.severity) {
          case 'critical': score += 40; break;
          case 'high': score += 25; break;
          case 'medium': score += 10; break;
          case 'low': score += 5; break;
        }
      }
    }
  }

  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score < 25) level = 'low';
  else if (score < 50) level = 'medium';
  else if (score < 75) level = 'high';
  else level = 'critical';

  return { score, level };
}

// Initialize with SOC2 controls
function seedSOC2Controls() {
  const soc2Controls = [
    { controlId: 'CC1.1', name: 'Control Environment', description: 'Entity demonstrates commitment to integrity and ethical values' },
    { controlId: 'CC1.2', name: 'Board Oversight', description: 'Board of directors demonstrates independence from management' },
    { controlId: 'CC2.1', name: 'Information Communication', description: 'Entity obtains or generates relevant quality information' },
    { controlId: 'CC2.2', name: 'Internal Communication', description: 'Entity internally communicates information including objectives' },
    { controlId: 'CC3.1', name: 'Risk Assessment', description: 'Entity specifies objectives with sufficient clarity' },
    { controlId: 'CC3.2', name: 'Risk Identification', description: 'Entity identifies and assesses risks that could affect objectives' },
    { controlId: 'CC4.1', name: 'Monitoring Activities', description: 'Entity selects and develops ongoing evaluations' },
    { controlId: 'CC5.1', name: 'Control Activities', description: 'Entity selects and develops control activities' },
    { controlId: 'CC6.1', name: 'Logical Access', description: 'Entity implements logical access security software' },
    { controlId: 'CC6.6', name: 'Security for Vulnerabilities', description: 'Entity implements controls to prevent unauthorized software' },
    { controlId: 'CC7.1', name: 'Incident Response', description: 'Entity identifies and evaluates anomalies' },
    { controlId: 'CC7.2', name: 'Incident Management', description: 'Entity monitors, investigates, and remediates incidents' },
    { controlId: 'CC8.1', name: 'Change Management', description: 'Entity manages changes to entity and system components' },
    { controlId: 'CC9.1', name: 'Risk Mitigation', description: 'Entity identifies, selects, and develops risk mitigation activities' },
    { controlId: 'A1.1', name: 'Availability Commitments', description: 'Entity maintains commitments to availability' },
  ];

  soc2Controls.forEach(c => {
    const id = uuidv4();
    controls.set(id, {
      id,
      framework: 'SOC2',
      controlId: c.controlId,
      name: c.name,
      description: c.description,
      status: 'in_progress',
      owner: 'compliance@company.com',
      lastReviewed: new Date().toISOString(),
      nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      evidence: [],
      findings: [],
      notes: '',
    });
  });
}

// Initialize with GDPR controls
function seedGDPRControls() {
  const gdprControls = [
    { controlId: 'GDPR-Art-5', name: 'Principles of Processing', description: 'Personal data shall be processed lawfully, fairly, and transparently' },
    { controlId: 'GDPR-Art-6', name: 'Lawfulness of Processing', description: 'Processing shall have a lawful basis' },
    { controlId: 'GDPR-Art-12', name: 'Transparent Information', description: 'Information shall be provided in a concise, transparent, and accessible form' },
    { controlId: 'GDPR-Art-15', name: 'Right of Access', description: 'Data subject shall have right to obtain access to their data' },
    { controlId: 'GDPR-Art-16', name: 'Right to Rectification', description: 'Data subject shall have right to have inaccurate data corrected' },
    { controlId: 'GDPR-Art-17', name: 'Right to Erasure', description: 'Data subject shall have right to have data erased' },
    { controlId: 'GDPR-Art-20', name: 'Right to Portability', description: 'Data subject shall have right to receive data in structured format' },
    { controlId: 'GDPR-Art-25', name: 'Data Protection by Design', description: 'Data protection shall be embedded into system design' },
    { controlId: 'GDPR-Art-32', name: 'Security of Processing', description: 'Controller and processor shall implement appropriate security measures' },
    { controlId: 'GDPR-Art-33', name: 'Breach Notification', description: 'Breaches shall be notified to authority within 72 hours' },
  ];

  gdprControls.forEach(c => {
    const id = uuidv4();
    controls.set(id, {
      id,
      framework: 'GDPR',
      controlId: c.controlId,
      name: c.name,
      description: c.description,
      status: 'in_progress',
      owner: 'privacy@company.com',
      lastReviewed: new Date().toISOString(),
      nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      evidence: [],
      findings: [],
      notes: '',
    });
  });
}

// Seed controls on startup
seedSOC2Controls();
seedGDPRControls();

// ─── Health Endpoints ──────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'compliance-os',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    controls: controls.size,
    auditLogs: auditLogs.length,
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ─── Controls Endpoints ──────────────────────────────────────────────────────

app.get('/api/controls', (req: Request, res: Response) => {
  const { framework, status, owner } = req.query;

  let result = Array.from(controls.values());

  if (framework) result = result.filter(c => c.framework === framework);
  if (status) result = result.filter(c => c.status === status);
  if (owner) result = result.filter(c => c.owner === owner);

  res.json({
    total: result.length,
    compliant: result.filter(c => c.status === 'compliant').length,
    nonCompliant: result.filter(c => c.status === 'non_compliant').length,
    inProgress: result.filter(c => c.status === 'in_progress').length,
    controls: result,
  });
});

app.get('/api/controls/:id', (req: Request, res: Response) => {
  const control = controls.get(req.params.id);
  if (!control) {
    return res.status(404).json({ error: 'Control not found' });
  }
  res.json(control);
});

app.post('/api/controls', async (req: Request, res: Response) => {
  try {
    const data = CreateControlSchema.parse(req.body);

    // Check for duplicate
    const existing = Array.from(controls.values()).find(
      c => c.framework === data.framework && c.controlId === data.controlId
    );
    if (existing) {
      return res.status(400).json({ error: 'Control already exists for this framework' });
    }

    const id = uuidv4();
    const control: Control = {
      id,
      framework: data.framework,
      controlId: data.controlId,
      name: data.name,
      description: data.description,
      status: 'in_progress',
      owner: data.owner,
      lastReviewed: new Date().toISOString(),
      nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      evidence: [],
      findings: [],
      notes: '',
    };

    controls.set(id, control);
    logAudit('create', 'control', id, data.owner, {}, req);

    res.status(201).json(control);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: err.issues });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/controls/:id', (req: Request, res: Response) => {
  const control = controls.get(req.params.id);
  if (!control) {
    return res.status(404).json({ error: 'Control not found' });
  }

  const { status, owner, notes } = req.body;
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  if (status && status !== control.status) {
    changes.status = { old: control.status, new: status };
    control.status = status;
    control.lastReviewed = new Date().toISOString();
  }
  if (owner && owner !== control.owner) {
    changes.owner = { old: control.owner, new: owner };
    control.owner = owner;
  }
  if (notes !== undefined) {
    changes.notes = { old: control.notes, new: notes };
    control.notes = notes;
  }

  logAudit('update', 'control', control.id, req.get('x-user-email') || 'unknown', changes, req);

  res.json(control);
});

app.delete('/api/controls/:id', (req: Request, res: Response) => {
  const control = controls.get(req.params.id);
  if (!control) {
    return res.status(404).json({ error: 'Control not found' });
  }

  controls.delete(req.params.id);
  logAudit('delete', 'control', req.params.id, req.get('x-user-email') || 'unknown', {}, req);

  res.json({ success: true });
});

// ─── Evidence Endpoints ────────────────────────────────────────────────────────

app.post('/api/controls/:id/evidence', (req: Request, res: Response) => {
  const control = controls.get(req.params.id);
  if (!control) {
    return res.status(404).json({ error: 'Control not found' });
  }

  try {
    const data = CreateEvidenceSchema.parse(req.body);

    const evidence: Evidence = {
      id: uuidv4(),
      controlId: control.id,
      type: data.type,
      name: data.name,
      url: data.url,
      content: data.content,
      collectedAt: new Date().toISOString(),
      collectedBy: req.get('x-user-email') || 'unknown',
      approved: false,
    };

    control.evidence.push(evidence);
    logAudit('add_evidence', 'control', control.id, req.get('x-user-email') || 'unknown', { evidenceId: { old: null, new: evidence.id } }, req);

    res.status(201).json(evidence);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: err.issues });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/evidence/:evidenceId/approve', (req: Request, res: Response) => {
  const { approved } = req.body;

  for (const control of controls.values()) {
    const evidence = control.evidence.find(e => e.id === req.params.evidenceId);
    if (evidence) {
      evidence.approved = approved;
      evidence.approvedBy = req.get('x-user-email') || 'unknown';
      evidence.approvedAt = new Date().toISOString();

      logAudit('approve_evidence', 'evidence', evidence.id, req.get('x-user-email') || 'unknown', { approved: { old: false, new: approved } }, req);

      return res.json(evidence);
    }
  }

  res.status(404).json({ error: 'Evidence not found' });
});

// ─── Findings Endpoints ────────────────────────────────────────────────────────

app.post('/api/controls/:id/findings', (req: Request, res: Response) => {
  const control = controls.get(req.params.id);
  if (!control) {
    return res.status(404).json({ error: 'Control not found' });
  }

  try {
    const data = CreateFindingSchema.parse(req.body);

    const finding: Finding = {
      id: uuidv4(),
      controlId: control.id,
      severity: data.severity,
      description: data.description,
      remediation: data.remediation,
      deadline: data.deadline,
      status: 'open',
      createdAt: new Date().toISOString(),
      createdBy: req.get('x-user-email') || 'unknown',
    };

    control.findings.push(finding);
    logAudit('create_finding', 'finding', finding.id, req.get('x-user-email') || 'unknown', {}, req);

    res.status(201).json(finding);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: err.issues });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/findings/:id', (req: Request, res: Response) => {
  const { status, notes } = req.body;

  for (const control of controls.values()) {
    const finding = control.findings.find(f => f.id === req.params.id);
    if (finding) {
      if (status) {
        finding.status = status;
        if (status === 'resolved') {
          finding.resolvedAt = new Date().toISOString();
          finding.resolvedBy = req.get('x-user-email') || 'unknown';
        }
      }

      logAudit('update_finding', 'finding', finding.id, req.get('x-user-email') || 'unknown', { status: { old: finding.status, new: status } }, req);

      return res.json(finding);
    }
  }

  res.status(404).json({ error: 'Finding not found' });
});

app.get('/api/findings', (req: Request, res: Response) => {
  const { severity, status, framework } = req.query;

  let allFindings: (Finding & { controlName: string; framework: Framework })[] = [];

  for (const control of controls.values()) {
    if (framework && control.framework !== framework) continue;

    for (const finding of control.findings) {
      if (severity && finding.severity !== severity) continue;
      if (status && finding.status !== status) continue;

      allFindings.push({ ...finding, controlName: control.name, framework: control.framework });
    }
  }

  res.json({
    total: allFindings.length,
    bySeverity: {
      critical: allFindings.filter(f => f.severity === 'critical').length,
      high: allFindings.filter(f => f.severity === 'high').length,
      medium: allFindings.filter(f => f.severity === 'medium').length,
      low: allFindings.filter(f => f.severity === 'low').length,
    },
    byStatus: {
      open: allFindings.filter(f => f.status === 'open').length,
      inProgress: allFindings.filter(f => f.status === 'in_progress').length,
      resolved: allFindings.filter(f => f.status === 'resolved').length,
      accepted: allFindings.filter(f => f.status === 'accepted').length,
    },
    findings: allFindings,
  });
});

// ─── Audit Endpoints ──────────────────────────────────────────────────────────

app.get('/api/audit', (req: Request, res: Response) => {
  const { entity, action, user, from, to, limit = 100 } = req.query;

  let result = [...auditLogs].reverse();

  if (entity) result = result.filter(l => l.entity === entity);
  if (action) result = result.filter(l => l.action === action);
  if (user) result = result.filter(l => l.user === user);
  if (from) result = result.filter(l => l.timestamp >= from);
  if (to) result = result.filter(l => l.timestamp <= to);

  res.json({
    total: result.length,
    logs: result.slice(0, Number(limit)),
  });
});

app.get('/api/audit/export', (req: Request, res: Response) => {
  const { framework, format = 'json' } = req.query;

  let logs = [...auditLogs];
  if (framework) {
    const frameworkControls = new Set(
      Array.from(controls.values())
        .filter(c => c.framework === framework)
        .map(c => c.id)
    );
    logs = logs.filter(l => frameworkControls.has(l.entityId));
  }

  if (format === 'csv') {
    const csv = [
      'ID,Timestamp,Action,Entity,EntityID,User,IP',
      ...logs.map(l => `${l.id},${l.timestamp},${l.action},${l.entity},${l.entityId},${l.user},${l.ip}`)
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-${framework || 'all'}-${Date.now()}.csv`);
    return res.send(csv);
  }

  res.json({ logs });
});

// ─── Dashboard / Summary ─────────────────────────────────────────────────────

app.get('/api/dashboard', (req: Request, res: Response) => {
  const { framework } = req.query;

  const frameworks: Framework[] = ['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'PCI-DSS'];
  const frameworkData: Record<string, { total: number; compliant: number; rate: number; risk: ReturnType<typeof getRiskScore> }> = {};

  for (const fw of frameworks) {
    const fwControls = Array.from(controls.values()).filter(c => c.framework === fw);
    const compliant = fwControls.filter(c => c.status === 'compliant').length;
    frameworkData[fw] = {
      total: fwControls.length,
      compliant,
      rate: fwControls.length > 0 ? Math.round((compliant / fwControls.length) * 100) : 0,
      risk: getRiskScore(fw),
    };
  }

  const allFindings = Array.from(controls.values()).flatMap(c => c.findings);

  res.json({
    overallCompliance: calculateComplianceRate(framework as Framework | undefined),
    frameworks: frameworkData,
    openFindings: allFindings.filter(f => f.status === 'open').length,
    criticalFindings: allFindings.filter(f => f.severity === 'critical' && f.status !== 'resolved').length,
    upcomingReviews: Array.from(controls.values()).filter(c => {
      const daysUntilReview = (new Date(c.nextReview).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      return daysUntilReview <= 30 && daysUntilReview > 0;
    }).length,
    recentAuditLogs: auditLogs.slice(-10).reverse(),
  });
});

// ─── Report Generation ─────────────────────────────────────────────────────────

app.get('/api/reports/:framework', (req: Request, res: Response) => {
  const { framework } = req.params;
  const fwControls = Array.from(controls.values()).filter(c => c.framework === framework);

  if (fwControls.length === 0) {
    return res.status(404).json({ error: 'Framework not found or no controls defined' });
  }

  const report = {
    framework,
    generatedAt: new Date().toISOString(),
    summary: {
      totalControls: fwControls.length,
      compliant: fwControls.filter(c => c.status === 'compliant').length,
      nonCompliant: fwControls.filter(c => c.status === 'non_compliant').length,
      inProgress: fwControls.filter(c => c.status === 'in_progress').length,
      complianceRate: Math.round((fwControls.filter(c => c.status === 'compliant').length / fwControls.length) * 100),
    },
    riskAssessment: getRiskScore(framework as Framework),
    controls: fwControls.map(c => ({
      id: c.controlId,
      name: c.name,
      status: c.status,
      owner: c.owner,
      lastReviewed: c.lastReviewed,
      nextReview: c.nextReview,
      findings: c.findings.filter(f => f.status !== 'resolved'),
      evidenceCount: c.evidence.length,
      approvedEvidence: c.evidence.filter(e => e.approved).length,
    })),
    recommendations: fwControls
      .filter(c => c.status !== 'compliant')
      .map(c => ({
        control: c.controlId,
        name: c.name,
        priority: c.findings.filter(f => f.status === 'open').length > 0 ? 'high' : 'medium',
        action: 'Review and implement controls',
      })),
  };

  res.json(report);
});

// ─── Error Handler ─────────────────────────────────────────────────────────────

app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  console.error('[compliance-os] error:', err);
  res.status(500).json({ error: 'Internal error', message: err.message });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[compliance-os] listening on :${PORT}`);
  console.log(`[compliance-os] frameworks: SOC2, ISO27001, GDPR, HIPAA, PCI-DSS`);
  console.log(`[compliance-os] controls seeded: ${controls.size}`);
});

export default app;
