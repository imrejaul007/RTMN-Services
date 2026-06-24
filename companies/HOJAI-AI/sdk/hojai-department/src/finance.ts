/**
 * Finance OS SDK client (port 4801)
 *
 * Chart of accounts, ledger entries, trial balance, financial dashboard,
 * cross-industry financial consolidation. 1 Finance Copilot behind the scenes.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Money, DateRange } from './types.js';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type EntryType = 'debit' | 'credit';

export interface FinAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  /** ISO 4217 currency code */
  currency: string;
  balance: Money;
  active: boolean;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  entryType: EntryType;
  amount: Money;
  date: string;
  description: string;
  /** Reference to source document (PO, invoice, etc.) */
  sourceType?: string;
  sourceId?: string;
  createdAt: string;
}

export interface TrialBalance {
  asOf: string;
  accounts: Array<{ account: FinAccount; debit: Money; credit: Money }>;
  totals: { totalDebit: Money; totalCredit: Money; balanced: boolean };
}

export interface FinancialReport {
  id: string;
  type: 'income-statement' | 'balance-sheet' | 'cash-flow' | 'equity-statement';
  period: DateRange;
  generatedAt: string;
  /** Section → line items */
  sections: Record<string, Array<{ label: string; amount: Money }>>;
}

export interface IndustryFinancials {
  industry: string;
  revenue: Money;
  expenses: Money;
  netIncome: Money;
  assets: Money;
  liabilities: Money;
  /** Currency converted to base */
  asOfCurrency: string;
}

export class FinanceClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:4801` };
  }

  // ─── Chart of accounts ───

  async listAccounts(input: { type?: AccountType; active?: boolean; limit?: number } = {}): Promise<FinAccount[]> {
    return request<FinAccount[]>(this.config, 'GET', `/api/accounts${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getAccount(id: string): Promise<FinAccount> {
    return request<FinAccount>(this.config, 'GET', `/api/accounts/${encodeURIComponent(id)}`);
  }

  async createAccount(input: { code: string; name: string; type: AccountType; parentId?: string; currency: string }): Promise<FinAccount> {
    return request<FinAccount>(this.config, 'POST', '/api/accounts', input);
  }

  // ─── Ledger ───

  async listLedgerEntries(input: { accountId?: string; from?: string; to?: string; sourceType?: string; limit?: number } = {}): Promise<LedgerEntry[]> {
    return request<LedgerEntry[]>(this.config, 'GET', `/api/ledger${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async postLedgerEntry(input: { accountId: string; entryType: EntryType; amount: Money; date: string; description: string; sourceType?: string; sourceId?: string }): Promise<LedgerEntry> {
    return request<LedgerEntry>(this.config, 'POST', '/api/ledger', input);
  }

  // ─── Trial balance ───

  async getTrialBalance(input: { asOf: string }): Promise<TrialBalance> {
    return request<TrialBalance>(this.config, 'GET', `/api/trial-balance${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  // ─── Reports ───

  async listReports(input: { type?: FinancialReport['type']; limit?: number } = {}): Promise<FinancialReport[]> {
    return request<FinancialReport[]>(this.config, 'GET', `/api/reports${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async generateReport(input: { type: FinancialReport['type']; period: DateRange }): Promise<FinancialReport> {
    return request<FinancialReport>(this.config, 'POST', '/api/reports', input);
  }

  // ─── Cross-industry consolidation ───

  async getConsolidatedDashboard(input: { baseCurrency: string; period: DateRange }): Promise<{
    totalRevenue: Money;
    totalExpenses: Money;
    netIncome: Money;
    byIndustry: IndustryFinancials[];
  }> {
    return request(this.config, 'GET', `/api/dashboard${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getIndustryFinancials(input: { industry: string; period: DateRange }): Promise<IndustryFinancials> {
    return request<IndustryFinancials>(this.config, 'GET', `/api/industry/${encodeURIComponent(input.industry)}${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
}
