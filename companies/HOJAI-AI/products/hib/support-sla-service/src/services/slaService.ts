/**
 * SLA Service - Business logic for SLA operations
 */

import { v4 as uuidv4 } from 'uuid';
import { SLA, ISLA, SLAStatus, SLAType, SLAPriority } from '../models/SLA';
import { Breach, IBreach, BreachSeverity } from '../models/Breach';
import { Alert, IAlert, AlertType, AlertChannel, AlertStatus } from '../models/Alert';
import { Metric, IMetric } from '../models/Metric';
import logger from '../utils/logger';

export interface CreateSLAInput {
  name: string;
  description?: string;
  type: SLAType;
  priority: SLAPriority;
  category?: string;
  targetHours: number;
  warningThreshold?: number;
  ticketId?: string;
  dueAt: Date;
}

export interface SLAFilter {
  status?: SLAStatus;
  type?: SLAType;
  priority?: SLAPriority;
  category?: string;
  ticketId?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

export class SLAService {
  /**
   * Create a new SLA configuration
   */
  async createSLA(input: CreateSLAInput): Promise<ISLA> {
    const slaData: Partial<ISLA> = {
      slaId: `SLA-${uuidv4().slice(0, 8).toUpperCase()}`,
      name: input.name,
      description: input.description || '',
      type: input.type,
      priority: input.priority,
      category: input.category,
      targetHours: input.targetHours,
      warningThreshold: input.warningThreshold || 80,
      status: SLAStatus.ACTIVE,
      ticketId: input.ticketId,
      dueAt: input.dueAt,
      pausedDuration: 0,
      metadata: {},
    };

    const sla = new SLA(slaData);
    await sla.save();

    logger.info('SLA created', { slaId: sla.slaId, name: input.name, type: input.type });
    return sla;
  }

  /**
   * Get SLA by ID
   */
  async getSLAById(slaId: string): Promise<ISLA | null> {
    return SLA.findOne({ slaId }).exec();
  }

  /**
   * Get SLA for ticket
   */
  async getSLAForTicket(ticketId: string, type: SLAType): Promise<ISLA | null> {
    return SLA.findOne({ ticketId, type, status: { $ne: SLAStatus.CANCELLED } }).exec();
  }

  /**
   * Get SLAs with filters
   */
  async getSLAs(
    filter: SLAFilter,
    page = 1,
    limit = 20
  ): Promise<{ slas: ISLA[]; total: number; page: number; totalPages: number }> {
    const query: Record<string, unknown> = {};

    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.priority) query.priority = filter.priority;
    if (filter.category) query.category = filter.category;
    if (filter.ticketId) query.ticketId = filter.ticketId;
    if (filter.dueBefore) query.dueAt = { ...(query.dueAt as object || {}), $lte: filter.dueBefore };
    if (filter.dueAfter) query.dueAt = { ...(query.dueAt as object || {}), $gte: filter.dueAfter };

    const skip = (page - 1) * limit;
    const [slas, total] = await Promise.all([
      SLA.find(query).sort({ dueAt: 1 }).skip(skip).limit(limit).exec(),
      SLA.countDocuments(query).exec(),
    ]);

    return { slas, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Update SLA
   */
  async updateSLA(slaId: string, updates: Partial<ISLA>): Promise<ISLA | null> {
    const updated = await SLA.findOneAndUpdate(
      { slaId },
      { $set: updates },
      { new: true }
    ).exec();

    if (updated) {
      logger.info('SLA updated', { slaId, updates: Object.keys(updates) });
    }
    return updated;
  }

  /**
   * Mark SLA as met
   */
  async markSLAMet(slaId: string): Promise<ISLA | null> {
    const sla = await SLA.findOneAndUpdate(
      { slaId },
      {
        $set: {
          status: SLAStatus.MET,
          metAt: new Date(),
        },
      },
      { new: true }
    ).exec();

    if (sla) {
      logger.info('SLA met', { slaId });
 }
    return sla;
  }

  /**
   * Mark SLA as breached
   */
  async markSLABreached(slaId: string): Promise<ISLA | null> {
    const sla = await SLA.findOneAndUpdate(
      { slaId },
      {
        $set: {
          status: SLAStatus.BREACHED,
          breachedAt: new Date(),
        },
      },
      { new: true }
    ).exec();

    if (sla) {
      logger.info('SLA breached', { slaId });
 }
    return sla;
  }

  /**
   * Pause SLA
   */
  async pauseSLA(slaId: string): Promise<ISLA | null> {
    const sla = await SLA.findOneAndUpdate(
      { slaId, status: SLAStatus.ACTIVE },
      {
        $set: {
          status: SLAStatus.PAUSED,
          pausedAt: new Date(),
        },
      },
      { new: true }
    ).exec();

    if (sla) {
      logger.info('SLA paused', { slaId });
    }
    return sla;
  }

  /**
   * Resume SLA
   */
  async resumeSLA(slaId: string): Promise<ISLA | null> {
    const sla = await SLA.findOne({ slaId, status: SLAStatus.PAUSED }).exec();
    if (!sla || !sla.pausedAt) return null;

    const pausedMinutes = Math.floor((Date.now() - sla.pausedAt.getTime()) / 60000);
    const updated = await SLA.findOneAndUpdate(
      { slaId },
      {
        $set: {
          status: SLAStatus.ACTIVE,
          pausedAt: undefined,
        },
        $inc: { pausedDuration: pausedMinutes },
      },
      { new: true }
    ).exec();

    if (updated) {
      logger.info('SLA resumed', { slaId, pausedMinutes });
    }
    return updated;
  }

  /**
   * Get SLA status for ticket
   */
  async getSLAStatusForTicket(ticketId: string): Promise<{
    firstResponse?: ISLA;
    resolution?: ISLA;
    atRisk: boolean;
    breached: boolean;
  }> {
    const [firstResponse, resolution] = await Promise.all([
      this.getSLAForTicket(ticketId, SLAType.FIRST_RESPONSE),
      this.getSLAForTicket(ticketId, SLAType.RESOLUTION),
    ]);

    const now = Date.now();
    const atRisk = (firstResponse && firstResponse.dueAt.getTime() - now < 3600000) ||
                   (resolution && resolution.dueAt.getTime() - now < 3600000);
    const breached = (firstResponse?.status === SLAStatus.BREACHED) ||
                     (resolution?.status === SLAStatus.BREACHED);

    return { firstResponse, resolution, atRisk, breached };
  }

  /**
   * Get all SLA breaches
   */
  async getBreaches(
    page = 1,
    limit = 20,
    severity?: BreachSeverity
  ): Promise<{ breaches: IBreach[]; total: number; page: number; totalPages: number }> {
    const query: Record<string, unknown> = {};
    if (severity) query.severity = severity;

    const skip = (page - 1) * limit;
    const [breaches, total] = await Promise.all([
      Breach.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Breach.countDocuments(query).exec(),
    ]);

    return { breaches, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Record SLA breach
   */
  async recordBreach(
    sla: ISLA,
    actualMinutes: number,
    overdueMinutes: number
  ): Promise<IBreach> {
    const severity = this.calculateSeverity(sla.priority, overdueMinutes);

    const breach = new Breach({
      breachId: `BRC-${uuidv4().slice(0, 8).toUpperCase()}`,
      slaId: sla.slaId,
      ticketId: sla.ticketId || '',
      type: sla.type,
      priority: sla.priority,
      severity,
      targetHours: sla.targetHours,
      actualMinutes,
      overdueMinutes,
      metadata: {},
    });

    await breach.save();
    logger.info('SLA breach recorded', { breachId: breach.breachId, slaId: sla.slaId });
    return breach;
  }

  /**
   * Get SLA analytics
   */
  async getAnalytics(
    startDate: Date,
    endDate: Date,
    type?: SLAType,
    priority?: SLAPriority
  ): Promise<{
    totalSlas: number;
    metSlas: number;
    breachedSlas: number;
    compliance: number;
    avgResponseMinutes: number;
    avgResolutionMinutes: number;
    byPriority: Record<string, { total: number; met: number; breached: number; compliance: number }>;
  }> {
    const match: Record<string, unknown> = {
      createdAt: { $gte: startDate, $lte: endDate },
    };
    if (type) match.type = type;
    if (priority) match.priority = priority;

    const slas = await SLA.find(match).exec();

    const totalSlas = slas.length;
    const metSlas = slas.filter(s => s.status === SLAStatus.MET).length;
    const breachedSlas = slas.filter(s => s.status === SLAStatus.BREACHED).length;
    const compliance = totalSlas > 0 ? (metSlas / totalSlas) * 100 : 100;

    // Calculate averages
    const metSlasWithTime = slas.filter(s => s.metAt);
    const avgResponseMinutes = metSlasWithTime.length > 0
      ? metSlasWithTime.reduce((sum, s) => sum + (s.metAt!.getTime() - s.createdAt.getTime()) / 60000, 0) / metSlasWithTime.length
      : 0;
    const avgResolutionMinutes = avgResponseMinutes; // Simplified

    // By priority breakdown
    const byPriority: Record<string, { total: number; met: number; breached: number; compliance: number }> = {};
    for (const p of Object.values(SLAPriority)) {
      const prioritySlas = slas.filter(s => s.priority === p);
      const priorityMet = prioritySlas.filter(s => s.status === SLAStatus.MET).length;
      const priorityBreached = prioritySlas.filter(s => s.status === SLAStatus.BREACHED).length;
      byPriority[p] = {
        total: prioritySlas.length,
        met: priorityMet,
        breached: priorityBreached,
        compliance: prioritySlas.length > 0 ? (priorityMet / prioritySlas.length) * 100 : 100,
      };
    }

    return {
      totalSlas,
      metSlas,
      breachedSlas,
      compliance,
      avgResponseMinutes,
      avgResolutionMinutes,
      byPriority,
    };
  }

  /**
   * Calculate breach severity
   */
  private calculateSeverity(priority: SLAPriority, overdueMinutes: number): BreachSeverity {
    if (priority === SLAPriority.CRITICAL && overdueMinutes > 60) return BreachSeverity.CRITICAL;
    if (priority === SLAPriority.HIGH && overdueMinutes > 120) return BreachSeverity.MAJOR;
    if (overdueMinutes > 240) return BreachSeverity.MAJOR;
    return BreachSeverity.MINOR;
  }
}

export const slaService = new SLAService();
export default slaService;