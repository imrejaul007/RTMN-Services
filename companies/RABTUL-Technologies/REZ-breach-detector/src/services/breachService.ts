// Breach Service - Core breach detection
import { v4 as uuidv4 } from 'uuid';
import { Breach, BreachEvent, BreachSeverity, BreachStatus, BreachType } from '../types';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import { eventBus } from '../utils/eventBus';

export interface DetectBreachInput {
  slaId: string;
  serviceId: string;
  type: BreachType;
  metric: string;
  expectedValue: number;
  actualValue: number;
  description?: string;
  metadata?: Record<string, any>;
}

export class BreachService {
  private breaches: Map<string, Breach> = new Map();
  private events: Map<string, BreachEvent[]> = new Map();

  detect(input: DetectBreachInput): Breach {
    if (!input.slaId) throw new ValidationError('slaId is required');
    if (!input.metric) throw new ValidationError('metric is required');
    if (typeof input.expectedValue !== 'number') throw new ValidationError('expectedValue must be a number');
    if (typeof input.actualValue !== 'number') throw new ValidationError('actualValue must be a number');

    const deviation = Math.abs(input.actualValue - input.expectedValue) / Math.max(1, Math.abs(input.expectedValue));
    const severity = this.calculateSeverity(deviation);

    const breach: Breach = {
      id: uuidv4(),
      slaId: input.slaId,
      serviceId: input.serviceId,
      type: input.type,
      metric: input.metric,
      expectedValue: input.expectedValue,
      actualValue: input.actualValue,
      deviation,
      severity,
      status: 'detected',
      description: input.description || `${input.metric} breach: expected ${input.expectedValue}, actual ${input.actualValue}`,
      detectedAt: new Date(),
      metadata: input.metadata || {},
    };

    this.breaches.set(breach.id, breach);
    this.recordEvent(breach.id, 'detected', 'Breach detected', undefined);

    logger.warn(`[BreachService] ${severity} breach detected: ${breach.description}`);
    eventBus.publish('breach.detected', { breachId: breach.id, severity, serviceId: input.serviceId, type: input.type });

    return breach;
  }

  getById(id: string): Breach {
    const breach = this.breaches.get(id);
    if (!breach) throw new NotFoundError(`Breach ${id}`);
    return breach;
  }

  getAll(filters?: { slaId?: string; serviceId?: string; severity?: BreachSeverity; status?: BreachStatus }): Breach[] {
    let results = Array.from(this.breaches.values());
    if (filters?.slaId) results = results.filter(b => b.slaId === filters.slaId);
    if (filters?.serviceId) results = results.filter(b => b.serviceId === filters.serviceId);
    if (filters?.severity) results = results.filter(b => b.severity === filters.severity);
    if (filters?.status) results = results.filter(b => b.status === filters.status);
    return results;
  }

  updateStatus(id: string, status: BreachStatus, actor?: string): Breach {
    const breach = this.getById(id);
    breach.status = status;
    if (status === 'acknowledged') breach.acknowledgedAt = new Date();
    if (status === 'resolved') breach.resolvedAt = new Date();
    this.recordEvent(id, status === 'acknowledged' ? 'acknowledged' : 'resolved', `Status: ${status}`, actor);
    eventBus.publish(`breach.${status}`, { breachId: id, status });
    return breach;
  }

  delete(id: string): boolean {
    return this.breaches.delete(id);
  }

  getEvents(breachId: string): BreachEvent[] {
    return this.events.get(breachId) || [];
  }

  getStats(): { total: number; byStatus: Record<string, number>; bySeverity: Record<string, number>; byType: Record<string, number> } {
    const all = Array.from(this.breaches.values());
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    all.forEach(b => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      bySeverity[b.severity] = (bySeverity[b.severity] || 0) + 1;
      byType[b.type] = (byType[b.type] || 0) + 1;
    });
    return { total: all.length, byStatus, bySeverity, byType };
  }

  private recordEvent(breachId: string, eventType: BreachEvent['eventType'], message: string, actor?: string): void {
    if (!this.events.has(breachId)) this.events.set(breachId, []);
    this.events.get(breachId)!.push({
      id: uuidv4(),
      breachId,
      eventType,
      message,
      actor,
      timestamp: new Date(),
    });
  }

  private calculateSeverity(deviation: number): BreachSeverity {
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.25) return 'high';
    if (deviation > 0.1) return 'medium';
    return 'low';
  }
}

export const breachService = new BreachService();
export default breachService;
