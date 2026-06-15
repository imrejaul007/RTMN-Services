import { Transaction, LedgerEntry } from '../types';

class TransactionStore {
  private transactions: Map<string, Transaction> = new Map();
  private byReference: Map<string, string> = new Map(); // ref → transactionId
  private byIdempotency: Map<string, string> = new Map(); // key → transactionId
  private ledger: Map<string, LedgerEntry[]> = new Map(); // accountId → entries
  private ledgerByTx: Map<string, LedgerEntry[]> = new Map(); // transactionId → entries

  upsertTransaction(tx: Transaction): void {
    this.transactions.set(tx.id, tx);
    this.byReference.set(tx.reference, tx.id);
    if (tx.idempotencyKey) {
      this.byIdempotency.set(tx.idempotencyKey, tx.id);
    }
  }

  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  getByReference(reference: string): Transaction | undefined {
    const id = this.byReference.get(reference);
    return id ? this.transactions.get(id) : undefined;
  }

  getByIdempotencyKey(key: string): Transaction | undefined {
    const id = this.byIdempotency.get(key);
    return id ? this.transactions.get(id) : undefined;
  }

  listTransactions(filter?: {
    fromAccountId?: string;
    toAccountId?: string;
    type?: string;
    status?: string;
    limit?: number;
  }): Transaction[] {
    let list = Array.from(this.transactions.values());
    if (filter?.fromAccountId) list = list.filter((t) => t.fromAccountId === filter.fromAccountId);
    if (filter?.toAccountId) list = list.filter((t) => t.toAccountId === filter.toAccountId);
    if (filter?.type) list = list.filter((t) => t.type === filter.type);
    if (filter?.status) list = list.filter((t) => t.status === filter.status);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filter?.limit ? list.slice(0, filter.limit) : list;
  }

  addLedgerEntry(entry: LedgerEntry): void {
    // Add to account ledger
    const acctEntries = this.ledger.get(entry.accountId) || [];
    acctEntries.push(entry);
    this.ledger.set(entry.accountId, acctEntries);
    // Add to transaction entries
    const txEntries = this.ledgerByTx.get(entry.transactionId) || [];
    txEntries.push(entry);
    this.ledgerByTx.set(entry.transactionId, txEntries);
  }

  getLedger(accountId: string, limit: number = 50): LedgerEntry[] {
    const entries = this.ledger.get(accountId) || [];
    return entries.slice(-limit).reverse();
  }

  getLedgerForTransaction(transactionId: string): LedgerEntry[] {
    return this.ledgerByTx.get(transactionId) || [];
  }

  countTransactions(): number {
    return this.transactions.size;
  }

  totalVolume(currency: string = 'USD'): number {
    return this.listTransactions({ status: 'completed' })
      .filter((t) => t.currency === currency)
      .reduce((sum, t) => sum + t.amount, 0);
  }
}

export const transactionStore = new TransactionStore();
