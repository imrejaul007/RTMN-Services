/**
 * DOOH - State Machine Validation
 *
 * Validates status transitions for screens and campaigns.
 * Prevents invalid state transitions that could cause data corruption.
 */

// ============================================================================
// Screen Status Transitions
// ============================================================================

export type ScreenStatus =
  | 'unregistered'
  | 'active'
  | 'inactive'
  | 'offline'
  | 'maintenance'
  | 'suspended';

const SCREEN_STATUS_TRANSITIONS: Record<ScreenStatus, ScreenStatus[]> = {
  // Screen can be provisioned but not yet active
  unregistered: ['active', 'pending'],
  // Awaiting approval before going live
  pending: ['active', 'suspended'],
  // Operating normally - can be turned off manually or go offline/maintenance
  active: ['inactive', 'offline', 'maintenance'],
  // Manually turned off - can be reactivated
  inactive: ['active', 'offline', 'suspended'],
  // Hardware/software issue - auto-transitions possible
  offline: ['active', 'inactive', 'maintenance'],
  // Scheduled maintenance - can return to active
  maintenance: ['active', 'inactive'],
  // Suspended for violations/non-payment - limited transitions
  suspended: ['active', 'inactive'],
};

export function isValidScreenStatusTransition(
  from: ScreenStatus,
  to: ScreenStatus
): boolean {
  // Allow idempotent transitions (no change)
  if (from === to) return true;

  const allowedTransitions = SCREEN_STATUS_TRANSITIONS[from];
  if (!allowedTransitions) {
    console.warn(`Unknown screen status: ${from}`);
    return false;
  }

  return allowedTransitions.includes(to);
}

export function assertValidScreenStatusTransition(
  from: ScreenStatus,
  to: ScreenStatus
): void {
  if (!isValidScreenStatusTransition(from, to)) {
    throw new InvalidStateTransitionError(
      'screen',
      from,
      to,
      SCREEN_STATUS_TRANSITIONS[from]
    );
  }
}

export function getAllowedScreenTransitions(status: ScreenStatus): ScreenStatus[] {
  return SCREEN_STATUS_TRANSITIONS[status] || [];
}

// ============================================================================
// Campaign Status Transitions
// ============================================================================

export type CampaignStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'budget_exhausted';

const CAMPAIGN_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  // Draft can be activated or paused
  draft: ['active', 'paused'],
  // Active campaign can be paused, completed, or exhausted
  active: ['paused', 'completed', 'budget_exhausted'],
  // Paused campaign can be resumed, returned to draft, or completed
  paused: ['active', 'draft', 'completed'],
  // Completed is a terminal state
  completed: [],
  // Budget exhausted - can be reactivated or completed
  budget_exhausted: ['active', 'completed'],
};

export function isValidCampaignStatusTransition(
  from: CampaignStatus,
  to: CampaignStatus
): boolean {
  // Allow idempotent transitions (no change)
  if (from === to) return true;

  const allowedTransitions = CAMPAIGN_STATUS_TRANSITIONS[from];
  if (!allowedTransitions) {
    console.warn(`Unknown campaign status: ${from}`);
    return false;
  }

  return allowedTransitions.includes(to);
}

export function assertValidCampaignStatusTransition(
  from: CampaignStatus,
  to: CampaignStatus
): void {
  if (!isValidCampaignStatusTransition(from, to)) {
    throw new InvalidStateTransitionError(
      'campaign',
      from,
      to,
      CAMPAIGN_STATUS_TRANSITIONS[from]
    );
  }
}

export function getAllowedCampaignTransitions(
  status: CampaignStatus
): CampaignStatus[] {
  return CAMPAIGN_STATUS_TRANSITIONS[status] || [];
}

// ============================================================================
// Payout Status Transitions
// ============================================================================

export type PayoutStatus =
  | 'pending'
  | 'processed'
  | 'paid'
  | 'failed';

const PAYOUT_STATUS_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  // Pending - can be processed or failed
  pending: ['processed', 'failed'],
  // Processed - can be paid or failed
  processed: ['paid', 'failed'],
  // Paid is terminal
  paid: [],
  // Failed can be retried back to pending
  failed: ['pending', 'processed'],
};

export function isValidPayoutStatusTransition(
  from: PayoutStatus,
  to: PayoutStatus
): boolean {
  if (from === to) return true;

  const allowedTransitions = PAYOUT_STATUS_TRANSITIONS[from];
  if (!allowedTransitions) {
    console.warn(`Unknown payout status: ${from}`);
    return false;
  }

  return allowedTransitions.includes(to);
}

export function assertValidPayoutStatusTransition(
  from: PayoutStatus,
  to: PayoutStatus
): void {
  if (!isValidPayoutStatusTransition(from, to)) {
    throw new InvalidStateTransitionError(
      'payout',
      from,
      to,
      PAYOUT_STATUS_TRANSITIONS[from]
    );
  }
}

// ============================================================================
// Error Classes
// ============================================================================

export class InvalidStateTransitionError extends Error {
  public readonly entityType: string;
  public readonly fromState: string;
  public readonly toState: string;
  public readonly allowedTransitions: string[];

  constructor(
    entityType: string,
    fromState: string,
    toState: string,
    allowedTransitions: string[]
  ) {
    const message = `Invalid ${entityType} status transition: ${fromState} -> ${toState}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`;

    super(message);
    this.name = 'InvalidStateTransitionError';
    this.entityType = entityType;
    this.fromState = fromState;
    this.toState = toState;
    this.allowedTransitions = allowedTransitions;
  }

  toJSON() {
    return {
      error: 'INVALID_STATE_TRANSITION',
      entity_type: this.entityType,
      from_state: this.fromState,
      to_state: this.toState,
      allowed_transitions: this.allowedTransitions,
      message: this.message,
    };
  }
}

// ============================================================================
// State Machine Guard Utility
// ============================================================================

export interface StateMachine<S extends string> {
  getState: () => S;
  transition: (newState: S) => boolean;
  canTransition: (newState: S) => boolean;
  getAllowedTransitions: () => S[];
}

export function createStateMachine<S extends string>(
  initialState: S,
  transitions: Record<S, S[]>,
  onTransition?: (from: S, to: S) => void
): StateMachine<S> {
  let currentState = initialState;

  return {
    getState: () => currentState,

    transition: (newState: S): boolean => {
      if (!transitions[currentState]?.includes(newState)) {
        return false;
      }

      const previousState = currentState;
      currentState = newState;

      if (onTransition) {
        onTransition(previousState, newState);
      }

      return true;
    },

    canTransition: (newState: S): boolean => {
      return transitions[currentState]?.includes(newState) ?? false;
    },

    getAllowedTransitions: (): S[] => {
      return transitions[currentState] || [];
    },
  };
}
