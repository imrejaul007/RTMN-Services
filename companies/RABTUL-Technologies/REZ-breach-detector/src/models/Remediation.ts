import { Remediation } from '../types';
export class RemediationModel {
  private remediations: Map<string, Remediation> = new Map();
  upsert(r: Remediation) { this.remediations.set(r.id, r); return r; }
  findById(id: string) { return this.remediations.get(id); }
  findAll() { return Array.from(this.remediations.values()); }
  findByBreach(breachId: string) { return Array.from(this.remediations.values()).filter(r => r.breachId === breachId); }
  count() { return this.remediations.size; }
}
export const remediationModel = new RemediationModel();
export default remediationModel;
