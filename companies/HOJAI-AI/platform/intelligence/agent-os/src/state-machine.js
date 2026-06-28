// State machine for Agent OS lifecycle management
// States: idle → running → paused → stopped → dead / error

const VALID_STATES = ['idle', 'running', 'paused', 'stopped', 'dead', 'error'];

const TRANSITIONS = {
  idle:    ['running'],
  running: ['paused', 'stopped', 'dead', 'error'],
  paused:  ['running', 'stopped'],
  stopped: ['idle'],
  dead:    [],
  error:   ['idle', 'running'],
};

export const STATES = VALID_STATES;

/**
 * Validate a state transition
 * @param {string} from - Current state
 * @param {string} to - Target state
 * @param {Object} [rules=TRANSITIONS] - Optional override rules
 * @returns {boolean}
 */
export function validateStateTransition(from, to, rules = TRANSITIONS) {
  if (!VALID_STATES.includes(from)) {
    throw new Error(`Unknown state: ${from}`);
  }
  if (!VALID_STATES.includes(to)) {
    throw new Error(`Unknown state: ${to}`);
  }
  const allowed = rules[from] || [];
  if (!allowed.includes(to)) {
    return false;
  }
  return true;
}

/**
 * Get valid next states for a given state
 * @param {string} state
 * @returns {string[]}
 */
export function getValidTransitions(state) {
  return TRANSITIONS[state] || [];
}

/**
 * Check if a state is terminal (no outgoing transitions)
 * @param {string} state
 * @returns {boolean}
 */
export function isTerminalState(state) {
  return (TRANSITIONS[state] || []).length === 0;
}

/**
 * Get state metadata
 * @param {string} state
 * @returns {Object}
 */
export function getStateInfo(state) {
  return {
    state,
    isTerminal: isTerminalState(state),
    validTransitions: getValidTransitions(state),
    description: {
      idle:    'Agent created but not started',
      running: 'Agent is actively executing',
      paused:  'Agent execution is paused',
      stopped: 'Agent was gracefully stopped',
      dead:    'Agent process has exited',
      error:   'Agent encountered an error',
    }[state] || 'Unknown state',
  };
}

/**
 * Reset an agent to idle state (from stopped or error)
 * @param {string} currentState
 * @returns {string}
 */
export function resetToIdle(currentState) {
  if (currentState === 'stopped' || currentState === 'error') {
    return 'idle';
  }
  throw new Error(`Cannot reset from state: ${currentState}`);
}