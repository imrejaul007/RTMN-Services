import { SLA } from '../types';
export class SLAModel {
  private slas: Map<string, SLA> = new Map();
  upsert(s: SLA) { this.slas.set(s.id, s); return s; }
  findById(id: string) { return this.slas.get(id); }
  findAll() { return Array.from(this.slas.values()); }
  count() { return this.slas.size; }
  delete(id: string) { return this.slas.delete(id); }
}
export const slaModel = new SLAModel();
export default slaModel;
