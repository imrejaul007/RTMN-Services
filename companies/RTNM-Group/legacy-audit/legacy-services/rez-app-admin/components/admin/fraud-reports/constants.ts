export const FRAUD_STATUSES = ['pending', 'confirmed', 'dismissed'];
export const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'];

export type StatusFilter = 'all' | 'pending' | 'confirmed' | 'dismissed';
export type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';
export type CategoryFilter = 'all' | 'payment' | 'account' | 'merchant' | 'technical';

export const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'dismissed'] as const;
export const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'critical'] as const;
export const CATEGORY_OPTIONS = ['all', 'payment', 'account', 'merchant', 'technical'] as const;

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#FEE2E2', text: '#991B1B' },
  dismissed: { bg: '#E5E7EB', text: '#374151' },
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#D1FAE5', text: '#065F46' },
  medium: { bg: '#FEF3C7', text: '#92400E' },
  high: { bg: '#FED7AA', text: '#9A3412' },
  critical: { bg: '#FEE2E2', text: '#991B1B' },
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  confirmed: 'Confirmed Fraud',
  dismissed: 'Dismissed',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const CATEGORY_LABELS: Record<string, string> = {
  payment: 'Payment Fraud',
  account: 'Account Abuse',
  merchant: 'Merchant Fraud',
  technical: 'Technical Issue',
};
