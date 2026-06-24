/**
 * Common types for Department OS entities
 *
 * Each Department OS has its own rich domain types defined in its own
 * client file. This file holds the minimal common types used across
 * multiple sub-clients.
 */

/** Standard money shape used by Sales, Finance, Revenue Intelligence, etc. */
export interface Money {
  amount: number; // in minor units (cents/paise)
  currency: string; // 'USD' | 'INR' | ...
}

/** Date range used by reporting endpoints. */
export interface DateRange {
  from: string; // ISO date or datetime
  to: string;
}

/** Generic contact (used by Sales, Marketing audiences, CS customers, etc.) */
export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}
