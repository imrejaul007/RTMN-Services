import { KarmaRecord, KarmaEvent, KarmaTier } from '../types';

class KarmaStore {
  private records: Map<string, KarmaRecord> = new Map(); // agentId → record
  private events: Map<string, KarmaEvent[]> = new Map(); // agentId → events

  upsert(agentId: string, record: KarmaRecord): void {
    this.records.set(agentId, record);
  }

  get(agentId: string): KarmaRecord | undefined {
    return this.records.get(agentId);
  }

  exists(agentId: string): boolean {
    return this.records.has(agentId);
  }

  list(): KarmaRecord[] {
    return Array.from(this.records.values());
  }

  listByTier(tier: KarmaTier): KarmaRecord[] {
    return this.list().filter((r) => r.tier === tier);
  }

  addEvent(agentId: string, event: KarmaEvent): void {
    const list = this.events.get(agentId) || [];
    list.push(event);
    this.events.set(agentId, list);
  }

  getEvents(agentId: string, limit: number = 50): KarmaEvent[] {
    const list = this.events.get(agentId) || [];
    return list.slice(-limit).reverse();
  }

  topKarma(n: number = 10): KarmaRecord[] {
    return this.list().sort((a, b) => b.totalKarma - a.totalKarma).slice(0, n);
  }

  count(): number {
    return this.records.size;
  }
}

export const karmaStore = new KarmaStore();
