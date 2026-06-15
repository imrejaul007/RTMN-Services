// SyncRecord Model
import { BridgeSync, SyncStatus } from '../types';

export class SyncRecordModel {
  private records: Map<string, BridgeSync> = new Map();

  upsert(record: BridgeSync): BridgeSync {
    this.records.set(record.id, record);
    return record;
  }

  findById(id: string): BridgeSync | undefined {
    return this.records.get(id);
  }

  findByObjective(boaObjectiveId: string): BridgeSync | undefined {
    return Array.from(this.records.values()).find(r => r.boaObjectiveId === boaObjectiveId);
  }

  findAll(filters?: { status?: SyncStatus }): BridgeSync[] {
    let results = Array.from(this.records.values());
    if (filters?.status) results = results.filter(r => r.status === filters.status);
    return results;
  }

  count(): number { return this.records.size; }

  delete(id: string): boolean { return this.records.delete(id); }
}

export const syncRecordModel = new SyncRecordModel();
export default syncRecordModel;
