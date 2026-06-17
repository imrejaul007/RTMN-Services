/**
 * AML Routes
 * Anti-Money Laundering endpoints
 */

import { Router, Request, Response } from 'express';
import { auditStore, AuditAction, AuditEntityType } from '../models/Audit';
import { complianceStore, ComplianceViolation, ComplianceType } from '../models/Compliance';
import { AuditLogger } from '../services/auditLogger';
import { logger } from '../index';

const router = Router();
const auditLogger = new AuditLogger(logger);

// AML Check Types
interface AMLCheck {
  id: string;
  entityId: string;
  entityType: 'user' | 'account' | 'transaction';
  checkType: 'sanctions' | 'pep' | 'adverse_media' | 'risk_assessment' | 'transaction_monitoring';
  status: 'pending' | 'clear' | 'flagged' | 'blocked';
  riskScore: number;
  riskFactors: string[];
  matchedLists: string[];
  checkedAt: Date;
  checkedBy: string;
  notes?: string;
}

// Sanctions Lists (simplified for demo)
const SANCTIONS_LISTS = [
  'OFAC SDN',
  'EU SANCTIONS',
  'UN SANCTIONS',
  'UK HMT SANCTIONS',
  'UNSC CONSOLIDATED'
];

// PEP Lists (Politically Exposed Persons)
const PEP_INDICATORS = [
  'government_official',
  'political_party_member',
  'diplomat',
  'judicial_official',
  'military_official'
];

// In-memory AML store
const amlChecks: Map<string, AMLCheck> = new Map();
const alerts: Map<string, AMLAlert> = new Map();

// AML Alert Types
interface AMLAlert {
  id: string;
  checkId: string;
  alertType: 'high_value' | 'unusual_pattern' | 'sanctions_match' | 'pep_match' | 'rapid_movement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  entityId: string;
  description: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

// High-risk countries
const HIGH_RISK_COUNTRIES = ['XX', 'YY', 'ZZ'];

// High-value transaction threshold
const HIGH_VALUE_THRESHOLD = 10000;

// Perform AML screening
router.post('/screen', async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, checkType, entityData } = req.body;

    if (!entityId || !entityType || !checkType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['entityId', 'entityType', 'checkType']
      });
    }

    const id = `AML-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let riskScore = 0;
    const riskFactors: string[] = [];
    const matchedLists: string[] = [];
    let status: 'pending' | 'clear' | 'flagged' | 'blocked' = 'clear';

    // Perform sanctions screening
    if (checkType === 'sanctions' || checkType === 'risk_assessment') {
      // Simulated sanctions check (in production, call external API)
      const isOnSanctionsList = Math.random() < 0.05; // 5% simulated match rate
      if (isOnSanctionsList) {
        status = 'blocked';
        riskScore += 100;
        matchedLists.push(SANCTIONS_LISTS[Math.floor(Math.random() * SANCTIONS_LISTS.length)]);
        riskFactors.push('Match found on sanctions list');
      }
    }

    // PEP Check
    if (checkType === 'pep' || checkType === 'risk_assessment') {
      // Simulated PEP check
      if (entityData?.isPEP || Math.random() < 0.1) {
        riskScore += 30;
        riskFactors.push('Politically Exposed Person');
        matchedLists.push('PEP List');
        status = status === 'blocked' ? 'blocked' : 'flagged';
      }
    }

    // High-risk country check
    if (entityData?.country && HIGH_RISK_COUNTRIES.includes(entityData.country)) {
      riskScore += 25;
      riskFactors.push('High-risk jurisdiction');
      status = status === 'blocked' ? 'blocked' : 'flagged';
    }

    // Transaction monitoring
    if (checkType === 'transaction_monitoring') {
      const transactionAmount = entityData?.amount || 0;
      if (transactionAmount >= HIGH_VALUE_THRESHOLD) {
        riskScore += 20;
        riskFactors.push(`High-value transaction: ${transactionAmount}`);
      }
    }

    const check: AMLCheck = {
      id,
      entityId,
      entityType,
      checkType,
      status,
      riskScore: Math.min(riskScore, 100),
      riskFactors,
      matchedLists,
      checkedAt: new Date(),
      checkedBy: 'SYSTEM'
    };

    amlChecks.set(id, check);

    // Create alert if flagged or blocked
    if (status === 'flagged' || status === 'blocked') {
      const alert: AMLAlert = {
        id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        checkId: id,
        alertType: matchedLists.includes('PEP List') ? 'pep_match' :
                   status === 'blocked' ? 'sanctions_match' : 'high_value',
        severity: status === 'blocked' ? 'critical' : 'high',
        status: 'open',
        entityId,
        description: `AML alert triggered for ${entityType}: ${riskFactors.join(', ')}`,
        createdAt: new Date()
      };
      alerts.set(alert.id, alert);

      // Create compliance violation
      complianceStore.addViolation({
        ruleId: 'AML-001',
        ruleName: 'AML Transaction Monitoring',
        entityId,
        entityType: entityType as 'user' | 'transaction' | 'document' | 'account',
        type: ComplianceType.AML,
        severity: status === 'blocked' ? 'critical' : 'high',
        description: alert.description,
        status: 'open'
      });
    }

    // Log the screening
    auditLogger.logAction(
      AuditAction.AML_SCREENING_PERFORMED,
      AuditEntityType.TRANSACTION,
      id,
      entityId,
      'SYSTEM',
      'service',
      { checkType, status, riskScore },
      status === 'clear' ? 'success' : 'failure',
      req.headers['x-request-id'] as string
    );

    res.status(201).json({
      success: true,
      check,
      alerts: status !== 'clear' ? [alerts.get(Array.from(alerts.keys()).pop()!)] : []
    });
  } catch (error) {
    logger.error('Error performing AML screening', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to perform AML screening' });
  }
});

// Get AML check by ID
router.get('/check/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const check = amlChecks.get(id);

    if (!check) {
      return res.status(404).json({ error: 'AML check not found' });
    }

    res.json({ check });
  } catch (error) {
    logger.error('Error fetching AML check', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch AML check' });
  }
});

// Get AML checks by entity
router.get('/checks/entity/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const entityChecks = Array.from(amlChecks.values())
      .filter(c => c.entityId === entityId)
      .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime());

    res.json({ checks: entityChecks });
  } catch (error) {
    logger.error('Error fetching entity AML checks', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch AML checks' });
  }
});

// Get all open alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { status, severity } = req.query;
    let openAlerts = Array.from(alerts.values())
      .filter(a => a.status === 'open');

    if (status) {
      openAlerts = openAlerts.filter(a => a.status === status);
    }

    if (severity) {
      openAlerts = openAlerts.filter(a => a.severity === severity);
    }

    openAlerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    res.json({ alerts: openAlerts });
  } catch (error) {
    logger.error('Error fetching AML alerts', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch AML alerts' });
  }
});

// Get alert by ID
router.get('/alert/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = alerts.get(id);

    if (!alert) {
      return res.status(404).json({ error: 'AML alert not found' });
    }

    res.json({ alert });
  } catch (error) {
    logger.error('Error fetching AML alert', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch AML alert' });
  }
});

// Resolve AML alert
router.post('/alert/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolvedBy, notes, isFalsePositive } = req.body;
    const alert = alerts.get(id);

    if (!alert) {
      return res.status(404).json({ error: 'AML alert not found' });
    }

    alert.status = isFalsePositive ? 'false_positive' : 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    alert.notes = notes;
    alerts.set(id, alert);

    // Log resolution
    auditLogger.logAction(
      AuditAction.AML_ALERT_TRIGGERED,
      AuditEntityType.TRANSACTION,
      alert.id,
      alert.entityId,
      resolvedBy || 'SYSTEM',
      'user',
      { resolution: alert.status, notes },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      alert
    });
  } catch (error) {
    logger.error('Error resolving AML alert', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to resolve AML alert' });
  }
});

// File SAR (Suspicious Activity Report)
router.post('/sar', async (req: Request, res: Response) => {
  try {
    const { entityId, alertIds, description, narrative, filedBy } = req.body;

    if (!entityId || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['entityId', 'description']
      });
    }

    const sarId = `SAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sar = {
      id: sarId,
      entityId,
      alertIds: alertIds || [],
      description,
      narrative,
      status: 'filed',
      filedAt: new Date(),
      filedBy: filedBy || 'SYSTEM',
      reviewStatus: 'pending_review'
    };

    // Log SAR filing
    auditLogger.logAction(
      AuditAction.AML_SAR_FILED,
      AuditEntityType.TRANSACTION,
      sarId,
      entityId,
      filedBy || 'SYSTEM',
      'service',
      { sarId, description },
      'success',
      req.headers['x-request-id'] as string
    );

    res.status(201).json({
      success: true,
      sar
    });
  } catch (error) {
    logger.error('Error filing SAR', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to file SAR' });
  }
});

// Monitor transaction for AML
router.post('/monitor/transaction', async (req: Request, res: Response) => {
  try {
    const { transactionId, userId, amount, currency, senderCountry, receiverCountry } = req.body;

    if (!transactionId || !userId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['transactionId', 'userId', 'amount']
      });
    }

    const riskFactors: string[] = [];
    let riskScore = 0;
    let shouldBlock = false;
    let alertType: string = '';

    // High value check
    if (amount >= HIGH_VALUE_THRESHOLD) {
      riskScore += 20;
      riskFactors.push(`High value: ${currency || 'USD'} ${amount}`);
      alertType = 'high_value';
    }

    // High-risk country check
    if (senderCountry && HIGH_RISK_COUNTRIES.includes(senderCountry)) {
      riskScore += 30;
      riskFactors.push('High-risk sender country');
      alertType = 'unusual_pattern';
    }

    if (receiverCountry && HIGH_RISK_COUNTRIES.includes(receiverCountry)) {
      riskScore += 30;
      riskFactors.push('High-risk receiver country');
      alertType = 'unusual_pattern';
    }

    // Very high risk score triggers block
    if (riskScore >= 50) {
      shouldBlock = true;
    }

    // Log the monitoring result
    auditLogger.logAction(
      shouldBlock ? AuditAction.AML_TRANSACTION_BLOCKED : AuditAction.AML_SCREENING_PERFORMED,
      AuditEntityType.TRANSACTION,
      transactionId,
      userId,
      'SYSTEM',
      'service',
      { amount, currency, riskScore, riskFactors },
      shouldBlock ? 'failure' : 'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      transactionId,
      decision: shouldBlock ? 'BLOCK' : 'APPROVE',
      riskScore: Math.min(riskScore, 100),
      riskFactors,
      message: shouldBlock
        ? 'Transaction blocked due to AML risk factors'
        : 'Transaction approved',
      requiresReview: riskScore >= 30
    });
  } catch (error) {
    logger.error('Error monitoring transaction', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to monitor transaction' });
  }
});

// Get AML statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const allChecks = Array.from(amlChecks.values());
    const allAlerts = Array.from(alerts.values());
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      checks: {
        total: allChecks.length,
        byStatus: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        averageRiskScore: 0
      },
      alerts: {
        total: allAlerts.length,
        open: allAlerts.filter(a => a.status === 'open').length,
        bySeverity: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        resolvedInLast7Days: allAlerts.filter(a =>
          a.resolvedAt && a.resolvedAt >= sevenDaysAgo
        ).length
      }
    };

    allChecks.forEach(check => {
      stats.checks.byStatus[check.status] = (stats.checks.byStatus[check.status] || 0) + 1;
      stats.checks.byType[check.checkType] = (stats.checks.byType[check.checkType] || 0) + 1;
      stats.checks.averageRiskScore += check.riskScore;
    });

    allAlerts.forEach(alert => {
      stats.alerts.bySeverity[alert.severity] = (stats.alerts.bySeverity[alert.severity] || 0) + 1;
      stats.alerts.byType[alert.alertType] = (stats.alerts.byType[alert.alertType] || 0) + 1;
    });

    if (allChecks.length > 0) {
      stats.checks.averageRiskScore = Math.round(stats.checks.averageRiskScore / allChecks.length);
    }

    res.json({ stats });
  } catch (error) {
    logger.error('Error fetching AML stats', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
