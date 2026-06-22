/**
 * Client exports for Capital Service
 */

export { MerchantClient, getMerchantClient, type Merchant, type MerchantStore, type MerchantFinancials, type MerchantHealth } from './merchantClient';
export { FinanceClient, getFinanceClient, type Transaction, type LedgerEntry, type AccountSummary, type Invoice } from './financeClient';
