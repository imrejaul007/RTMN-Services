/**
 * Contract Analytics Service
 * Phase B.5 — Real implementation (was 16-LOC stub)
 */

import type { Contract, ContractStatus, ContractType } from '../types/index.js';

const STORE = new Map<string, Contract>();

function upsert(contract: Contract): void {
  STORE.set(contract.id, contract);
}

export interface ContractSummary {
  total: number;
  byStatus: Partial<Record<ContractStatus, number>>;
  byType: Partial<Record<ContractType, number>>;
  totalValue: number;
  avgValue: number;
  expiringSoon: number; // expires in 30 days
  breached: number;
}

export interface ContractTrend {
  period: string; // YYYY-MM
  created: number;
  activated: number;
  terminated: number;
}

export function getContractAnalytics(contracts?: Contract[]): ContractSummary {
  const list = contracts ?? Array.from(STORE.values());
  const byStatus: Partial<Record<ContractStatus, number>> = {};
  const byType: Partial<Record<ContractType, number>> = {};
  let totalValue = 0;
  let expiringSoon = 0;
  let breached = 0;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  for (const c of list) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byType[c.type] = (byType[c.type] || 0) + 1;
    totalValue += c.value ?? 0;
    if (c.expiresAt) {
      const expiry = new Date(c.expiresAt).getTime();
      if (expiry - now < thirtyDays && expiry > now) expiringSoon++;
    }
    if (c.status === 'disputed') breached++;
  }

  return {
    total: list.length,
    byStatus,
    byType,
    totalValue,
    avgValue: list.length ? Math.round(totalValue / list.length) : 0,
    expiringSoon,
    breached,
  };
}

export function getContractTrends(contracts?: Contract[], months = 6): ContractTrend[] {
  const list = contracts ?? Array.from(STORE.values());
  const buckets: Record<string, ContractTrend> = {};

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = { period: key, created: 0, activated: 0, terminated: 0 };
  }

  for (const c of list) {
    if (c.createdAt) {
      const created = c.createdAt.slice(0, 7);
      if (buckets[created]) buckets[created].created++;
    }
    if (c.activatedAt) {
      const k = c.activatedAt.slice(0, 7);
      if (buckets[k]) buckets[k].activated++;
    }
    if (c.terminatedAt) {
      const k = c.terminatedAt.slice(0, 7);
      if (buckets[k]) buckets[k].terminated++;
    }
  }

  return Object.values(buckets);
}

export function getContractsByParty(partyId: string, contracts?: Contract[]): Contract[] {
  const list = contracts ?? Array.from(STORE.values());
  return list.filter(c => c.parties?.some(p => p.id === partyId));
}

export function getHighValueContracts(threshold: number, contracts?: Contract[]): Contract[] {
  const list = contracts ?? Array.from(STORE.values());
  return list
    .filter(c => (c.value ?? 0) >= threshold)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
}

export const _internal = { STORE, upsert };
export default {
  getContractAnalytics,
  getContractTrends,
  getContractsByParty,
  getHighValueContracts,
};
