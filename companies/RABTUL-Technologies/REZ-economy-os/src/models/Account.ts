import { Account, AccountType } from '../types';

class AccountStore {
  private accounts: Map<string, Account> = new Map(); // accountId → account
  private byOwner: Map<string, Set<string>> = new Map(); // ownerId → set<accountId>

  upsert(account: Account): void {
    this.accounts.set(account.id, account);
    const set = this.byOwner.get(account.ownerId) || new Set();
    set.add(account.id);
    this.byOwner.set(account.ownerId, set);
  }

  get(accountId: string): Account | undefined {
    return this.accounts.get(accountId);
  }

  exists(accountId: string): boolean {
    return this.accounts.has(accountId);
  }

  getByOwner(ownerId: string): Account[] {
    const ids = this.byOwner.get(ownerId) || new Set();
    return Array.from(ids)
      .map((id) => this.accounts.get(id))
      .filter((a): a is Account => a !== undefined);
  }

  getPrimary(ownerId: string, type: AccountType = 'agent'): Account | undefined {
    const accounts = this.getByOwner(ownerId).filter((a) => a.type === type && a.status === 'active');
    return accounts[0];
  }

  list(): Account[] {
    return Array.from(this.accounts.values());
  }

  listByType(type: AccountType): Account[] {
    return this.list().filter((a) => a.type === type);
  }

  count(): number {
    return this.accounts.size;
  }
}

export const accountStore = new AccountStore();
