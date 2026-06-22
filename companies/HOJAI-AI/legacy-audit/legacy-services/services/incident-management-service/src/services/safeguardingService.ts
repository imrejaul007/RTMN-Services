import { v4 as uuidv4 } from 'uuid';
import {
  Safeguarding,
  ISafeguarding,
  ConcernType,
  RiskLevel
} from '../models/incident';
import { logger } from '../utils/logger';
import { alertService } from './alertService';

export interface RaiseConcernDTO {
  concernType: ConcernType;
  description: string;
  vulnerablePerson: {
    personId: string;
    name: string;
    dateOfBirth?: Date;
    gender?: string;
    careType?: string;
    careLocation?: string;
  };
  concernRaisedBy: {
    userId: string;
    name: string;
    role: string;
    department?: string;
    contactNumber?: string;
  };
  incidentLinked?: string;
  immediateActions?: string[];
  attachments?: string[];
}

export interface AssessRiskDTO {
  riskScore: number;
  riskFactors: string[];
  protectiveFactors: string[];
  riskLevelJustification: string;
  assessedBy: string;
}

export interface CreateProtectionPlanDTO {
  measures: Array<{
    measure: string;
    responsibleParty: string;
    startDate: Date;
    endDate?: Date;
  }>;
  reviewDate: Date;
  nextReviewDate: Date;
  createdBy: string;
  notes?: string;
}

export interface NotifyAuthoritiesDTO {
  authorityName: string;
  contactMethod?: string;
  contactPerson?: string;
  referenceNumber?: string;
  outcome?: string;
}

export interface UpdateConcernDTO {
  description?: string;
  riskLevel?: RiskLevel;
  status?: ISafeguarding['status'];
}

export interface AddFollowUpDTO {
  scheduledDate: Date;
  purpose: string;
}

export interface AddOutcomeDTO {
  outcome: string;
  achievedBy?: string;
  notes?: string;
}

export class SafeguardingService {
  /**
   * Raise a new safeguarding concern
   */
  async raiseConcern(concernData: RaiseConcernDTO): Promise<ISafeguarding> {
    const concernId = `SGC-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Determine initial risk level based on concern type
    const initialRiskLevel = this.determineInitialRiskLevel(concernData.concernType);

    const concern = new Safeguarding({
      concernId,
      concernType: concernData.concernType,
      description: concernData.description,
      riskLevel: initialRiskLevel,
      vulnerablePerson: concernData.vulnerablePerson,
      concernRaisedBy: concernData.concernRaisedBy,
      incidentLinked: concernData.incidentLinked,
      immediateActions: (concernData.immediateActions || []).map((action) => ({
        action,
        takenBy: concernData.concernRaisedBy.userId,
        takenAt: new Date()
      })),
      status: 'raised',
      statusHistory: [
        {
          status: 'raised',
          changedBy: concernData.concernRaisedBy.userId,
          changedAt: new Date(),
          notes: 'Concern raised'
        }
      ],
      attachments: concernData.attachments || [],
      relatedConcerns: []
    });

    await concern.save();

    logger.info(`Safeguarding concern raised: ${concernId}`, {
      concernId,
      concernType: concernData.concernType,
      vulnerablePersonId: concernData.vulnerablePerson.personId,
      riskLevel: initialRiskLevel,
      raisedBy: concernData.concernRaisedBy.userId
    });

    // Trigger alerts for high-risk concerns
    if (initialRiskLevel === RiskLevel.HIGH || initialRiskLevel === RiskLevel.IMMEDIATE) {
      await alertService.triggerSafeguardingAlert(concern);
    }

    return concern;
  }

  /**
   * Get concern by ID
   */
  async getConcern(concernId: string): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found: ${concernId}`);
      return null;
    }

    return concern;
  }

  /**
   * Assess risk level for a concern
   */
  async assessRisk(concernId: string, riskAssessment: AssessRiskDTO): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for risk assessment: ${concernId}`);
      return null;
    }

    // Determine risk level from score
    const determinedRiskLevel = this.determineRiskLevelFromScore(riskAssessment.riskScore);

    concern.previousRiskLevel = concern.riskLevel;
    concern.riskLevel = determinedRiskLevel;

    concern.riskAssessment = {
      assessedBy: riskAssessment.assessedBy,
      assessmentDate: new Date(),
      riskScore: riskAssessment.riskScore,
      riskFactors: riskAssessment.riskFactors,
      protectiveFactors: riskAssessment.protectiveFactors,
      riskLevelJustification: riskAssessment.riskLevelJustification
    };

    // Update status if assessing
    if (concern.status === 'raised') {
      concern.status = 'assessing';
      concern.statusHistory.push({
        status: 'assessing',
        changedBy: riskAssessment.assessedBy,
        changedAt: new Date(),
        notes: 'Risk assessment completed'
      });
    }

    await concern.save();

    logger.info(`Risk assessed for concern: ${concernId}`, {
      concernId,
      riskScore: riskAssessment.riskScore,
      determinedRiskLevel,
      riskFactors: riskAssessment.riskFactors.length,
      protectiveFactors: riskAssessment.protectiveFactors.length
    });

    // Trigger alerts if risk increased significantly
    if (
      concern.previousRiskLevel === RiskLevel.LOW ||
      concern.previousRiskLevel === RiskLevel.MEDIUM
    ) {
      if (determinedRiskLevel === RiskLevel.HIGH || determinedRiskLevel === RiskLevel.IMMEDIATE) {
        await alertService.triggerSafeguardingAlert(concern);
      }
    }

    return concern;
  }

  /**
   * Notify authorities about a concern
   */
  async notifyAuthorities(
    concernId: string,
    notificationData: NotifyAuthoritiesDTO
  ): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for authority notification: ${concernId}`);
      return null;
    }

    const authorityRecord = {
      authorityName: notificationData.authorityName,
      contactDate: new Date(),
      contactPerson: notificationData.contactPerson,
      contactMethod: notificationData.contactMethod,
      referenceNumber: notificationData.referenceNumber,
      outcome: notificationData.outcome,
      followUpRequired: !!notificationData.referenceNumber
    };

    concern.authorities.push(authorityRecord);

    // Update status if this is first authority notification
    if (concern.status === 'assessing' || concern.status === 'raised') {
      concern.status = 'investigating';
      concern.statusHistory.push({
        status: 'investigating',
        changedBy: 'system',
        changedAt: new Date(),
        notes: `Authorities notified: ${notificationData.authorityName}`
      });
    }

    await concern.save();

    logger.info(`Authorities notified for concern: ${concernId}`, {
      concernId,
      authorityName: notificationData.authorityName,
      referenceNumber: notificationData.referenceNumber
    });

    return concern;
  }

  /**
   * Create a protection plan for a concern
   */
  async createProtectionPlan(
    concernId: string,
    planData: CreateProtectionPlanDTO
  ): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for protection plan: ${concernId}`);
      return null;
    }

    const planId = `PP-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    concern.protectionPlan = {
      planId,
      createdDate: new Date(),
      createdBy: planData.createdBy,
      measures: planData.measures.map((measure) => ({
        measure: measure.measure,
        responsibleParty: measure.responsibleParty,
        startDate: measure.startDate,
        endDate: measure.endDate,
        status: 'planned' as const
      })),
      reviewDate: planData.reviewDate,
      nextReviewDate: planData.nextReviewDate,
      status: 'draft',
      notes: planData.notes
    };

    // Update status
    concern.status = 'plan_in_place';
    concern.statusHistory.push({
      status: 'plan_in_place',
      changedBy: planData.createdBy,
      changedAt: new Date(),
      notes: 'Protection plan created'
    });

    await concern.save();

    logger.info(`Protection plan created for concern: ${concernId}`, {
      concernId,
      planId,
      measuresCount: planData.measures.length
    });

    return concern;
  }

  /**
   * Track/Update a concern
   */
  async trackConcern(
    concernId: string,
    updates: UpdateConcernDTO
  ): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for tracking: ${concernId}`);
      return null;
    }

    if (updates.description) {
      concern.description = updates.description;
    }

    if (updates.riskLevel) {
      concern.previousRiskLevel = concern.riskLevel;
      concern.riskLevel = updates.riskLevel;

      // Trigger alerts if risk increased
      if (
        concern.previousRiskLevel === RiskLevel.LOW ||
        concern.previousRiskLevel === RiskLevel.MEDIUM
      ) {
        if (updates.riskLevel === RiskLevel.HIGH || updates.riskLevel === RiskLevel.IMMEDIATE) {
          await alertService.triggerSafeguardingAlert(concern);
        }
      }
    }

    if (updates.status) {
      const statusChange = {
        status: updates.status,
        changedBy: 'system',
        changedAt: new Date(),
        notes: `Status updated to ${updates.status}`
      };
      concern.statusHistory.push(statusChange);
      concern.status = updates.status;
    }

    await concern.save();

    logger.info(`Safeguarding concern tracked: ${concernId}`, {
      concernId,
      updates: Object.keys(updates)
    });

    return concern;
  }

  /**
   * Get concerns by vulnerable person
   */
  async getConcernsByPerson(
    personId: string,
    options?: {
      status?: ISafeguarding['status'];
      riskLevel?: RiskLevel;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ concerns: ISafeguarding[]; total: number }> {
    const query: Record<string, unknown> = { 'vulnerablePerson.personId': personId };

    if (options?.status) {
      query.status = options.status;
    }
    if (options?.riskLevel) {
      query.riskLevel = options.riskLevel;
    }

    const [concerns, total] = await Promise.all([
      Safeguarding.find(query)
        .sort({ createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 50),
      Safeguarding.countDocuments(query)
    ]);

    return { concerns, total };
  }

  /**
   * Get open safeguarding concerns (not resolved or closed)
   */
  async getOpenConcerns(
    options?: {
      riskLevel?: RiskLevel;
      facilityId?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ concerns: ISafeguarding[]; total: number }> {
    const query: Record<string, unknown> = {
      status: { $nin: ['resolved', 'closed'] }
    };

    if (options?.riskLevel) {
      query.riskLevel = options.riskLevel;
    }

    const [concerns, total] = await Promise.all([
      Safeguarding.find(query)
        .sort({ riskLevel: -1, createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 100),
      Safeguarding.countDocuments(query)
    ]);

    return { concerns, total };
  }

  /**
   * Add follow-up to a concern
   */
  async addFollowUp(
    concernId: string,
    followUpData: AddFollowUpDTO
  ): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for adding follow-up: ${concernId}`);
      return null;
    }

    concern.followUpSchedule.push({
      scheduledDate: followUpData.scheduledDate,
      purpose: followUpData.purpose,
      completed: false
    });

    await concern.save();

    logger.info(`Follow-up added to concern: ${concernId}`, {
      concernId,
      scheduledDate: followUpData.scheduledDate
    });

    return concern;
  }

  /**
   * Complete a follow-up
   */
  async completeFollowUp(
    concernId: string,
    followUpIndex: number,
    completedBy: string
  ): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for completing follow-up: ${concernId}`);
      return null;
    }

    if (followUpIndex < 0 || followUpIndex >= concern.followUpSchedule.length) {
      logger.warn(`Invalid follow-up index: ${followUpIndex}`);
      return null;
    }

    concern.followUpSchedule[followUpIndex].completed = true;
    concern.followUpSchedule[followUpIndex].completedDate = new Date();
    concern.followUpSchedule[followUpIndex].completedBy = completedBy;

    await concern.save();

    logger.info(`Follow-up completed for concern: ${concernId}`, {
      concernId,
      followUpIndex
    });

    return concern;
  }

  /**
   * Add outcome to a concern
   */
  async addOutcome(
    concernId: string,
    outcomeData: AddOutcomeDTO
  ): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for adding outcome: ${concernId}`);
      return null;
    }

    concern.outcomes.push({
      outcome: outcomeData.outcome,
      achievedDate: new Date(),
      achievedBy: outcomeData.achievedBy,
      notes: outcomeData.notes
    });

    await concern.save();

    logger.info(`Outcome added to concern: ${concernId}`, {
      concernId
    });

    return concern;
  }

  /**
   * Update protection plan measure status
   */
  async updateProtectionMeasureStatus(
    concernId: string,
    measureIndex: number,
    status: 'planned' | 'active' | 'completed' | 'cancelled'
  ): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for updating measure: ${concernId}`);
      return null;
    }

    if (!concern.protectionPlan) {
      logger.warn(`No protection plan found for concern: ${concernId}`);
      return null;
    }

    if (measureIndex < 0 || measureIndex >= concern.protectionPlan.measures.length) {
      logger.warn(`Invalid measure index: ${measureIndex}`);
      return null;
    }

    concern.protectionPlan.measures[measureIndex].status = status;

    // Check if all measures are completed
    const allCompleted = concern.protectionPlan.measures.every(
      (m) => m.status === 'completed' || m.status === 'cancelled'
    );

    if (allCompleted) {
      concern.protectionPlan.status = 'under_review';
    }

    await concern.save();

    logger.info(`Protection measure status updated: ${concernId}`, {
      concernId,
      measureIndex,
      newStatus: status
    });

    return concern;
  }

  /**
   * Link related concerns
   */
  async linkRelatedConcern(
    concernId: string,
    relatedConcernId: string
  ): Promise<ISafeguarding | null> {
    const [concern, relatedConcern] = await Promise.all([
      Safeguarding.findOne({ concernId }),
      Safeguarding.findOne({ concernId: relatedConcernId })
    ]);

    if (!concern) {
      logger.warn(`Safeguarding concern not found: ${concernId}`);
      return null;
    }

    if (!relatedConcern) {
      logger.warn(`Related concern not found: ${relatedConcernId}`);
      return null;
    }

    if (!concern.relatedConcerns.includes(relatedConcernId)) {
      concern.relatedConcerns.push(relatedConcernId);
    }

    if (!relatedConcern.relatedConcerns.includes(concernId)) {
      relatedConcern.relatedConcerns.push(concernId);
      await relatedConcern.save();
    }

    await concern.save();

    logger.info(`Related concern linked: ${concernId} -> ${relatedConcernId}`, {
      concernId,
      relatedConcernId
    });

    return concern;
  }

  /**
   * Resolve a concern
   */
  async resolveConcern(
    concernId: string,
    resolution: string,
    resolvedBy: string
  ): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for resolution: ${concernId}`);
      return null;
    }

    concern.status = 'resolved';
    concern.resolution = resolution;
    concern.resolutionDate = new Date();

    concern.statusHistory.push({
      status: 'resolved',
      changedBy: resolvedBy,
      changedAt: new Date(),
      notes: 'Concern resolved'
    });

    if (concern.protectionPlan) {
      concern.protectionPlan.status = 'closed';
    }

    await concern.save();

    logger.info(`Safeguarding concern resolved: ${concernId}`, {
      concernId,
      resolvedBy
    });

    return concern;
  }

  /**
   * Close a concern (final closure after resolution)
   */
  async closeConcern(concernId: string, closedBy: string): Promise<ISafeguarding | null> {
    const concern = await Safeguarding.findOne({ concernId });

    if (!concern) {
      logger.warn(`Safeguarding concern not found for closing: ${concernId}`);
      return null;
    }

    if (concern.status !== 'resolved') {
      logger.warn(`Cannot close unresolved concern: ${concernId}`);
      return null;
    }

    concern.status = 'closed';
    concern.statusHistory.push({
      status: 'closed',
      changedBy: closedBy,
      changedAt: new Date(),
      notes: 'Concern closed'
    });

    await concern.save();

    logger.info(`Safeguarding concern closed: ${concernId}`, {
      concernId,
      closedBy
    });

    return concern;
  }

  /**
   * Get safeguarding statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byRiskLevel: Record<string, number>;
    byType: Record<string, number>;
    openCount: number;
    highRiskCount: number;
  }> {
    const dateFilter: Record<string, unknown> = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        (dateFilter.createdAt as Record<string, Date>).$gte = startDate;
      }
      if (endDate) {
        (dateFilter.createdAt as Record<string, Date>).$lte = endDate;
      }
    }

    const concerns = await Safeguarding.find(dateFilter);

    const stats = {
      total: concerns.length,
      byStatus: {} as Record<string, number>,
      byRiskLevel: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      openCount: 0,
      highRiskCount: 0
    };

    concerns.forEach((concern) => {
      // Count by status
      stats.byStatus[concern.status] = (stats.byStatus[concern.status] || 0) + 1;

      // Count by risk level
      stats.byRiskLevel[concern.riskLevel] = (stats.byRiskLevel[concern.riskLevel] || 0) + 1;

      // Count by type
      stats.byType[concern.concernType] = (stats.byType[concern.concernType] || 0) + 1;

      // Open count
      if (concern.status !== 'resolved' && concern.status !== 'closed') {
        stats.openCount++;
      }

      // High risk count
      if (
        concern.riskLevel === RiskLevel.HIGH ||
        concern.riskLevel === RiskLevel.IMMEDIATE
      ) {
        stats.highRiskCount++;
      }
    });

    return stats;
  }

  /**
   * Determine initial risk level based on concern type
   */
  private determineInitialRiskLevel(concernType: ConcernType): RiskLevel {
    const highRiskTypes = [
      ConcernType.PHYSICAL_ABUSE,
      ConcernType.SEXUAL_ABUSE,
      ConcernType.MISSING_PERSON
    ];

    const mediumRiskTypes = [
      ConcernType.EMOTIONAL_ABUSE,
      ConcernType.NEGLECT,
      ConcernType.EXPLOITATION
    ];

    if (highRiskTypes.includes(concernType)) {
      return RiskLevel.HIGH;
    }

    if (mediumRiskTypes.includes(concernType)) {
      return RiskLevel.MEDIUM;
    }

    return RiskLevel.LOW;
  }

  /**
   * Determine risk level from score (0-100)
   */
  private determineRiskLevelFromScore(score: number): RiskLevel {
    if (score >= 80) {
      return RiskLevel.IMMEDIATE;
    }
    if (score >= 50) {
      return RiskLevel.HIGH;
    }
    if (score >= 25) {
      return RiskLevel.MEDIUM;
    }
    return RiskLevel.LOW;
  }
}

export const safeguardingService = new SafeguardingService();
