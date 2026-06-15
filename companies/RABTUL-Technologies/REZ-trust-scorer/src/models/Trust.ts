import { TrustRecord, TrustEvent, TrustAuditEntry } from '../types';

class TrustStore {
  private records: Map<string, TrustRecord> = new Map(); // entityId → record
  private events: Map<string, TrustEvent[]> = new Map(); // entityId → events
  private auditLog: TrustAuditEntry[] = [];

  upsertRecord(entityId: string, record: TrustRecord): void {
    this.records.set(entityId, record);
  }

  getRecord(entityId: string): TrustRecord | undefined {
    return this.records.get(entityId);
  }

  exists(entityId: string): boolean {
    return this.records.has(entityId);
  }

  addEvent(entityId: string, event: TrustEvent): void {
    const list = this.events.get(entityId) || [];
    list.push(event);
    this.events.set(entityId, list);
  }

  getEvents(entityId: string, limit: number = 100): TrustEvent[] {
    const list = this.events.get(entityId) || [];
    return list.slice(-limit).reverse();
  }

  list(): TrustRecord[] {
    return Array.from(this.records.values());
  }

  listByTier(tier: string): TrustRecord[] {
    return this.list().filter((r) => r.tier === tier);
  }

  topScores(n: number = 10): TrustRecord[] {
    return this.list().sort((a, b) => b.score - a.score).slice(0, n);
  }

  addAuditEntry(entry: TrustAuditEntry): void {
    this.auditLog.push(entry);
    // Keep last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  getAuditLog(entityId?: string, limit: number = 100): TrustAuditEntry[] {
    let entries = this.auditLog;
    if (entityId) {
      entries = entries.filter((e) => e.entityId === entityId);
    }
    return entries.slice(-limit).reverse();
  }

  count(): number {
    return this.records.size;
  }
}

export const trustStore = new TrustStore();
