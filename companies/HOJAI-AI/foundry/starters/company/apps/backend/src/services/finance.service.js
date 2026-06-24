/**
 * Finance service — chart of accounts + ledger.
 *
 * Mirrors `@hojai/department.finance` surface.
 */

import { randomUUID } from 'node:crypto';
import store from './store.js';

// ─── Chart of accounts ────────────────────────────────────────────

export function listAccounts(filter = {}) {
  return [...store.accounts_gl.values()].filter(a => {
    if (filter.type && a.type !== filter.type) return false;
    return true;
  });
}

export function getAccount(id) {
  return store.accounts_gl.get(id) || null;
}

export function createAccount({ code, name, type, currency }) {
  if (!code || !name || !type) throw new Error('code, name, type required');
  if (!['asset', 'liability', 'equity', 'revenue', 'expense'].includes(type)) {
    throw new Error('type must be asset|liability|equity|revenue|expense');
  }
  const id = randomUUID();
  const account = {
    id, code, name, type,
    currency: currency || 'USD',
    balance: { amount: 0, currency: currency || 'USD' },
    active: true,
    createdAt: new Date().toISOString()
  };
  store.accounts_gl.set(id, account);
  store.log('finance', 'account.created', { id, code, type });
  return account;
}

// ─── Ledger ────────────────────────────────────────────────────────

export function listLedgerEntries(filter = {}) {
  return [...store.ledger.values()].filter(e => {
    if (filter.accountId && e.accountId !== filter.accountId) return false;
    return true;
  });
}

export function postLedgerEntry({ accountId, entryType, amount, currency, date, description }) {
  if (!accountId || !entryType || amount == null) throw new Error('accountId, entryType, amount required');
  if (!['debit', 'credit'].includes(entryType)) throw new Error('entryType must be debit|credit');
  const account = store.accounts_gl.get(accountId);
  if (!account) throw new Error('account not found');
  const id = randomUUID();
  const cur = currency || account.currency;
  const entry = {
    id, accountId, entryType,
    amount: { amount: Number(amount) || 0, currency: cur },
    date: date || new Date().toISOString().slice(0, 10),
    description: description || '',
    createdAt: new Date().toISOString()
  };
  store.ledger.set(id, entry);
  // Update account balance
  const delta = entryType === 'debit'
    ? (account.type === 'asset' || account.type === 'expense' ? Number(amount) : -Number(amount))
    : (account.type === 'asset' || account.type === 'expense' ? -Number(amount) : Number(amount));
  account.balance = { amount: account.balance.amount + delta, currency: cur };
  store.accounts_gl.set(accountId, account);
  store.log('finance', 'ledger.posted', { id, accountId, entryType, amount: entry.amount.amount });
  return entry;
}

export function getTrialBalance() {
  const totals = { debit: 0, credit: 0 };
  for (const e of store.ledger.values()) {
    if (e.entryType === 'debit') totals.debit += e.amount.amount;
    else totals.credit += e.amount.amount;
  }
  return { asOf: new Date().toISOString().slice(0, 10), totals, balanced: totals.debit === totals.credit, accountCount: store.accounts_gl.size };
}
