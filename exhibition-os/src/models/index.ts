/**
 * Exhibition OS - All Models
 * Export all Mongoose models
 */

export * from './Exhibition';
export * from './Exhibitor';
export * from './Lead';
export * from './Attendee';
export * from './Session';
export * from './Booth';
export * from './Badge';
export * from './Ticket';
export * from './Economy';
export * from './CRM';

// Import all models for convenience
import { Exhibition } from './Exhibition';
import { Exhibitor } from './Exhibitor';
import { Lead } from './Lead';
import { Attendee } from './Attendee';
import { Session } from './Session';
import { Booth } from './Booth';
import { Badge } from './Badge';
import { Ticket } from './Ticket';
import { CoinBalance, Transaction, Campaign } from './Economy';
import { Deal, EmailSequence } from './CRM';

export const models = {
  Exhibition,
  Exhibitor,
  Lead,
  Attendee,
  Session,
  Booth,
  Badge,
  Ticket,
  CoinBalance,
  Transaction,
  Campaign,
  Deal,
  EmailSequence,
};

export default models;
