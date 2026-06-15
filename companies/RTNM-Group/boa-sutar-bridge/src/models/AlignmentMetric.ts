// AlignmentMetric Model
import { AlignmentRecord } from '../types';

export class AlignmentMetricModel {
  private records: Map<string, AlignmentRecord> = new Map();

  upsert(record: AlignmentRecord): AlignmentRecord {
    this.records.set(record.id, record);
    return record;
  }

  findById(id: string): AlignmentRecord | undefined { return this.records.get(id); }
  findAll(): AlignmentRecord[] { return Array.from(this.records.values()); }
  findByStrategy(strategyId: string): AlignmentRecord[] {
    return Array.from(this.records.values()).filter(r => r.strategyId === strategyId);
  }
  count(): number { return this.records.size; }
}

export const alignmentMetricModel = new AlignmentMetricModel();
export default alignmentMetricModel;
