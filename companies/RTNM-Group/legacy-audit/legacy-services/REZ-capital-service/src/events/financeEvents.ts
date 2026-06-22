/**
 * Finance Events for Capital Service
 * Listens to finance events from the event bus
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger';

// Configuration
const EVENT_BUS_ENABLED = process.env.EVENT_BUS_ENABLED !== 'false';

// Event types
export interface LoanDisbursedEvent {
  loanId: string;
  merchantId: string;
  amount: number;
  partnerId?: string;
  transactionId?: string;
  timestamp: string;
}

export interface LoanRepaymentReceivedEvent {
  loanId: string;
  merchantId: string;
  amount: number;
  principal: number;
  interest: number;
  fees: number;
  transactionId?: string;
  timestamp: string;
}

export interface LoanOverdueEvent {
  loanId: string;
  merchantId: string;
  amountDue: number;
  daysOverdue: number;
  penalty?: number;
  timestamp: string;
}

export interface LoanDefaultEvent {
  loanId: string;
  merchantId: string;
  totalOutstanding: number;
  reason?: string;
  timestamp: string;
}

export interface LoanClosedEvent {
  loanId: string;
  merchantId: string;
  closureType: 'repaid' | 'written_off' | 'restructured';
  finalAmount: number;
  timestamp: string;
}

// Event emitter for internal use
const financeEventEmitter = new EventEmitter();

/**
 * Handle loan.disbursed event
 */
async function handleLoanDisbursed(event: LoanDisbursedEvent): Promise<void> {
  logger.info('[Capital:FinanceEvents] Processing loan.disbursed', {
    loanId: event.loanId,
    merchantId: event.merchantId,
    amount: event.amount,
  });

  try {
    // Record disbursement in ledger
    financeEventEmitter.emit('loan:disbursed', event);
  } catch (error) {
    logger.error('[Capital:FinanceEvents] Error processing loan.disbursed', {
      loanId: event.loanId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle loan.repayment_received event
 */
async function handleRepaymentReceived(event: LoanRepaymentReceivedEvent): Promise<void> {
  logger.info('[Capital:FinanceEvents] Processing loan.repayment_received', {
    loanId: event.loanId,
    merchantId: event.merchantId,
    amount: event.amount,
  });

  try {
    // Update loan balance and check for closure
    financeEventEmitter.emit('loan:repayment_received', event);
  } catch (error) {
    logger.error('[Capital:FinanceEvents] Error processing loan.repayment_received', {
      loanId: event.loanId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle loan.overdue event
 */
async function handleLoanOverdue(event: LoanOverdueEvent): Promise<void> {
  logger.warn('[Capital:FinanceEvents] Processing loan.overdue', {
    loanId: event.loanId,
    merchantId: event.merchantId,
    daysOverdue: event.daysOverdue,
  });

  try {
    // Trigger collection process
    financeEventEmitter.emit('loan:overdue', event);
  } catch (error) {
    logger.error('[Capital:FinanceEvents] Error processing loan.overdue', {
      loanId: event.loanId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle loan.defaulted event
 */
async function handleLoanDefaulted(event: LoanDefaultEvent): Promise<void> {
  logger.error('[Capital:FinanceEvents] Processing loan.defaulted', {
    loanId: event.loanId,
    merchantId: event.merchantId,
    totalOutstanding: event.totalOutstanding,
  });

  try {
    // Trigger default handling process
    financeEventEmitter.emit('loan:defaulted', event);
  } catch (error) {
    logger.error('[Capital:FinanceEvents] Error processing loan.defaulted', {
      loanId: event.loanId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle loan.closed event
 */
async function handleLoanClosed(event: LoanClosedEvent): Promise<void> {
  logger.info('[Capital:FinanceEvents] Processing loan.closed', {
    loanId: event.loanId,
    merchantId: event.merchantId,
    closureType: event.closureType,
  });

  try {
    // Finalize loan record
    financeEventEmitter.emit('loan:closed', event);
  } catch (error) {
    logger.error('[Capital:FinanceEvents] Error processing loan.closed', {
      loanId: event.loanId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Event subscription registry
type EventHandler = (event: unknown) => Promise<void>;

interface Subscription {
  eventType: string;
  handler: EventHandler;
}

const subscriptions: Subscription[] = [
  { eventType: 'loan.disbursed', handler: handleLoanDisbursed as EventHandler },
  { eventType: 'loan.repayment_received', handler: handleRepaymentReceived as EventHandler },
  { eventType: 'loan.overdue', handler: handleLoanOverdue as EventHandler },
  { eventType: 'loan.defaulted', handler: handleLoanDefaulted as EventHandler },
  { eventType: 'loan.closed', handler: handleLoanClosed as EventHandler },
];

/**
 * Subscribe to an event type with a handler
 */
export function subscribe(eventType: string, handler: EventHandler): void {
  subscriptions.push({ eventType, handler });
  logger.info(`[Capital:FinanceEvents] Subscription registered for ${eventType}`);
}

/**
 * Get all subscriptions
 */
export function getSubscriptions(): Subscription[] {
  return [...subscriptions];
}

/**
 * Get the internal event emitter
 */
export function getFinanceEventEmitter(): EventEmitter {
  return financeEventEmitter;
}

/**
 * Initialize event listeners (called from index.ts)
 */
export function initializeFinanceEventListeners(): void {
  logger.info('[Capital:FinanceEvents] Initializing finance event listeners', {
    eventBusEnabled: EVENT_BUS_ENABLED,
    subscriptions: subscriptions.length,
  });

  if (!EVENT_BUS_ENABLED) {
    logger.info('[Capital:FinanceEvents] Event bus disabled, skipping listener setup');
  }
}

export default {
  subscribe,
  getSubscriptions,
  getFinanceEventEmitter,
  initializeFinanceEventListeners,
};
