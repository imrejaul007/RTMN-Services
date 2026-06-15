// SLA Service - Core SLA management
import { v4 as uuidv4 } from 'uuid';
import { SLA, SLATarget, SLAStatus } from '../types';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import { eventBus } from '../utils/eventBus';

export interface CreateSLAInput {
  name: string;
  description: string;
  serviceId: string;
  provider: string;
  consumer: string;
  targets: SLATarget[];
  startDate: Date;
  endDate: Date;
  penalty?: SLA['penalty'];
  tags?: string[];
}

export class SLAService {
  private slas: Map<string, SLA> = new Map();

  create(input: CreateSLAInput): SLA {
    if (!input.name) throw new ValidationError('name is required');
    if (!input.serviceId) throw new ValidationError('serviceId is required');
    if (!input.provider) throw new ValidationError('provider is required');
    if (!input.consumer) throw new ValidationError('consumer is required');
    if (!input.targets || input.targets.length === 0) throw new ValidationError('At least one SLA target is required');
    if (new Date(input.endDate) <= new Date(input.startDate)) throw new ValidationError('endDate must be after startDate');

    const now = new Date();
    const sla: SLA = {
      id: uuidv4(),
      name: input.name,
      description: input.description,
      serviceId: input.serviceId,
      provider: input.provider,
      consumer: input.consumer,
      targets: input.targets,
      status: 'active',
      startDate: input.startDate,
      endDate: input.endDate,
      penalty: input.penalty,
      tags: input.tags || [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    this.slas.set(sla.id, sla);
    logger.info(`[SLAService] Created SLA ${sla.id} for service ${sla.serviceId}`);
    eventBus.publish('sla.created', { slaId: sla.id, serviceId: sla.serviceId, targets: sla.targets.length });
    return sla;
  }

  getById(id: string): SLA {
    const sla = this.slas.get(id);
    if (!sla) throw new NotFoundError(`SLA ${id}`);
    return sla;
  }

  getAll(filters?: { serviceId?: string; provider?: string; consumer?: string; status?: SLAStatus }): SLA[] {
    let results = Array.from(this.slas.values());
    if (filters?.serviceId) results = results.filter(s => s.serviceId === filters.serviceId);
    if (filters?.provider) results = results.filter(s => s.provider === filters.provider);
    if (filters?.consumer) results = results.filter(s => s.consumer === filters.consumer);
    if (filters?.status) results = results.filter(s => s.status === filters.status);
    return results;
  }

  updateStatus(id: string, status: SLAStatus): SLA {
    const sla = this.getById(id);
    sla.status = status;
    sla.updatedAt = new Date();
    logger.info(`[SLAService] Updated SLA ${id} status: ${status}`);
    eventBus.publish('sla.status-changed', { slaId: id, status });
    return sla;
  }

  update(id: string, updates: Partial<Pick<SLA, 'name' | 'description' | 'targets' | 'tags' | 'penalty'>>): SLA {
    const sla = this.getById(id);
    Object.assign(sla, updates);
    sla.updatedAt = new Date();
    return sla;
  }

  delete(id: string): boolean {
    const existed = this.slas.delete(id);
    if (existed) {
      logger.info(`[SLAService] Deleted SLA ${id}`);
      eventBus.publish('sla.deleted', { slaId: id });
    }
    return existed;
  }

  getStats(): { total: number; active: number; breached: number; met: number; expired: number; paused: number } {
    const all = Array.from(this.slas.values());
    return {
      total: all.length,
      active: all.filter(s => s.status === 'active').length,
      breached: all.filter(s => s.status === 'breached').length,
      met: all.filter(s => s.status === 'met').length,
      expired: all.filter(s => s.status === 'expired').length,
      paused: all.filter(s => s.status === 'paused').length,
    };
  }
}

export const slaService = new SLAService();
export default slaService;
