import { Router, Request, Response, NextFunction } from 'express';
import { incidentService } from '../services/incidentService';
import { safeguardingService } from '../services/safeguardingService';
import { analyticsService } from '../services/analyticsService';
import { alertService } from '../services/alertService';
import { validateIncident, validateUpdateIncident, validateWitness, validateInvestigation, validateResolution, validateEscalation } from '../middleware/validation';
import { logger } from '../utils/logger';
import { IncidentType, IncidentSeverity, IncidentStatus } from '../models/incident';

const router = Router();

// Type aliases for cleaner code
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ==================== INCIDENT ROUTES ====================

/**
 * POST /incidents - Report a new incident
 */
router.post(
  '/incidents',
  validateIncident,
  asyncHandler(async (req: Request, res: Response) => {
    const incident = await incidentService.reportIncident(req.body);

    // Trigger alerts
    await alertService.triggerIncidentAlert(incident);

    logger.info(`Incident created via API: ${incident.incidentId}`);

    res.status(201).json({
      success: true,
      data: incident,
      message: 'Incident reported successfully'
    });
  })
);

/**
 * GET /incidents/trends - Get incident trends
 */
router.get(
  '/incidents/trends',
  asyncHandler(async (req: Request, res: Response) => {
    const period = (req.query.period as '7d' | '30d' | '90d' | '1y' | 'custom') || '30d';
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const trends = await analyticsService.getIncidentTrends(period, startDate, endDate);

    res.json({
      success: true,
      data: trends
    });
  })
);

/**
 * GET /incidents/by-type - Get incidents grouped by type
 */
router.get(
  '/incidents/by-type',
  asyncHandler(async (req: Request, res: Response) => {
    const facilityId = req.query.facilityId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const byType = await analyticsService.getIncidentByType(facilityId, startDate, endDate);

    res.json({
      success: true,
      data: byType
    });
  })
);

/**
 * GET /incidents/patient/:patientId - Get incidents for a patient
 */
router.get(
  '/incidents/patient/:patientId',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;
    const status = req.query.status as IncidentStatus | undefined;
    const severity = req.query.severity as IncidentSeverity | undefined;

    const result = await incidentService.getIncidentsByPatient(patientId, {
      limit,
      skip,
      status,
      severity
    });

    res.json({
      success: true,
      data: result.incidents,
      pagination: {
        total: result.total,
        limit,
        skip,
        hasMore: skip + result.incidents.length < result.total
      }
    });
  })
);

/**
 * GET /incidents/date-range - Get incidents by date range
 */
router.get(
  '/incidents/date-range',
  asyncHandler(async (req: Request, res: Response) => {
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
      return;
    }

    const facilityId = req.query.facilityId as string | undefined;
    const type = req.query.type as IncidentType | undefined;
    const severity = req.query.severity as IncidentSeverity | undefined;
    const status = req.query.status as IncidentStatus | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;

    const result = await incidentService.getIncidentsByDateRange(startDate, endDate, {
      facilityId,
      type,
      severity,
      status,
      limit,
      skip
    });

    res.json({
      success: true,
      data: result.incidents,
      pagination: {
        total: result.total,
        limit,
        skip,
        hasMore: skip + result.incidents.length < result.total
      }
    });
  })
);

/**
 * GET /incidents/open - Get all open incidents
 */
router.get(
  '/incidents/open',
  asyncHandler(async (req: Request, res: Response) => {
    const facilityId = req.query.facilityId as string | undefined;

    const result = await incidentService.getOpenIncidents(facilityId);

    res.json({
      success: true,
      data: result.incidents,
      total: result.total
    });
  })
);

/**
 * GET /incidents/facility/:facilityId - Get incidents by facility
 */
router.get(
  '/incidents/facility/:facilityId',
  asyncHandler(async (req: Request, res: Response) => {
    const { facilityId } = req.params;
    const status = req.query.status as IncidentStatus | undefined;
    const severity = req.query.severity as IncidentSeverity | undefined;
    const type = req.query.type as IncidentType | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;

    const result = await incidentService.getIncidentsByFacility(facilityId, {
      status,
      severity,
      type,
      limit,
      skip
    });

    res.json({
      success: true,
      data: result.incidents,
      pagination: {
        total: result.total,
        limit,
        skip,
        hasMore: skip + result.incidents.length < result.total
      }
    });
  })
);

/**
 * GET /incidents/:incidentId - Get incident by ID
 */
router.get(
  '/incidents/:incidentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.params;

    const incident = await incidentService.getIncident(incidentId);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
      return;
    }

    res.json({
      success: true,
      data: incident
    });
  })
);

/**
 * PUT /incidents/:incidentId - Update an incident
 */
router.put(
  '/incidents/:incidentId',
  validateUpdateIncident,
  asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.params;

    const incident = await incidentService.updateIncident(incidentId, req.body);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
      return;
    }

    logger.info(`Incident updated via API: ${incidentId}`);

    res.json({
      success: true,
      data: incident,
      message: 'Incident updated successfully'
    });
  })
);

/**
 * POST /incidents/:incidentId/witness - Add witness to incident
 */
router.post(
  '/incidents/:incidentId/witness',
  validateWitness,
  asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.params;

    const incident = await incidentService.addWitness(incidentId, req.body);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
      return;
    }

    logger.info(`Witness added to incident: ${incidentId}`);

    res.json({
      success: true,
      data: incident,
      message: 'Witness added successfully'
    });
  })
);

/**
 * POST /incidents/:incidentId/investigation - Add investigation to incident
 */
router.post(
  '/incidents/:incidentId/investigation',
  validateInvestigation,
  asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.params;

    const incident = await incidentService.addInvestigation(incidentId, req.body);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
      return;
    }

    logger.info(`Investigation added to incident: ${incidentId}`);

    res.json({
      success: true,
      data: incident,
      message: 'Investigation added successfully'
    });
  })
);

/**
 * PUT /incidents/:incidentId/resolve - Resolve an incident
 */
router.put(
  '/incidents/:incidentId/resolve',
  validateResolution,
  asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.params;

    const incident = await incidentService.resolveIncident(incidentId, req.body);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
      return;
    }

    logger.info(`Incident resolved: ${incidentId}`);

    res.json({
      success: true,
      data: incident,
      message: 'Incident resolved successfully'
    });
  })
);

/**
 * PUT /incidents/:incidentId/escalate - Escalate an incident
 */
router.put(
  '/incidents/:incidentId/escalate',
  validateEscalation,
  asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.params;

    const incident = await incidentService.escalateIncident(incidentId, req.body);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
      return;
    }

    // Notify management
    await alertService.notifyManagement(incident);

    logger.warn(`Incident escalated: ${incidentId}`);

    res.json({
      success: true,
      data: incident,
      message: 'Incident escalated successfully'
    });
  })
);

/**
 * PUT /incidents/:incidentId/close - Close an incident
 */
router.put(
  '/incidents/:incidentId/close',
  asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.params;
    const { closedBy } = req.body;

    if (!closedBy) {
      res.status(400).json({
        success: false,
        error: 'closedBy is required'
      });
      return;
    }

    const incident = await incidentService.closeIncident(incidentId, closedBy);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident not found or cannot be closed'
      });
      return;
    }

    logger.info(`Incident closed: ${incidentId}`);

    res.json({
      success: true,
      data: incident,
      message: 'Incident closed successfully'
    });
  })
);

/**
 * POST /incidents/:incidentId/notify-family - Notify family about incident
 */
router.post(
  '/incidents/:incidentId/notify-family',
  asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.params;

    const incident = await incidentService.getIncident(incidentId);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
      return;
    }

    const result = await alertService.notifyFamily(incident);

    res.json({
      success: result.success,
      data: { incidentId, familyNotified: result.success },
      message: result.message
    });
  })
);

/**
 * POST /incidents/:incidentId/note - Add note to incident
 */
router.post(
  '/incidents/:incidentId/note',
  asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.params;
    const { note } = req.body;

    if (!note) {
      res.status(400).json({
        success: false,
        error: 'Note content is required'
      });
      return;
    }

    const incident = await incidentService.addNote(incidentId, note);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
      return;
    }

    res.json({
      success: true,
      data: incident,
      message: 'Note added successfully'
    });
  })
);

// ==================== SAFEGUARDING ROUTES ====================

/**
 * POST /safeguarding/concerns - Raise a safeguarding concern
 */
router.post(
  '/safeguarding/concerns',
  asyncHandler(async (req: Request, res: Response) => {
    const concern = await safeguardingService.raiseConcern(req.body);

    logger.info(`Safeguarding concern raised via API: ${concern.concernId}`);

    res.status(201).json({
      success: true,
      data: concern,
      message: 'Safeguarding concern raised successfully'
    });
  })
);

/**
 * GET /safeguarding/concerns - Get open safeguarding concerns
 */
router.get(
  '/safeguarding/concerns',
  asyncHandler(async (req: Request, res: Response) => {
    const riskLevel = req.query.riskLevel as 'low' | 'medium' | 'high' | 'immediate' | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;

    const result = await safeguardingService.getOpenConcerns({
      riskLevel,
      limit,
      skip
    });

    res.json({
      success: true,
      data: result.concerns,
      pagination: {
        total: result.total,
        limit,
        skip,
        hasMore: skip + result.concerns.length < result.total
      }
    });
  })
);

/**
 * GET /safeguarding/concerns/:concernId - Get safeguarding concern by ID
 */
router.get(
  '/safeguarding/concerns/:concernId',
  asyncHandler(async (req: Request, res: Response) => {
    const { concernId } = req.params;

    const concern = await safeguardingService.getConcern(concernId);

    if (!concern) {
      res.status(404).json({
        success: false,
        error: 'Safeguarding concern not found'
      });
      return;
    }

    res.json({
      success: true,
      data: concern
    });
  })
);

/**
 * POST /safeguarding/concerns/:concernId/risk-assessment - Assess risk
 */
router.post(
  '/safeguarding/concerns/:concernId/risk-assessment',
  asyncHandler(async (req: Request, res: Response) => {
    const { concernId } = req.params;

    const concern = await safeguardingService.assessRisk(concernId, req.body);

    if (!concern) {
      res.status(404).json({
        success: false,
        error: 'Safeguarding concern not found'
      });
      return;
    }

    logger.info(`Risk assessed for concern: ${concernId}`);

    res.json({
      success: true,
      data: concern,
      message: 'Risk assessment completed'
    });
  })
);

/**
 * POST /safeguarding/concerns/:concernId/authorities - Notify authorities
 */
router.post(
  '/safeguarding/concerns/:concernId/authorities',
  asyncHandler(async (req: Request, res: Response) => {
    const { concernId } = req.params;

    const concern = await safeguardingService.notifyAuthorities(concernId, req.body);

    if (!concern) {
      res.status(404).json({
        success: false,
        error: 'Safeguarding concern not found'
      });
      return;
    }

    logger.info(`Authorities notified for concern: ${concernId}`);

    res.json({
      success: true,
      data: concern,
      message: 'Authorities notified successfully'
    });
  })
);

/**
 * POST /safeguarding/concerns/:concernId/protection-plan - Create protection plan
 */
router.post(
  '/safeguarding/concerns/:concernId/protection-plan',
  asyncHandler(async (req: Request, res: Response) => {
    const { concernId } = req.params;

    const concern = await safeguardingService.createProtectionPlan(concernId, req.body);

    if (!concern) {
      res.status(404).json({
        success: false,
        error: 'Safeguarding concern not found'
      });
      return;
    }

    logger.info(`Protection plan created for concern: ${concernId}`);

    res.json({
      success: true,
      data: concern,
      message: 'Protection plan created successfully'
    });
  })
);

/**
 * PUT /safeguarding/concerns/:concernId/track - Track/update concern
 */
router.put(
  '/safeguarding/concerns/:concernId/track',
  asyncHandler(async (req: Request, res: Response) => {
    const { concernId } = req.params;

    const concern = await safeguardingService.trackConcern(concernId, req.body);

    if (!concern) {
      res.status(404).json({
        success: false,
        error: 'Safeguarding concern not found'
      });
      return;
    }

    res.json({
      success: true,
      data: concern,
      message: 'Concern updated successfully'
    });
  })
);

/**
 * POST /safeguarding/concerns/:concernId/follow-up - Add follow-up
 */
router.post(
  '/safeguarding/concerns/:concernId/follow-up',
  asyncHandler(async (req: Request, res: Response) => {
    const { concernId } = req.params;

    const concern = await safeguardingService.addFollowUp(concernId, req.body);

    if (!concern) {
      res.status(404).json({
        success: false,
        error: 'Safeguarding concern not found'
      });
      return;
    }

    res.json({
      success: true,
      data: concern,
      message: 'Follow-up added successfully'
    });
  })
);

/**
 * PUT /safeguarding/concerns/:concernId/resolve - Resolve concern
 */
router.put(
  '/safeguarding/concerns/:concernId/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const { concernId } = req.params;
    const { resolution, resolvedBy } = req.body;

    if (!resolution || !resolvedBy) {
      res.status(400).json({
        success: false,
        error: 'Resolution and resolvedBy are required'
      });
      return;
    }

    const concern = await safeguardingService.resolveConcern(concernId, resolution, resolvedBy);

    if (!concern) {
      res.status(404).json({
        success: false,
        error: 'Safeguarding concern not found'
      });
      return;
    }

    logger.info(`Safeguarding concern resolved: ${concernId}`);

    res.json({
      success: true,
      data: concern,
      message: 'Concern resolved successfully'
    });
  })
);

/**
 * GET /safeguarding/person/:personId - Get concerns by person
 */
router.get(
  '/safeguarding/person/:personId',
  asyncHandler(async (req: Request, res: Response) => {
    const { personId } = req.params;
    const status = req.query.status as string | undefined;
    const riskLevel = req.query.riskLevel as 'low' | 'medium' | 'high' | 'immediate' | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;

    const result = await safeguardingService.getConcernsByPerson(personId, {
      status: status as 'raised' | 'assessing' | 'investigating' | 'plan_in_place' | 'resolved' | 'closed' | undefined,
      riskLevel,
      limit,
      skip
    });

    res.json({
      success: true,
      data: result.concerns,
      pagination: {
        total: result.total,
        limit,
        skip,
        hasMore: skip + result.concerns.length < result.total
      }
    });
  })
);

/**
 * GET /safeguarding/statistics - Get safeguarding statistics
 */
router.get(
  '/safeguarding/statistics',
  asyncHandler(async (req: Request, res: Response) => {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const statistics = await safeguardingService.getStatistics(startDate, endDate);

    res.json({
      success: true,
      data: statistics
    });
  })
);

// ==================== ANALYTICS ROUTES ====================

/**
 * GET /analytics/report - Generate incident report
 */
router.get(
  '/analytics/report',
  asyncHandler(async (req: Request, res: Response) => {
    const period = (req.query.period as '7d' | '30d' | '90d' | '1y' | 'custom') || '30d';
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const facilityId = req.query.facilityId as string | undefined;

    const report = await analyticsService.generateIncidentReport(
      period,
      startDate,
      endDate,
      facilityId
    );

    res.json({
      success: true,
      data: report
    });
  })
);

/**
 * GET /analytics/risk-score/:patientId - Get patient risk score
 */
router.get(
  '/analytics/risk-score/:patientId',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId } = req.params;
    const lookbackDays = req.query.lookbackDays
      ? parseInt(req.query.lookbackDays as string, 10)
      : 90;

    const riskScore = await analyticsService.calculateRiskScore(patientId, lookbackDays);

    res.json({
      success: true,
      data: riskScore
    });
  })
);

/**
 * GET /analytics/compliance - Get compliance metrics
 */
router.get(
  '/analytics/compliance',
  asyncHandler(async (req: Request, res: Response) => {
    const facilityId = req.query.facilityId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const metrics = await analyticsService.getComplianceMetrics(facilityId, startDate, endDate);

    res.json({
      success: true,
      data: metrics
    });
  })
);

/**
 * GET /analytics/locations - Get incidents by location
 */
router.get(
  '/analytics/locations',
  asyncHandler(async (req: Request, res: Response) => {
    const facilityId = req.query.facilityId as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const locations = await analyticsService.getIncidentsByLocation(facilityId, startDate, endDate);

    res.json({
      success: true,
      data: locations
    });
  })
);

/**
 * GET /analytics/staff - Get staff performance metrics
 */
router.get(
  '/analytics/staff',
  asyncHandler(async (req: Request, res: Response) => {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const metrics = await analyticsService.getStaffPerformanceMetrics(startDate, endDate);

    res.json({
      success: true,
      data: metrics
    });
  })
);

export default router;
