import { CreditRecord } from '../types';

class CreditStore {
  private records: Map<string, CreditRecord> = new Map(); // agentId → record

  upsert(agentId: string, record: CreditRecord): void {
    this.records.set(agentId, record);
  }

  get(agentId: string): CreditRecord | undefined {
    return this.records.get(agentId);
  }

  exists(agentId: string): boolean {
    return this.records.has(agentId);
  }

  list(): CreditRecord[] {
    return Array.from(this.records.values());
  }

  topScores(n: number = 10): CreditRecord[] {
    return this.list().sort((a, b) => b.score - a.score).slice(0, n);
  }

  count(): number {
    return this.records.size;
  }

  averageScore(): number {
    const all = this.list();
    if (all.length === 0) return 0;
    return Math.round(all.reduce((sum, r) => sum + r.score, 0) / all.length);
  }
}

export const creditStore = new CreditStore();
