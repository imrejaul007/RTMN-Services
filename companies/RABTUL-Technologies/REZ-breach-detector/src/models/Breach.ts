import { Breach } from '../types';
export class BreachModel {
  private breaches: Map<string, Breach> = new Map();
  upsert(b: Breach) { this.breaches.set(b.id, b); return b; }
  findById(id: string) { return this.breaches.get(id); }
  findAll() { return Array.from(this.breaches.values()); }
  count() { return this.breaches.size; }
  delete(id: string) { return this.breaches.delete(id); }
}
export const breachModel = new BreachModel();
export default breachModel;
