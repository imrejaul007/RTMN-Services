import { v4 as uuidv4 } from 'uuid';
import { SLA, SLAViolation, SLAAlertConfig } from '../models';

export class SLAService {
  async createSLA(data: {
    tenantId: string;
    name: string;
    channel?: string;
    priority?: string;
    responseTimeSeconds: number;
    firstResponseTimeSeconds?: number;
    resolutionTimeSeconds?: number;
  }): Promise<any> {
    const sla = new SLA({
      slaId: `sla_${uuidv4()}`,
      ...data
    });
    await sla.save();
    return sla;
  }

  async getSLA(slaId: string, tenantId: string): Promise<any> {
    return SLA.findOne({ slaId, tenantId });
  }

  async getSLAs(tenantId: string): Promise<any[]> {
    return SLA.find({ tenantId, enabled: true });
  }

  async updateSLA(slaId: string, tenantId: string, updates: any): Promise<any> {
    return SLA.findOneAndUpdate({ slaId, tenantId }, updates, { new: true });
  }

  async checkCompliance(data: {
    tenantId: string;
    conversationId: string;
    channel: string;
    priority: string;
    responseTimeSeconds: number;
    firstResponseTimeSeconds?: number;
    resolutionTimeSeconds?: number;
  }): Promise<{ violations: any[] }> {
    const violations: any[] = [];

    // Find matching SLA
    const sla = await SLA.findOne({
      tenantId: data.tenantId,
      channel: { $in: ['all', data.channel] },
      priority: { $in: ['all', data.priority] },
      enabled: true
    });

    if (!sla) return { violations };

    // Check response time
    if (sla.responseTimeSeconds && data.responseTimeSeconds > sla.responseTimeSeconds) {
      const violation = await this.recordViolation({
        tenantId: data.tenantId,
        slaId: sla.slaId,
        conversationId: data.conversationId,
        type: 'response_time',
        thresholdSeconds: sla.responseTimeSeconds,
        actualSeconds: data.responseTimeSeconds
      });
      violations.push(violation);
    }

    // Check first response time
    if (sla.firstResponseTimeSeconds && data.firstResponseTimeSeconds &&
        data.firstResponseTimeSeconds > sla.firstResponseTimeSeconds) {
      const violation = await this.recordViolation({
        tenantId: data.tenantId,
        slaId: sla.slaId,
        conversationId: data.conversationId,
        type: 'first_response',
        thresholdSeconds: sla.firstResponseTimeSeconds,
        actualSeconds: data.firstResponseTimeSeconds
      });
      violations.push(violation);
    }

    // Check resolution time
    if (sla.resolutionTimeSeconds && data.resolutionTimeSeconds &&
        data.resolutionTimeSeconds > sla.resolutionTimeSeconds) {
      const violation = await this.recordViolation({
        tenantId: data.tenantId,
        slaId: sla.slaId,
        conversationId: data.conversationId,
        type: 'resolution_time',
        thresholdSeconds: sla.resolutionTimeSeconds,
        actualSeconds: data.resolutionTimeSeconds
      });
      violations.push(violation);
    }

    return { violations };
  }

  private async recordViolation(data: {
    tenantId: string;
    slaId: string;
    conversationId: string;
    type: string;
    thresholdSeconds: number;
    actualSeconds: number;
  }): Promise<any> {
    const violation = new SLAViolation({
      violationId: `viol_${uuidv4()}`,
      ...data,
      occurredAt: new Date()
    });
    await violation.save();

    // Check if alert should be sent
    await this.checkAndSendAlert(data.tenantId, data.slaId);

    return violation;
  }

  private async checkAndSendAlert(tenantId: string, slaId: string): Promise<void> {
    const config = await SLAAlertConfig.findOne({ tenantId, slaId });
    if (!config) return;

    // Get violation count in last hour
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentViolations = await SLAViolation.countDocuments({
      tenantId,
      slaId,
      occurredAt: { $gte: oneHourAgo }
    });

    // Calculate compliance rate
    const total = await SLAViolation.countDocuments({ tenantId, slaId });
    const violations = await SLAViolation.countDocuments({ tenantId, slaId });
    const complianceRate = total > 0 ? ((total - violations) / total) * 100 : 100;

    if (complianceRate < config.thresholdPercent) {
      console.log(`[SLA] Alert: Compliance ${complianceRate.toFixed(1)}% below ${config.thresholdPercent}% threshold`);
      // In production, send notification via configured channels
    }
  }

  async getViolations(tenantId: string, options: {
    slaId?: string;
    acknowledged?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<any[]> {
    const query: any = { tenantId };
    if (options.slaId) query.slaId = options.slaId;
    if (options.acknowledged !== undefined) query.acknowledged = options.acknowledged;
    if (options.startDate || options.endDate) {
      query.occurredAt = {};
      if (options.startDate) query.occurredAt.$gte = options.startDate;
      if (options.endDate) query.occurredAt.$lte = options.endDate;
    }
    return SLAViolation.find(query).sort({ occurredAt: -1 }).limit(100);
  }

  async acknowledgeViolation(violationId: string, tenantId: string, agentId: string): Promise<any> {
    return SLAViolation.findOneAndUpdate(
      { violationId, tenantId },
      { acknowledged: true, acknowledgedBy: agentId, acknowledgedAt: new Date() },
      { new: true }
    );
  }

  async getStats(tenantId: string, slaId?: string): Promise<any> {
    const match: any = { tenantId };
    if (slaId) match.slaId = slaId;

    const [total, violated] = await Promise.all([
      SLAViolation.countDocuments(match),
      SLAViolation.countDocuments({ ...match, occurredAt: { $gte: new Date(Date.now() - 24 * 3600000) } })
    ]);

    const violations = await SLAViolation.find(match).sort({ occurredAt: -1 }).limit(100);

    const responseTimes = violations.filter(v => v.type === 'response_time').map(v => v.actualSeconds);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      total,
      violatedLast24h: violated,
      complianceRate: total > 0 ? ((total - violated) / total) * 100 : 100,
      avgResponseTime
    };
  }

  async createAlertConfig(data: {
    tenantId: string;
    slaId: string;
    channels: string[];
    recipients: string[];
    webhookUrl?: string;
    thresholdPercent?: number;
  }): Promise<any> {
    const config = new SLAAlertConfig({
      configId: `alert_${uuidv4()}`,
      ...data
    });
    await config.save();
    return config;
  }
}

export const slaService = new SLAService();
