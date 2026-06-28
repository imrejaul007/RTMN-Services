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

export function validateStateTransition(from, to, rules = TRANSITIONS) {
  if (!VALID_STATES.includes(from)) throw new Error(`Unknown state: ${from}`);
  if (!VALID_STATES.includes(to)) throw new Error(`Unknown state: ${to}`);
  if (!(rules[from] || []).includes(to)) throw new Error(`Invalid transition: ${from} → ${to}`);
  return true;
}

export function getValidTransitions(state) {
  return TRANSITIONS[state] || [];
}

export function isTerminalState(state) {
  return (TRANSITIONS[state] || []).length === 0;
}

export function getStateInfo(state) {
  const descriptions = {
    idle:    'Agent created but not started',
    running: 'Agent is actively executing',
    paused:  'Agent execution is paused',
    stopped: 'Agent was gracefully stopped',
    dead:    'Agent process has exited',
    error:   'Agent encountered an error',
  };
  return {
    state,
    isTerminal: isTerminalState(state),
    validTransitions: getValidTransitions(state),
    description: descriptions[state] || 'Unknown state',
  };
}

export function resetToIdle(currentState) {
  if (currentState === 'stopped' || currentState === 'error') return 'idle';
  throw new Error(`Cannot reset from state: ${currentState}`);
}
