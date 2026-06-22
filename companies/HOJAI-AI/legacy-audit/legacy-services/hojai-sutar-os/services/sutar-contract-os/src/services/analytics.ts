// Contract Analytics
import type { Contract } from '../types/index';

export function getContractAnalytics(contracts: Contract[]) {
  return {
    total: contracts.length,
    byStatus: contracts.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byType: contracts.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}
