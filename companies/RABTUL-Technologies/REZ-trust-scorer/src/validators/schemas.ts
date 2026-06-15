import { ValidationError } from '../utils/errors';
import { TrustEventType, TrustTier } from '../types';

const VALID_EVENT_TYPES: TrustEventType[] = [
  'payment_completed', 'payment_late', 'payment_failed',
  'dispute_opened', 'dispute_resolved', 'dispute_lost',
  'delivery_completed', 'delivery_failed', 'delivery_returned',
  'account_created', 'verification_completed', 'review_received',
  'sla_met', 'sla_breached', 'contract_completed', 'contract_breached'
];

const VALID_TIERS: TrustTier[] = ['excellent', 'good', 'fair', 'poor', 'untrusted'];

export const validators = {
  isString(value: any, name: string): string {
    if (typeof value !== 'string' || value.trim() === '') throw new ValidationError(`${name} must be a non-empty string`);
    return value.trim();
  },

  isNumber(value: any, name: string): number {
    if (typeof value !== 'number' || isNaN(value)) throw new ValidationError(`${name} must be a valid number`);
    return value;
  },

  isPositiveNumber(value: any, name: string): number {
    const n = this.isNumber(value, name);
    if (n < 0) throw new ValidationError(`${name} must be non-negative`);
    return n;
  },

  isOptionalString(value: any, name: string): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') throw new ValidationError(`${name} must be a string`);
    return value.trim();
  },

  isInEnum<T extends string>(value: any, allowed: readonly T[], name: string): T {
    if (!allowed.includes(value)) throw new ValidationError(`${name} must be one of: ${allowed.join(', ')}`);
    return value as T;
  },

  isEventType(value: any): TrustEventType {
    return this.isInEnum(value, VALID_EVENT_TYPES, 'eventType');
  },

  isTrustTier(value: any): TrustTier {
    return this.isInEnum(value, VALID_TIERS, 'tier');
  },

  isRecord(value: any, name: string): Record<string, any> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ValidationError(`${name} must be an object`);
    return value;
  },

  inRange(value: number, min: number, max: number, name: string): number {
    if (value < min || value > max) throw new ValidationError(`${name} must be between ${min} and ${max}`);
    return value;
  },
};