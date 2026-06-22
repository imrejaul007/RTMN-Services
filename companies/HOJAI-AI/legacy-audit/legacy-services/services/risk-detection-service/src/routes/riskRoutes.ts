import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { fallRiskService } from '../services/fallRiskService';
import { woundRiskService } from '../services/woundRiskService';
import { deteriorationService } from '../services/deteriorationService';
import { safeguardingRiskService } from '../services/safeguardingRiskService';
import { alertService } from '../services/alertService';
import { IFallRiskFactors, RiskLevel, WoundStage, DeteriorationType, SafeguardingConcernType } from '../models/risk';
import { logger } from '../utils/logger';

const router = Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

// ==================== FALL RISK ROUTES ====================

/**
 * POST /risk/fall/assess/:patientId
 * Assess fall risk for a patient
 */
router.post(
  '/fall/assess/:patientId',
  [
    param('patientId').isString().notEmpty(),
    body('factors').isObject(),
    body('factors.vision').isObject(),
    body('factors.balance').isObject(),
    body('factors.strength').isObject(),
    body('factors.medications').isObject(),
    body('factors.history').isObject(),
    body('factors.environment').isObject(),
    body('mobility').isObject(),
    body('medications').isObject(),
    body('history').isObject(),
    body('assessedBy').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const assessment = await fallRiskService.assessFallRisk(patientId, req.body);
      res.status(201).json({
        success: true,
        data: assessment
      });
    } catch (error) {
      logger.error('Error assessing fall risk', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to assess fall risk'
      });
    }
  }
);

/**
 * GET /risk/fall/:patientId
 * Get latest fall risk assessment for a patient
 */
router.get(
  '/fall/:patientId',
  [param('patientId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const assessment = await fallRiskService.getLatestAssessment(patientId);
      if (!assessment) {
        res.status(404).json({
          success: false,
          error: 'No fall risk assessment found for this patient'
        });
        return;
      }
      res.json({
        success: true,
        data: assessment
      });
    } catch (error) {
      logger.error('Error fetching fall risk', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fall risk assessment'
      });
    }
  }
);

/**
 * GET /risk/fall/:patientId/history
 * Get fall risk history for a patient
 */
router.get(
  '/fall/:patientId/history',
  [
    param('patientId').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await fallRiskService.getFallRiskHistory(patientId, limit);
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching fall risk history', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fall risk history'
      });
    }
  }
);

/**
 * GET /risk/fall/:patientId/trend
 * Get fall risk trend over time
 */
router.get(
  '/fall/:patientId/trend',
  [
    param('patientId').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const trend = await fallRiskService.getFallRiskTrend(patientId, days);
      res.json({
        success: true,
        data: trend
      });
    } catch (error) {
      logger.error('Error fetching fall risk trend', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fall risk trend'
      });
    }
  }
);

/**
 * POST /risk/fall/:patientId/incident
 * Record a fall incident
 */
router.post(
  '/fall/:patientId/incident',
  [
    param('patientId').isString().notEmpty(),
    body('date').isISO8601(),
    body('location').isString().notEmpty(),
    body('severity').isIn(['minor', 'moderate', 'severe']),
    body('injuries').optional().isArray(),
    body('contributingFactors').optional().isArray()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      await fallRiskService.recordFallIncident(patientId, req.body);
      res.status(201).json({
        success: true,
        message: 'Fall incident recorded successfully'
      });
    } catch (error) {
      logger.error('Error recording fall incident', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to record fall incident'
      });
    }
  }
);

/**
 * GET /risk/fall/high-risk
 * Get patients with high fall risk
 */
router.get(
  '/fall/high-risk',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(_req.query.limit as string) || 50;
      const patients = await fallRiskService.getHighRiskPatients(limit);
      res.json({
        success: true,
        data: patients
      });
    } catch (error) {
      logger.error('Error fetching high risk fall patients', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch high risk patients'
      });
    }
  }
);

// ==================== WOUND RISK ROUTES ====================

/**
 * POST /risk/wound/assess/:patientId
 * Assess wound risk for a patient
 */
router.post(
  '/wound/assess/:patientId',
  [
    param('patientId').isString().notEmpty(),
    body('woundId').isString().notEmpty(),
    body('location').isString().notEmpty(),
    body('stage').isIn(Object.values(WoundStage)),
    body('riskFactors').isObject(),
    body('assessedBy').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const assessment = await woundRiskService.assessWoundRisk(patientId, req.body);
      res.status(201).json({
        success: true,
        data: assessment
      });
    } catch (error) {
      logger.error('Error assessing wound risk', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to assess wound risk'
      });
    }
  }
);

/**
 * GET /risk/wound/:patientId
 * Get wound assessments for a patient
 */
router.get(
  '/wound/:patientId',
  [param('patientId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const wounds = await woundRiskService.getPatientWounds(patientId);
      res.json({
        success: true,
        data: wounds
      });
    } catch (error) {
      logger.error('Error fetching wound assessments', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wound assessments'
      });
    }
  }
);

/**
 * GET /risk/wound/history/:woundId
 * Get wound assessment history
 */
router.get(
  '/wound/history/:woundId',
  [param('woundId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { woundId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await woundRiskService.getWoundHistory(woundId, limit);
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching wound history', { error, woundId: req.params.woundId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wound history'
      });
    }
  }
);

/**
 * GET /risk/wound/deterioration/:woundId
 * Detect wound deterioration
 */
router.get(
  '/wound/deterioration/:woundId',
  [param('woundId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { woundId } = req.params;
      const result = await woundRiskService.detectWoundDeterioration(woundId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error detecting wound deterioration', { error, woundId: req.params.woundId });
      res.status(500).json({
        success: false,
        error: 'Failed to detect wound deterioration'
      });
    }
  }
);

/**
 * GET /risk/wound/high-risk
 * Get patients with high wound risk
 */
router.get(
  '/wound/high-risk',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(_req.query.limit as string) || 50;
      const patients = await woundRiskService.getHighRiskWoundPatients(limit);
      res.json({
        success: true,
        data: patients
      });
    } catch (error) {
      logger.error('Error fetching high risk wound patients', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch high risk patients'
      });
    }
  }
);

// ==================== PRESSURE ULCER RISK ROUTES ====================

/**
 * POST /risk/pressure/assess/:patientId
 * Assess pressure ulcer risk using Braden Scale
 */
router.post(
  '/pressure/assess/:patientId',
  [
    param('patientId').isString().notEmpty(),
    body('factors').isObject(),
    body('factors.sensoryPerception').isIn([1, 2, 3, 4]),
    body('factors.moisture').isIn([1, 2, 3, 4]),
    body('factors.activity').isIn([1, 2, 3, 4]),
    body('factors.mobility').isIn([1, 2, 3, 4]),
    body('factors.nutrition').isIn([1, 2, 3, 4]),
    body('factors.frictionShear').isIn([1, 2, 3]),
    body('assessedBy').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const assessment = await woundRiskService.assessPressureUlcerRisk(patientId, req.body);
      res.status(201).json({
        success: true,
        data: assessment
      });
    } catch (error) {
      logger.error('Error assessing pressure ulcer risk', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to assess pressure ulcer risk'
      });
    }
  }
);

/**
 * GET /risk/pressure/:patientId
 * Get pressure ulcer risk history
 */
router.get(
  '/pressure/:patientId',
  [param('patientId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const history = await woundRiskService.getPressureUlcerHistory(patientId);
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching pressure ulcer history', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pressure ulcer history'
      });
    }
  }
);

// ==================== DETERIORATION ROUTES ====================

/**
 * POST /risk/deterioration/monitor/:patientId
 * Monitor vitals and detect deterioration
 */
router.post(
  '/deterioration/monitor/:patientId',
  [
    param('patientId').isString().notEmpty(),
    body('vitals').isObject()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const result = await deteriorationService.monitorVitals(patientId, req.body.vitals);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error monitoring vitals', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to monitor vitals'
      });
    }
  }
);

/**
 * GET /risk/deterioration/:patientId
 * Get deterioration status for a patient
 */
router.get(
  '/deterioration/:patientId',
  [param('patientId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const signal = await deteriorationService.detectDeterioration(patientId);
      res.json({
        success: true,
        data: signal
      });
    } catch (error) {
      logger.error('Error fetching deterioration status', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch deterioration status'
      });
    }
  }
);

/**
 * GET /risk/deterioration/:patientId/history
 * Get deterioration history
 */
router.get(
  '/deterioration/:patientId/history',
  [
    param('patientId').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const type = req.query.type as DeteriorationType | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const history = await deteriorationService.getDeteriorationHistory(patientId, type, limit);
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching deterioration history', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch deterioration history'
      });
    }
  }
);

/**
 * GET /risk/deterioration/:patientId/trend
 * Get deterioration trend
 */
router.get(
  '/deterioration/:patientId/trend',
  [
    param('patientId').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const days = parseInt(req.query.days as string) || 7;
      const trend = await deteriorationService.getDeteriorationTrend(patientId, days);
      res.json({
        success: true,
        data: trend
      });
    } catch (error) {
      logger.error('Error fetching deterioration trend', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch deterioration trend'
      });
    }
  }
);

/**
 * POST /risk/deterioration/:patientId/acknowledge/:signalId
 * Acknowledge a deterioration signal
 */
router.post(
  '/deterioration/:patientId/acknowledge/:signalId',
  [
    param('patientId').isString().notEmpty(),
    param('signalId').isString().notEmpty(),
    body('acknowledgedBy').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { signalId } = req.params;
      await deteriorationService.acknowledgeSignal(signalId, req.body.acknowledgedBy);
      res.json({
        success: true,
        message: 'Signal acknowledged'
      });
    } catch (error) {
      logger.error('Error acknowledging signal', { error, signalId: req.params.signalId });
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge signal'
      });
    }
  }
);

/**
 * POST /risk/deterioration/:patientId/resolve/:signalId
 * Resolve a deterioration signal
 */
router.post(
  '/deterioration/:patientId/resolve/:signalId',
  [
    param('patientId').isString().notEmpty(),
    param('signalId').isString().notEmpty(),
    body('respondedBy').isString().notEmpty(),
    body('notes').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { signalId } = req.params;
      await deteriorationService.resolveSignal(signalId, req.body.respondedBy, req.body.notes);
      res.json({
        success: true,
        message: 'Signal resolved'
      });
    } catch (error) {
      logger.error('Error resolving signal', { error, signalId: req.params.signalId });
      res.status(500).json({
        success: false,
        error: 'Failed to resolve signal'
      });
    }
  }
);

/**
 * GET /risk/deterioration/active
 * Get active deterioration alerts
 */
router.get(
  '/deterioration/active',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const alerts = await deteriorationService.getActiveDeteriorationAlerts();
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error fetching active deterioration alerts', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active alerts'
      });
    }
  }
);

// ==================== SAFEGUARDING ROUTES ====================

/**
 * POST /risk/safeguarding/assess/:patientId
 * Assess safeguarding risk
 */
router.post(
  '/safeguarding/assess/:patientId',
  [
    param('patientId').isString().notEmpty(),
    body('concernType').isIn(Object.values(SafeguardingConcernType)),
    body('vulnerabilities').isArray(),
    body('riskIndicators').isObject(),
    body('assessedBy').optional().isString()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const result = await safeguardingRiskService.assessSafeguardingRisk(patientId, req.body);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error assessing safeguarding risk', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to assess safeguarding risk'
      });
    }
  }
);

/**
 * GET /risk/safeguarding/:patientId
 * Get latest safeguarding risk for a patient
 */
router.get(
  '/safeguarding/:patientId',
  [param('patientId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const risk = await safeguardingRiskService.getLatestSafeguardingRisk(patientId);
      if (!risk) {
        res.status(404).json({
          success: false,
          error: 'No safeguarding risk assessment found'
        });
        return;
      }
      res.json({
        success: true,
        data: risk
      });
    } catch (error) {
      logger.error('Error fetching safeguarding risk', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch safeguarding risk'
      });
    }
  }
);

/**
 * GET /risk/safeguarding/:patientId/history
 * Get safeguarding history
 */
router.get(
  '/safeguarding/:patientId/history',
  [
    param('patientId').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await safeguardingRiskService.getSafeguardingHistory(patientId, limit);
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching safeguarding history', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch safeguarding history'
      });
    }
  }
);

/**
 * GET /risk/safeguarding/vulnerabilities/:patientId
 * Identify vulnerabilities for a patient
 */
router.get(
  '/safeguarding/vulnerabilities/:patientId',
  [param('patientId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const vulnerabilities = await safeguardingRiskService.identifyVulnerabilities(patientId);
      res.json({
        success: true,
        data: vulnerabilities
      });
    } catch (error) {
      logger.error('Error identifying vulnerabilities', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to identify vulnerabilities'
      });
    }
  }
);

/**
 * POST /risk/safeguarding/:patientId/flag
 * Flag patient for safeguarding review
 */
router.post(
  '/safeguarding/:patientId/flag',
  [
    param('patientId').isString().notEmpty(),
    body('concern').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      await safeguardingRiskService.flagForReview(patientId, req.body.concern);
      res.json({
        success: true,
        message: 'Patient flagged for review'
      });
    } catch (error) {
      logger.error('Error flagging patient', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to flag patient for review'
      });
    }
  }
);

/**
 * GET /risk/safeguarding/flagged
 * Get all flagged safeguarding cases
 */
router.get(
  '/safeguarding/flagged',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const cases = await safeguardingRiskService.getFlaggedCases();
      res.json({
        success: true,
        data: cases
      });
    } catch (error) {
      logger.error('Error fetching flagged cases', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch flagged cases'
      });
    }
  }
);

/**
 * GET /risk/safeguarding/statistics
 * Get safeguarding statistics
 */
router.get(
  '/safeguarding/statistics',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const statistics = await safeguardingRiskService.getStatistics();
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error fetching safeguarding statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }
);

// ==================== ALERTS ROUTES ====================

/**
 * GET /risk/alerts/:patientId
 * Get alerts for a patient
 */
router.get(
  '/alerts/:patientId',
  [
    param('patientId').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const riskType = req.query.type as 'fall' | 'wound' | 'deterioration' | 'safeguarding' | undefined;
      const status = req.query.status as 'pending' | 'sent' | 'acknowledged' | 'responded' | 'resolved' | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      const alerts = await alertService.getPatientAlerts(patientId, riskType, status, limit);
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error fetching alerts', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts'
      });
    }
  }
);

/**
 * GET /risk/alerts
 * Get active alerts
 */
router.get(
  '/alerts',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const riskType = req.query.type as string | undefined;
      const alerts = await alertService.getActiveAlerts(riskType);
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error fetching active alerts', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active alerts'
      });
    }
  }
);

/**
 * POST /risk/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post(
  '/alerts/:alertId/acknowledge',
  [
    param('alertId').isString().notEmpty(),
    body('acknowledgedBy').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await alertService.acknowledgeAlert(req.params.alertId, req.body.acknowledgedBy);
      res.json({
        success: true,
        message: 'Alert acknowledged'
      });
    } catch (error) {
      logger.error('Error acknowledging alert', { error, alertId: req.params.alertId });
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      });
    }
  }
);

/**
 * POST /risk/alerts/:alertId/respond
 * Respond to an alert
 */
router.post(
  '/alerts/:alertId/respond',
  [
    param('alertId').isString().notEmpty(),
    body('response').isString().notEmpty(),
    body('respondedBy').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await alertService.respondToAlert(
        req.params.alertId,
        req.body.response,
        req.body.respondedBy
      );
      res.json({
        success: true,
        message: 'Alert response recorded'
      });
    } catch (error) {
      logger.error('Error responding to alert', { error, alertId: req.params.alertId });
      res.status(500).json({
        success: false,
        error: 'Failed to respond to alert'
      });
    }
  }
);

/**
 * POST /risk/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post(
  '/alerts/:alertId/resolve',
  [
    param('alertId').isString().notEmpty(),
    body('resolvedBy').isString().notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await alertService.resolveAlert(req.params.alertId, req.body.resolvedBy);
      res.json({
        success: true,
        message: 'Alert resolved'
      });
    } catch (error) {
      logger.error('Error resolving alert', { error, alertId: req.params.alertId });
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
  }
);

/**
 * GET /risk/alerts/statistics
 * Get alert statistics
 */
router.get(
  '/alerts/statistics',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const statistics = await alertService.getAlertStatistics();
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error fetching alert statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }
);

// ==================== CARE PLANS ROUTES ====================

/**
 * POST /risk/careplan/:patientId
 * Create care plan for a patient
 */
router.post(
  '/careplan/:patientId',
  [
    param('patientId').isString().notEmpty(),
    body('riskType').isIn(['fall', 'wound', 'deterioration', 'safeguarding']),
    body('riskLevel').isIn(Object.values(RiskLevel))
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const { riskType, riskLevel, ...input } = req.body;
      const carePlan = await alertService.createRiskCarePlan(patientId, riskType, riskLevel, input);
      res.status(201).json({
        success: true,
        data: carePlan
      });
    } catch (error) {
      logger.error('Error creating care plan', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to create care plan'
      });
    }
  }
);

/**
 * GET /risk/careplan/:patientId
 * Get care plan for a patient
 */
router.get(
  '/careplan/:patientId',
  [param('patientId').isString().notEmpty()],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const riskType = req.query.type as string | undefined;
      const carePlan = await alertService.getPatientCarePlan(patientId, riskType);
      if (!carePlan) {
        res.status(404).json({
          success: false,
          error: 'No active care plan found'
        });
        return;
      }
      res.json({
        success: true,
        data: carePlan
      });
    } catch (error) {
      logger.error('Error fetching care plan', { error, patientId: req.params.patientId });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch care plan'
      });
    }
  }
);

// ==================== CALCULATE SCORES ====================

/**
 * POST /risk/calculate/fall-score
 * Calculate fall score from factors
 */
router.post(
  '/calculate/fall-score',
  [
    body('factors').isObject()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { factors } = req.body;
      const score = fallRiskService.calculateFallScore(factors);
      const riskLevel = fallRiskService.recommendFallInterventions(
        score.totalScore < 20 ? RiskLevel.LOW :
        score.totalScore < 40 ? RiskLevel.MODERATE :
        score.totalScore < 60 ? RiskLevel.HIGH : RiskLevel.VERY_HIGH,
        factors
      );
      res.json({
        success: true,
        data: {
          ...score,
          interventions: riskLevel
        }
      });
    } catch (error) {
      logger.error('Error calculating fall score', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to calculate fall score'
      });
    }
  }
);

/**
 * POST /risk/calculate/braden-score
 * Calculate Braden score
 */
router.post(
  '/calculate/braden-score',
  [
    body('factors').isObject()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { factors } = req.body;
      const score = woundRiskService.calculateBradenScore(factors);
      const breakdown = woundRiskService.calculateBradenScoreBreakdown(factors);

      const riskLevel = score >= 19 ? RiskLevel.LOW :
        score >= 15 ? RiskLevel.MODERATE :
        score >= 10 ? RiskLevel.HIGH : RiskLevel.VERY_HIGH;

      res.json({
        success: true,
        data: {
          totalScore: score,
          ...breakdown,
          riskLevel
        }
      });
    } catch (error) {
      logger.error('Error calculating Braden score', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to calculate Braden score'
      });
    }
  }
);

/**
 * POST /risk/calculate/news
 * Calculate NEWS score
 */
router.post(
  '/calculate/news',
  [
    body('vitals').isObject()
  ],
  validateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { vitals } = req.body;
      const news = deteriorationService.calculateNEWS(vitals);
      res.json({
        success: true,
        data: news
      });
    } catch (error) {
      logger.error('Error calculating NEWS score', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to calculate NEWS score'
      });
    }
  }
);

export default router;
