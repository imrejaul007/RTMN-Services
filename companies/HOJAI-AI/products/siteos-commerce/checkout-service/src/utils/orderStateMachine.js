/**
 * Order Status State Machine
 * Defines valid transitions between order states
 */

export const ORDER_STATES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

export const VALID_TRANSITIONS = {
  [ORDER_STATES.PENDING]: [ORDER_STATES.CONFIRMED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.CONFIRMED]: [ORDER_STATES.PROCESSING, ORDER_STATES.CANCELLED],
  [ORDER_STATES.PROCESSING]: [ORDER_STATES.SHIPPED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.SHIPPED]: [ORDER_STATES.DELIVERED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.DELIVERED]: [], // Terminal state
  [ORDER_STATES.CANCELLED]: []  // Terminal state
};

export const PAYMENT_STATES = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

/**
 * Check if a state transition is valid
 */
export function canTransition(fromState, toState) {
  const validNextStates = VALID_TRANSITIONS[fromState];
  if (!validNextStates) return false;
  return validNextStates.includes(toState);
}

/**
 * Get next valid states for a given state
 */
export function getNextStates(currentState) {
  return VALID_TRANSITIONS[currentState] || [];
}

/**
 * Validate state exists
 */
export function isValidOrderState(state) {
  return Object.values(ORDER_STATES).includes(state);
}

/**
 * Validate payment state exists
 */
export function isValidPaymentState(state) {
  return Object.values(PAYMENT_STATES).includes(state);
}

/**
 * Check if state is terminal
 */
export function isTerminalState(state) {
  const validNext = VALID_TRANSITIONS[state];
  return validNext && validNext.length === 0;
}

/**
 * Get state metadata
 */
export function getStateMetadata(state) {
  const metadata = {
    [ORDER_STATES.PENDING]: {
      label: 'Pending',
      description: 'Order created, awaiting confirmation',
      color: 'yellow'
    },
    [ORDER_STATES.CONFIRMED]: {
      label: 'Confirmed',
      description: 'Order confirmed, preparing for processing',
      color: 'blue'
    },
    [ORDER_STATES.PROCESSING]: {
      label: 'Processing',
      description: 'Order is being prepared/packed',
      color: 'purple'
    },
    [ORDER_STATES.SHIPPED]: {
      label: 'Shipped',
      description: 'Order has been shipped',
      color: 'orange'
    },
    [ORDER_STATES.DELIVERED]: {
      label: 'Delivered',
      description: 'Order delivered successfully',
      color: 'green'
    },
    [ORDER_STATES.CANCELLED]: {
      label: 'Cancelled',
      description: 'Order has been cancelled',
      color: 'red'
    }
  };

  return metadata[state] || null;
}