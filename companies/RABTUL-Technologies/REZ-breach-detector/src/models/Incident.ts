import { Incident } from '../types';
export class IncidentModel {
  private incidents: Map<string, Incident> = new Map();
  upsert(i: Incident) { this.incidents.set(i.id, i); return i; }
  findById(id: string) { return this.incidents.get(id); }
  findAll() { return Array.from(this.incidents.values()); }
  count() { return this.incidents.size; }
}
export const incidentModel = new IncidentModel();
export default incidentModel;
