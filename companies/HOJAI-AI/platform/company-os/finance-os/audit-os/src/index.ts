/**
 * FinanceOS - Audit OS
 * Complete audit trail and compliance
 * SOC2 + ISO27001 + ISO9001 + GDPR ready
 */
import { Router } from 'express';
const router = Router();

export interface AuditLog { id: string; userId: string; action: string; resource: string; resourceId: string; timestamp: Date; metadata: Record<string,any>; ip?: string; }
export interface ComplianceCheck { id: string; control: string; requirement: string; status: 'pass'|'fail'|'pending'; evidence?: string; lastChecked: Date; }
export interface Finding { id: string; severity: 'critical'|'high'|'medium'|'low'; category: string; description: string; recommendation: string; status: 'open'|'mitigated'|'accepted'; dueDate?: Date; }

const auditLogs = new Map<string, AuditLog[]>();
const complianceChecks = new Map<string, ComplianceCheck>();
const findings = new Map<string, Finding>();

router.post('/audit', (req, res) => {
  const log: AuditLog = { id: crypto.randomUUID(), ...req.body, timestamp: new Date() };
  const userLogs = auditLogs.get(req.body.userId) || [];
  userLogs.push(log);
  auditLogs.set(req.body.userId, userLogs);
  res.json({ success: true, log });
});

router.get('/audit/:userId', (req, res) => {
  res.json({ success: true, logs: auditLogs.get(req.params.userId) || [] });
});

router.get('/audit', (req, res) => {
  const all = Array.from(auditLogs.values()).flat().sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
  res.json({ success: true, logs: all.slice(0, 100) });
});

router.post('/compliance/check', (req, res) => {
  const check: ComplianceCheck = { id: crypto.randomUUID(), ...req.body, lastChecked: new Date() };
  complianceChecks.set(check.id, check);
  res.json({ success: true, check });
});

router.get('/compliance', (req, res) => {
  res.json({ success: true, checks: Array.from(complianceChecks.values()) });
});

router.post('/findings', (req, res) => {
  const finding: Finding = { id: crypto.randomUUID(), ...req.body };
  findings.set(finding.id, finding);
  res.json({ success: true, finding });
});

router.get('/findings', (req, res) => {
  res.json({ success: true, findings: Array.from(findings.values()) });
});

router.get('/reports/audit-trail', (req, res) => {
  const all = Array.from(auditLogs.values()).flat();
  const byAction = all.reduce((acc, log) => { acc[log.action] = (acc[log.action] || 0) + 1; return acc; }, {} as Record<string,number>);
  const byUser = all.reduce((acc, log) => { acc[log.userId] = (acc[log.userId] || 0) + 1; return acc; }, {} as Record<string,number>);
  res.json({ success: true, summary: { total: all.length, byAction, byUser, recent: all.slice(0, 20) } });
});

export default router;
