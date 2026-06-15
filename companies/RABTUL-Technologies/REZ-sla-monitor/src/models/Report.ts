import { SLAReport } from '../types';
export class ReportModel {
  private reports: Map<string, SLAReport> = new Map();
  upsert(r: SLAReport) { this.reports.set(r.id, r); return r; }
  findById(id: string) { return this.reports.get(id); }
  findAll() { return Array.from(this.reports.values()); }
  findBySLA(slaId: string) { return Array.from(this.reports.values()).filter(r => r.slaId === slaId); }
  count() { return this.reports.size; }
}
export const reportModel = new ReportModel();
export default reportModel;
