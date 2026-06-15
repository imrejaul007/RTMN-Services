import { Escrow } from '../types';

class EscrowStore {
  private escrows: Map<string, Escrow> = new Map();

  upsert(escrow: Escrow): void {
    this.escrows.set(escrow.id, escrow);
  }

  get(id: string): Escrow | undefined {
    return this.escrows.get(id);
  }

  getByTransactionId(transactionId: string): Escrow | undefined {
    return this.list().find((e) => e.transactionId === transactionId);
  }

  list(filter?: { status?: string; payerAccountId?: string; payeeAccountId?: string }): Escrow[] {
    let list = Array.from(this.escrows.values());
    if (filter?.status) list = list.filter((e) => e.status === filter.status);
    if (filter?.payerAccountId) list = list.filter((e) => e.payerAccountId === filter.payerAccountId);
    if (filter?.payeeAccountId) list = list.filter((e) => e.payeeAccountId === filter.payeeAccountId);
    return list;
  }

  count(): number {
    return this.escrows.size;
  }

  totalHeld(currency: string = 'USD'): number {
    return this.list({ status: 'held' })
      .filter((e) => e.currency === currency)
      .reduce((sum, e) => sum + e.amount, 0);
  }
}

export const escrowStore = new EscrowStore();
