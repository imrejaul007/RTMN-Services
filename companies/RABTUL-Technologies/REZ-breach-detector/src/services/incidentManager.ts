// Incident Manager
import { v4 as uuidv4 } from 'uuid';
import { Incident, BreachSeverity } from '../types';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

export class IncidentManager {
  private incidents: Map<string, Incident> = new Map();

  createFromBreach(breachId: string, breachData: { description: string; serviceId: string; severity: BreachSeverity; breachIds?: string[] }): Incident {
    const incident: Incident = {
      id: uuidv4(),
      title: `Incident from breach ${breachId}`,
      description: breachData.description,
      severity: breachData.severity,
      status: 'open',
      breachIds: breachData.breachIds || [breachId],
      affectedServices: [breachData.serviceId],
      createdAt: new Date(),
      timeline: [{ timestamp: new Date(), event: 'Incident created' }],
    };

    this.incidents.set(incident.id, incident);
    logger.info(`[IncidentManager] Created incident ${incident.id} from breach ${breachId}`);
    eventBus.publish('incident.created', { incidentId: incident.id, severity: breachData.severity });
    return incident;
  }

  getById(id: string): Incident | undefined { return this.incidents.get(id); }
  getAll(filters?: { status?: Incident['status']; severity?: BreachSeverity }): Incident[] {
    let results = Array.from(this.incidents.values());
    if (filters?.status) results = results.filter(i => i.status === filters.status);
    if (filters?.severity) results = results.filter(i => i.severity === filters.severity);
    return results;
  }

  updateStatus(id: string, status: Incident['status'], actor?: string, note?: string): Incident {
    const incident = this.getById(id);
    if (!incident) throw new Error('Incident not found');
    incident.status = status;
    incident.timeline.push({ timestamp: new Date(), event: `Status changed to ${status}${note ? ': ' + note : ''}`, actor });
    if (status === 'closed') incident.resolvedAt = new Date();
    eventBus.publish(`incident.${status}`, { incidentId: id });
    return incident;
  }

  assign(id: string, assignee: string): Incident {
    const incident = this.getById(id);
    if (!incident) throw new Error('Incident not found');
    incident.assignee = assignee;
    incident.timeline.push({ timestamp: new Date(), event: `Assigned to ${assignee}` });
    return incident;
  }

  addBreachToIncident(incidentId: string, breachId: string): Incident {
    const incident = this.getById(incidentId);
    if (!incident) throw new Error('Incident not found');
    if (!incident.breachIds.includes(breachId)) {
      incident.breachIds.push(breachId);
      incident.timeline.push({ timestamp: new Date(), event: `Added breach ${breachId}` });
    }
    return incident;
  }
}

export const incidentManager = new IncidentManager();
export default incidentManager;
