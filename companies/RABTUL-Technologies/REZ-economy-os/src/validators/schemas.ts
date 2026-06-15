import { ValidationError } from '../utils/errors';
import { TransactionType, AccountType, KarmaTier, CreditTier } from '../types';

const VALID_TRANSACTION_TYPES: TransactionType[] = [
  'payment', 'refund', 'fee', 'reward', 'penalty', 'transfer', 'escrow', 'release', 'adjustment'
];

const VALID_ACCOUNT_TYPES: AccountType[] = ['agent', 'user', 'merchant', 'platform', 'escrow', 'fee'];

const VALID_KARMA_TIERS: KarmaTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

const VALID_CREDIT_TIERS: CreditTier[] = ['excellent', 'good', 'fair', 'poor', 'very-poor', 'unrated'];

export const validators = {
  isString(value: any, name: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError(`${name} must be a non-empty string`);
    }
    return value.trim();
  },

  isNumber(value: any, name: string): number {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new ValidationError(`${name} must be a valid number`);
    }
    return value;
  },

  isPositiveNumber(value: any, name: string): number {
    const n = this.isNumber(value, name);
    if (n <= 0) throw new ValidationError(`${name} must be positive`);
    return n;
  },

  isOptionalString(value: any, name: string): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') throw new ValidationError(`${name} must be a string`);
    return value.trim();
  },

  isInEnum<T extends string>(value: any, allowed: readonly T[], name: string): T {
    if (!allowed.includes(value)) {
      throw new ValidationError(`${name} must be one of: ${allowed.join(', ')}`);
    }
    return value as T;
  },

  isTransactionType(value: any): TransactionType {
    return this.isInEnum(value, VALID_TRANSACTION_TYPES, 'type');
  },

  isAccountType(value: any): AccountType {
    return this.isInEnum(value, VALID_ACCOUNT_TYPES, 'type');
  },

  isKarmaTier(value: any): KarmaTier {
    return this.isInEnum(value, VALID_KARMA_TIERS, 'tier');
  },

  isCreditTier(value: any): CreditTier {
    return this.isInEnum(value, VALID_CREDIT_TIERS, 'tier');
  },

  isRecord(value: any, name: string): Record<string, any> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ValidationError(`${name} must be an object`);
    }
    return value;
  },

  isArray(value: any, name: string): any[] {
    if (!Array.isArray(value)) throw new ValidationError(`${name} must be an array`);
    return value;
  },

  isStringArray(value: any, name: string): string[] {
    const arr = this.isArray(value, name);
    return arr.map((v, i) => this.isString(v, `${name}[${i}]`));
  },
};
