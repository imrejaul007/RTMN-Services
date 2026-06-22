/**
 * REZ Compliance Platform
 *
 * Cross-company compliance monitoring and enforcement
 * Port: 4070
 *
 * Features:
 * - Compliance checks
 * - Policy enforcement
 * - Audit trails
 * - Regulatory reporting
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const PORT = parseInt(process.env.PORT || '4070', 10);

// Types
type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending' | 'under_review';
type ViolationSeverity = 'critical' | 'major' | 'minor' | 'warning';

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: ViolationSeverity;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

interface ComplianceCheck {
  id: string;
  entity_type: string;
  entity_id: string;
  rule_id: string;
  status: ComplianceStatus;
  checked_at: string;
  details: Record<string, unknown>;
}

interface Violation {
  id: string;
  entity_type: string;
  entity_id: string;
  rule_id: string;
  rule_name: string;
  severity: ViolationSeverity;
  description: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'waived';
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string;
  details: Record<string, unknown>;
  ip_address?: string;
  timestamp: string;
}

// In-memory storage
const rules = new Map<string, ComplianceRule>();
const violations = new Map<string, Violation[]>();
const auditLog = new Map<string, AuditEntry[]>();
const checks = new Map<string, ComplianceCheck[]>();

// Initialize with default rules
const defaultRules: ComplianceRule[] = [
  {
    id: 'rule_kyc_complete',
    name: 'KYC Complete',
    description: 'User has completed KYC verification',
    category: 'kyc',
    severity: 'critical',
    enabled: true,
    parameters: { required_fields: ['aadhaar', 'pan', 'bank_account'] }
  },
  {
    id: 'rule_age_verified',
    name: 'Age Verification',
    description: 'User age is18 or above',
    category: 'legal',
    severity: 'major',
    enabled: true,
    parameters: { minimum_age: 18 }
  },
  {
    id: 'rule_fraud_check',
    name: 'Fraud Check',
    description: 'User passed fraud checks',
    category: 'fraud',
    severity: 'critical',
    enabled: true,
    parameters: { max_risk_score: 0.3 }
  },
  {
    id: 'rule_merchant_verified',
    name: 'Merchant Verification',
    description: 'Merchant has been verified',
    category: 'merchant',
    severity: 'major',
    enabled: true,
    parameters: { verification_steps: ['business_docs', 'bank_verification', 'kyc'] }
  },
  {
    id: 'rule_data_privacy',
    name: 'Data Privacy Compliance',
    description: 'GDPR/DPDPA compliance for data handling',
    category: 'privacy',
    severity: 'major',
    enabled: true,
    parameters: { consent_required: true }
  }
];

defaultRules.forEach(r => rules.set(r.id, r));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rez-compliance-platform',
    version: '1.0.0',
    rules_count: rules.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// COMPLIANCE RULES
// ============================================

// List rules
app.get('/api/rules', (req: Request, res: Response) => {
  const { category, severity, enabled } = req.query;

  let result = Array.from(rules.values());

  if (category) result = result.filter(r => r.category === category);
  if (severity) result = result.filter(r => r.severity === severity);
  if (enabled !== undefined) result = result.filter(r => r.enabled === (enabled === 'true'));

  res.json({ rules: result, count: result.length });
});

// Get rule
app.get('/api/rules/:id', (req: Request, res: Response) => {
  const rule = rules.get(req.params.id);

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  res.json({ rule });
});

// Create rule
app.post('/api/rules', (req: Request, res: Response) => {
  const { name, description, category, severity, parameters } = req.body;

  if (!name || !category) {
    res.status(400).json({ error: 'Missing required fields: name, category' });
    return;
  }

  const rule: ComplianceRule = {
    id: `rule_${uuidv4()}`,
    name,
    description: description || '',
    category,
    severity: severity || 'minor',
    enabled: true,
    parameters: parameters || {}
  };

  rules.set(rule.id, rule);

  res.json({ success: true, rule });
});

// Update rule
app.put('/api/rules/:id', (req: Request, res: Response) => {
  const rule = rules.get(req.params.id);

  if (!rule) {
    res.status(404).json({ error: 'Rule not found' });
    return;
  }

  const { name, description, severity, enabled, parameters } = req.body;

  if (name) rule.name = name;
  if (description) rule.description = description;
  if (severity) rule.severity = severity;
  if (enabled !== undefined) rule.enabled = enabled;
  if (parameters) rule.parameters = parameters;

  rules.set(rule.id, rule);

  res.json({ success: true, rule });
});

// ============================================
// COMPLIANCE CHECKS
// ============================================

// Run compliance check
app.post('/api/checks', (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id, rule_ids } = req.body;

    if (!entity_type || !entity_id) {
      res.status(400).json({ error: 'Missing required fields: entity_type, entity_id' });
      return;
    }

    const rulesToCheck = rule_ids
      ? rule_ids.map((id: string) => rules.get(id)).filter(Boolean)
      : Array.from(rules.values()).filter(r => r.enabled);

    const results: ComplianceCheck[] = [];

    for (const rule of rulesToCheck) {
      if (!rule) continue;

      // Simulate compliance check
      const check: ComplianceCheck = {
        id: uuidv4(),
        entity_type,
        entity_id,
        rule_id: rule.id,
        status: Math.random() > 0.1 ? 'compliant' : 'non_compliant',
        checked_at: new Date().toISOString(),
        details: { rule_name: rule.name }
      };

      results.push(check);

      // Record in checks
      const entityChecks = checks.get(`${entity_type}:${entity_id}`) || [];
      entityChecks.push(check);
      checks.set(`${entity_type}:${entity_id}`, entityChecks);

      // Create violation if non-compliant
      if (check.status === 'non_compliant') {
        const violation: Violation = {
          id: uuidv4(),
          entity_type,
          entity_id,
          rule_id: rule.id,
          rule_name: rule.name,
          severity: rule.severity,
          description: `Failed compliance check: ${rule.description}`,
          status: 'open',
          created_at: new Date().toISOString()
        };

        const entityViolations = violations.get(`${entity_type}:${entity_id}`) || [];
        entityViolations.push(violation);
        violations.set(`${entity_type}:${entity_id}`, entityViolations);
      }
    }

    res.json({ success: true, checks: results, compliant_count: results.filter(r => r.status === 'compliant').length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get compliance status
app.get('/api/compliance/:entityType/:entityId', (req: Request, res: Response) => {
  const key = `${req.params.entityType}:${req.params.entityId}`;
  const entityViolations = violations.get(key) || [];
  const entityChecks = checks.get(key) || [];

  const openViolations = entityViolations.filter(v => v.status === 'open');
  const criticalViolations = openViolations.filter(v => v.severity === 'critical');

  const overallStatus: ComplianceStatus =
    criticalViolations.length > 0 ? 'non_compliant' :
 openViolations.length > 0 ? 'under_review' :
    'compliant';

  res.json({
    entity_type: req.params.entityType,
    entity_id: req.params.entityId,
    status: overallStatus,
    total_checks: entityChecks.length,
    compliant_checks: entityChecks.filter(c => c.status === 'compliant').length,
    open_violations: openViolations.length,
    critical_violations: criticalViolations.length,
    last_checked: entityChecks[entityChecks.length - 1]?.checked_at
  });
});

// ============================================
// VIOLATIONS
// ============================================

// Get violations
app.get('/api/violations', (req: Request, res: Response) => {
  const { entity_type, entity_id, status, severity, limit = 100 } = req.query;

  let allViolations: Violation[] = [];

  if (entity_type && entity_id) {
    allViolations = violations.get(`${entity_type}:${entity_id}`) || [];
  } else {
    for (const viols of violations.values()) {
      allViolations.push(...viols);
    }
  }

  if (status) allViolations = allViolations.filter(v => v.status === status);
  if (severity) allViolations = allViolations.filter(v => v.severity === severity);

  allViolations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  allViolations = allViolations.slice(0, parseInt(limit as string));

  res.json({ violations: allViolations, count: allViolations.length });
});

// Resolve violation
app.post('/api/violations/:id/resolve', (req: Request, res: Response) => {
  const { resolution_notes, waive } = req.body;

  for (const [key, viols] of violations.entries()) {
    const violation = viols.find(v => v.id === req.params.id);
    if (violation) {
      violation.status = waive ? 'waived' : 'resolved';
      violation.resolved_at = new Date().toISOString();
      violation.resolution_notes = resolution_notes;
      violations.set(key, viols);
      res.json({ success: true, violation });
      return;
    }
  }

  res.status(404).json({ error: 'Violation not found' });
});

// ============================================
// AUDIT LOG
// ============================================

// Record audit entry
app.post('/api/audit', (req: Request, res: Response) => {
  const { entity_type, entity_id, action, user_id, details, ip_address } = req.body;

  if (!entity_type || !entity_id || !action) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const entry: AuditEntry = {
    id: uuidv4(),
    entity_type,
    entity_id,
    action,
    user_id: user_id || 'system',
    details: details || {},
    ip_address,
    timestamp: new Date().toISOString()
  };

  const entityAudit = auditLog.get(`${entity_type}:${entity_id}`) || [];
  entityAudit.push(entry);
  auditLog.set(`${entity_type}:${entity_id}`, entityAudit);

  res.json({ success: true, entry_id: entry.id });
});

// Get audit log
app.get('/api/audit/:entityType/:entityId', (req: Request, res: Response) => {
  const key = `${req.params.entityType}:${req.params.entityId}`;
  const entries = auditLog.get(key) || [];

  const { action, since, until, limit = 100 } = req.query;

  let result = entries;

  if (action) result = result.filter(e => e.action === action);
  if (since) result = result.filter(e => new Date(e.timestamp) >= new Date(since as string));
  if (until) result = result.filter(e => new Date(e.timestamp) <= new Date(until as string));

  result = result.slice(-(parseInt(limit as string)));

  res.json({ entries: result, count: result.length });
});

// ============================================
// REGULATORY REPORTING
// ============================================

// Generate compliance report
app.get('/api/reports/compliance', (req: Request, res: Response) => {
  const { period, format } = req.query;

  let allViolations: Violation[] = [];
  for (const viols of violations.values()) {
    allViolations.push(...viols);
  }

  const bySeverity = {
    critical: allViolations.filter(v => v.severity === 'critical').length,
    major: allViolations.filter(v => v.severity === 'major').length,
    minor: allViolations.filter(v => v.severity === 'minor').length,
    warning: allViolations.filter(v => v.severity === 'warning').length
  };

  const byStatus = {
    open: allViolations.filter(v => v.status === 'open').length,
    resolved: allViolations.filter(v => v.status === 'resolved').length,
    waived: allViolations.filter(v => v.status === 'waived').length
  };

  res.json({
    report_type: 'compliance',
    period: period || 'all_time',
    generated_at: new Date().toISOString(),
    summary: {
      total_violations: allViolations.length,
      by_severity: bySeverity,
      by_status: byStatus,
      resolution_rate: allViolations.length > 0
        ? ((byStatus.resolved + byStatus.waived) / allViolations.length * 100).toFixed(2) + '%'
        : 'N/A'
    }
  });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Compliance Error]', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(REZ Compliance Platform - Port ${PORT}`);
  logger.info(  → Rules: GET/POST /api/rules`);
  logger.info(  → Check: POST /api/checks`);
  logger.info(  → Status: GET /api/compliance/:type/:id`);
  logger.info(  → Violations: GET /api/violations`);
  logger.info(  → Audit: POST/GET /api/audit`);
  logger.info(  → Reports: GET /api/reports/compliance`);
});

export default app;
