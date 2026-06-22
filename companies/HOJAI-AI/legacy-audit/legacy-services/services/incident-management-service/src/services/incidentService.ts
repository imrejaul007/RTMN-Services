import { v4 as uuidv4 } from 'uuid';
import {
  Incident,
  IIncident,
  IIncidentWitness,
  IIncidentInvestigation,
  IncidentType,
  IncidentSeverity,
  IncidentStatus
} from '../models/incident';
import { logger } from '../utils/logger';

export interface CreateIncidentDTO {
  patientId: string;
  patientName: string;
  facilityId: string;
  facilityName: string;
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  location: {
    building?: string;
    floor?: string;
    room?: string;
    area: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  incidentDate: Date;
  incidentTime: string;
  reportedBy: {
    userId: string;
    name: string;
    role: string;
    department?: string;
  };
  injuries?: Array<{
    type: string;
    bodyPart: string;
    severity: string;
    description?: string;
    treatmentRequired?: boolean;
    treatmentGiven?: string;
    medicalAttentionRequired?: boolean;
  }>;
  tags?: string[];
  regulatoryReportable?: boolean;
  attachments?: string[];
}

export interface UpdateIncidentDTO {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  location?: {
    building?: string;
    floor?: string;
    room?: string;
    area: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  injuries?: Array<{
    type: string;
    bodyPart: string;
    severity: string;
    description?: string;
    treatmentRequired?: boolean;
    treatmentGiven?: string;
    medicalAttentionRequired?: boolean;
  }>;
  tags?: string[];
  regulatoryReportable?: boolean;
  regulatoryReportNumber?: string;
  policeNotified?: boolean;
  familyNotified?: boolean;
  notes?: string[];
}

export interface AddWitnessDTO {
  witnessId: string;
  witnessName: string;
  witnessRole: string;
  statement: string;
  timeOfObservation: Date;
  contactNumber?: string;
  isPrimaryWitness?: boolean;
  attachments?: string[];
}

export interface AddInvestigationDTO {
  investigatorId: string;
  investigatorName: string;
  investigatorRole: string;
  findings: string;
  rootCause?: string;
  contributingFactors?: string[];
  recommendations: string[];
  correctiveActions?: Array<{
    action: string;
    assignedTo: string;
    dueDate: Date;
    status?: 'pending' | 'in_progress' | 'completed';
  }>;
}

export interface ResolveIncidentDTO {
  resolvedBy: string;
  resolvedByName: string;
  resolutionSummary: string;
  followUpRequired?: boolean;
  followUpDate?: Date;
}

export interface EscalateIncidentDTO {
  escalatedBy: string;
  escalatedByName: string;
  escalatedTo: string;
  escalationReason: string;
}

export class IncidentService {
  /**
   * Report a new incident
   */
  async reportIncident(incidentData: CreateIncidentDTO): Promise<IIncident> {
    const incidentId = `INC-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const incident = new Incident({
      incidentId,
      ...incidentData,
      status: IncidentStatus.REPORTED,
      reportedDate: new Date(),
      lastModified: new Date(),
      injuries: incidentData.injuries || [],
      tags: incidentData.tags || [],
      regulatoryReportable: incidentData.regulatoryReportable || false,
      attachments: incidentData.attachments || [],
      notes: [],
      priority: this.calculatePriority(incidentData.severity, incidentData.type),
      isActive: true
    });

    await incident.save();

    logger.info(`Incident reported: ${incidentId}`, {
      incidentId,
      patientId: incidentData.patientId,
      type: incidentData.type,
      severity: incidentData.severity,
      reportedBy: incidentData.reportedBy.userId
    });

    return incident;
  }

  /**
   * Get incident by ID
   */
  async getIncident(incidentId: string): Promise<IIncident | null> {
    const incident = await Incident.findOne({ incidentId, isActive: true });

    if (!incident) {
      logger.warn(`Incident not found: ${incidentId}`);
      return null;
    }

    return incident;
  }

  /**
   * Get all incidents for a patient
   */
  async getIncidentsByPatient(
    patientId: string,
    options?: {
      limit?: number;
      skip?: number;
      status?: IncidentStatus;
      severity?: IncidentSeverity;
    }
  ): Promise<{ incidents: IIncident[]; total: number }> {
    const query: Record<string, unknown> = { patientId, isActive: true };

    if (options?.status) {
      query.status = options.status;
    }
    if (options?.severity) {
      query.severity = options.severity;
    }

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .sort({ incidentDate: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 50),
      Incident.countDocuments(query)
    ]);

    return { incidents, total };
  }

  /**
   * Get incidents by date range
   */
  async getIncidentsByDateRange(
    startDate: Date,
    endDate: Date,
    options?: {
      facilityId?: string;
      type?: IncidentType;
      severity?: IncidentSeverity;
      status?: IncidentStatus;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ incidents: IIncident[]; total: number }> {
    const query: Record<string, unknown> = {
      incidentDate: {
        $gte: startDate,
        $lte: endDate
      },
      isActive: true
    };

    if (options?.facilityId) {
      query.facilityId = options.facilityId;
    }
    if (options?.type) {
      query.type = options.type;
    }
    if (options?.severity) {
      query.severity = options.severity;
    }
    if (options?.status) {
      query.status = options.status;
    }

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .sort({ incidentDate: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 100),
      Incident.countDocuments(query)
    ]);

    return { incidents, total };
  }

  /**
   * Update an incident
   */
  async updateIncident(
    incidentId: string,
    updates: UpdateIncidentDTO
  ): Promise<IIncident | null> {
    const incident = await Incident.findOneAndUpdate(
      { incidentId, isActive: true },
      {
        ...updates,
        lastModified: new Date()
      },
      { new: true }
    );

    if (!incident) {
      logger.warn(`Incident not found for update: ${incidentId}`);
      return null;
    }

    // Recalculate priority if severity changed
    if (updates.severity) {
      incident.priority = this.calculatePriority(updates.severity, incident.type);
      await incident.save();
    }

    logger.info(`Incident updated: ${incidentId}`, {
      incidentId,
      updates: Object.keys(updates)
    });

    return incident;
  }

  /**
   * Add witness to an incident
   */
  async addWitness(
    incidentId: string,
    witnessData: AddWitnessDTO
  ): Promise<IIncident | null> {
    const incident = await Incident.findOne({ incidentId, isActive: true });

    if (!incident) {
      logger.warn(`Incident not found for adding witness: ${incidentId}`);
      return null;
    }

    const witness: IIncidentWitness = {
      witnessId: witnessData.witnessId,
      witnessName: witnessData.witnessName,
      witnessRole: witnessData.witnessRole,
      statement: witnessData.statement,
      timeOfObservation: witnessData.timeOfObservation,
      contactNumber: witnessData.contactNumber,
      isPrimaryWitness: witnessData.isPrimaryWitness || false,
      attachments: witnessData.attachments || []
    };

    incident.witnesses.push(witness);
    incident.lastModified = new Date();
    await incident.save();

    logger.info(`Witness added to incident: ${incidentId}`, {
      incidentId,
      witnessId: witnessData.witnessId
    });

    return incident;
  }

  /**
   * Add investigation details to an incident
   */
  async addInvestigation(
    incidentId: string,
    investigationData: AddInvestigationDTO
  ): Promise<IIncident | null> {
    const incident = await Incident.findOne({ incidentId, isActive: true });

    if (!incident) {
      logger.warn(`Incident not found for adding investigation: ${incidentId}`);
      return null;
    }

    const investigation: IIncidentInvestigation = {
      investigatorId: investigationData.investigatorId,
      investigatorName: investigationData.investigatorName,
      investigatorRole: investigationData.investigatorRole,
      startDate: new Date(),
      findings: investigationData.findings,
      rootCause: investigationData.rootCause,
      contributingFactors: investigationData.contributingFactors || [],
      recommendations: investigationData.recommendations,
      correctiveActions: (investigationData.correctiveActions || []).map((action) => ({
        ...action,
        status: action.status || 'pending'
      })),
      status: 'in_progress'
    };

    incident.investigation = investigation;
    incident.status = IncidentStatus.INVESTIGATING;
    incident.lastModified = new Date();
    await incident.save();

    logger.info(`Investigation added to incident: ${incidentId}`, {
      incidentId,
      investigatorId: investigationData.investigatorId
    });

    return incident;
  }

  /**
   * Resolve an incident
   */
  async resolveIncident(
    incidentId: string,
    resolutionData: ResolveIncidentDTO
  ): Promise<IIncident | null> {
    const incident = await Incident.findOne({ incidentId, isActive: true });

    if (!incident) {
      logger.warn(`Incident not found for resolution: ${incidentId}`);
      return null;
    }

    incident.resolution = {
      resolvedBy: resolutionData.resolvedBy,
      resolvedByName: resolutionData.resolvedByName,
      resolutionDate: new Date(),
      resolutionSummary: resolutionData.resolutionSummary,
      followUpRequired: resolutionData.followUpRequired || false,
      followUpDate: resolutionData.followUpDate
    };

    incident.status = IncidentStatus.RESOLVED;
    incident.lastModified = new Date();
    await incident.save();

    logger.info(`Incident resolved: ${incidentId}`, {
      incidentId,
      resolvedBy: resolutionData.resolvedBy
    });

    return incident;
  }

  /**
   * Escalate an incident
   */
  async escalateIncident(
    incidentId: string,
    escalationData: EscalateIncidentDTO
  ): Promise<IIncident | null> {
    const incident = await Incident.findOne({ incidentId, isActive: true });

    if (!incident) {
      logger.warn(`Incident not found for escalation: ${incidentId}`);
      return null;
    }

    const previousSeverity = incident.severity;

    incident.escalation = {
      escalatedBy: escalationData.escalatedBy,
      escalatedByName: escalationData.escalatedByName,
      escalationDate: new Date(),
      escalatedTo: escalationData.escalatedTo,
      escalationReason: escalationData.escalationReason,
      previousSeverity
    };

    // Escalate severity if not already critical
    if (incident.severity !== IncidentSeverity.CRITICAL) {
      incident.severity = this.escalateSeverity(incident.severity);
    }

    incident.status = IncidentStatus.ESCALATED;
    incident.lastModified = new Date();
    incident.priority = this.calculatePriority(incident.severity, incident.type);
    await incident.save();

    logger.warn(`Incident escalated: ${incidentId}`, {
      incidentId,
      escalatedTo: escalationData.escalatedTo,
      previousSeverity,
      newSeverity: incident.severity
    });

    return incident;
  }

  /**
   * Close an incident
   */
  async closeIncident(incidentId: string, closedBy: string): Promise<IIncident | null> {
    const incident = await Incident.findOne({ incidentId, isActive: true });

    if (!incident) {
      logger.warn(`Incident not found for closing: ${incidentId}`);
      return null;
    }

    if (incident.status !== IncidentStatus.RESOLVED) {
      logger.warn(`Cannot close unresolved incident: ${incidentId}`);
      return null;
    }

    incident.status = IncidentStatus.CLOSED;
    incident.isActive = false;
    incident.lastModified = new Date();
    await incident.save();

    logger.info(`Incident closed: ${incidentId}`, {
      incidentId,
      closedBy
    });

    return incident;
  }

  /**
   * Get incidents by facility
   */
  async getIncidentsByFacility(
    facilityId: string,
    options?: {
      status?: IncidentStatus;
      severity?: IncidentSeverity;
      type?: IncidentType;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ incidents: IIncident[]; total: number }> {
    const query: Record<string, unknown> = { facilityId, isActive: true };

    if (options?.status) {
      query.status = options.status;
    }
    if (options?.severity) {
      query.severity = options.severity;
    }
    if (options?.type) {
      query.type = options.type;
    }

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .sort({ incidentDate: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 100),
      Incident.countDocuments(query)
    ]);

    return { incidents, total };
  }

  /**
   * Get open incidents (not closed)
   */
  async getOpenIncidents(
    facilityId?: string
  ): Promise<{ incidents: IIncident[]; total: number }> {
    const query: Record<string, unknown> = {
      isActive: true,
      status: { $nin: [IncidentStatus.CLOSED] }
    };

    if (facilityId) {
      query.facilityId = facilityId;
    }

    const [incidents, total] = await Promise.all([
      Incident.find(query).sort({ priority: -1, incidentDate: -1 }),
      Incident.countDocuments(query)
    ]);

    return { incidents, total };
  }

  /**
   * Link safeguarding concern to incident
   */
  async linkSafeguardingConcern(
    incidentId: string,
    safeguardingConcernId: string
  ): Promise<IIncident | null> {
    const incident = await Incident.findOneAndUpdate(
      { incidentId, isActive: true },
      {
        safeguardingConcernId,
        lastModified: new Date()
      },
      { new: true }
    );

    if (!incident) {
      logger.warn(`Incident not found for linking safeguarding concern: ${incidentId}`);
      return null;
    }

    logger.info(`Safeguarding concern linked to incident: ${incidentId}`, {
      incidentId,
      safeguardingConcernId
    });

    return incident;
  }

  /**
   * Add note to incident
   */
  async addNote(incidentId: string, note: string): Promise<IIncident | null> {
    const incident = await Incident.findOneAndUpdate(
      { incidentId, isActive: true },
      {
        $push: { notes: note },
        lastModified: new Date()
      },
      { new: true }
    );

    if (!incident) {
      logger.warn(`Incident not found for adding note: ${incidentId}`);
      return null;
    }

    return incident;
  }

  /**
   * Calculate priority based on severity and type
   */
  private calculatePriority(severity: IncidentSeverity, type: IncidentType): number {
    const severityScores: Record<IncidentSeverity, number> = {
      [IncidentSeverity.CRITICAL]: 100,
      [IncidentSeverity.MAJOR]: 75,
      [IncidentSeverity.MODERATE]: 50,
      [IncidentSeverity.MINOR]: 25
    };

    const typeScores: Record<IncidentType, number> = {
      [IncidentType.SAFEGUARDING]: 30,
      [IncidentType.ELOPEMENT]: 25,
      [IncidentType.AGGRESSION]: 20,
      [IncidentType.MEDICATION_ERROR]: 20,
      [IncidentType.FALL]: 10,
      [IncidentType.WOUND]: 10,
      [IncidentType.EQUIPMENT]: 5,
      [IncidentType.OTHER]: 0
    };

    return severityScores[severity] + (typeScores[type] || 0);
  }

  /**
   * Escalate severity to next level
   */
  private escalateSeverity(severity: IncidentSeverity): IncidentSeverity {
    const escalationOrder: IncidentSeverity[] = [
      IncidentSeverity.MINOR,
      IncidentSeverity.MODERATE,
      IncidentSeverity.MAJOR,
      IncidentSeverity.CRITICAL
    ];

    const currentIndex = escalationOrder.indexOf(severity);
    if (currentIndex < escalationOrder.length - 1) {
      return escalationOrder[currentIndex + 1];
    }
    return IncidentSeverity.CRITICAL;
  }
}

export const incidentService = new IncidentService();
