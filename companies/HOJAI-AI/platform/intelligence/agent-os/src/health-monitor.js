// Health monitoring for Agent OS
// Tracks heartbeats and marks stale agents as dead

const HEARTBEAT_TIMEOUT_MS = 30_000; // 30 seconds

// In-memory heartbeat timestamps
const heartbeats = new Map();

/**
 * Record a heartbeat for an agent
 * @param {string} agentId
 */
export function recordHeartbeat(agentId) {
  heartbeats.set(agentId, Date.now());
}

/**
 * Get health info for a single agent
 * @param {Object} agent
 * @returns {Object}
 */
export function getAgentHealth(agent) {
  const lastBeat = heartbeats.get(agent.id);
  const now = Date.now();
  const elapsed = lastBeat ? now - lastBeat : null;
  const isStale = elapsed !== null && elapsed > HEARTBEAT_TIMEOUT_MS;
  const isRunning = agent.state === 'running';

  return {
    agentId: agent.id,
    name: agent.name,
    state: agent.state,
    pid: agent.pid,
    lastHeartbeat: agent.lastHeartbeat,
    elapsedMs: elapsed,
    isStale,
    isAlive: isRunning && !isStale,
    uptime: agent.createdAt ? Math.floor((now - new Date(agent.createdAt).getTime()) / 1000) : null,
  };
}

/**
 * Mark dead agents based on heartbeat timeout
 * @param {Map} agentsMap
 * @returns {string[]} agent IDs that were marked dead
 */
export function markDeadAgents(agentsMap) {
  const dead = [];
  const now = Date.now();
  for (const [id, agent] of agentsMap) {
    if (agent.state === 'running') {
      const lastBeat = heartbeats.get(id);
      if (!lastBeat || (now - lastBeat) > HEARTBEAT_TIMEOUT_MS) {
        agent.state = 'dead';
        agent.exitCode = 'heartbeat_timeout';
        agentsMap.set(id, agent);
        dead.push(id);
      }
    }
  }
  return dead;
}

/**
 * Get all stale agent IDs (running but no recent heartbeat)
 * @param {Map} agentsMap
 * @returns {string[]}
 */
export function getStaleAgents(agentsMap) {
  const stale = [];
  const now = Date.now();
  for (const [id, agent] of agentsMap) {
    if (agent.state === 'running') {
      const lastBeat = heartbeats.get(id);
      if (!lastBeat || (now - lastBeat) > HEARTBEAT_TIMEOUT_MS) {
        stale.push(id);
      }
    }
  }
  return stale;
}

/**
 * Reset heartbeat for an agent
 * @param {string} agentId
 */
export function clearHeartbeat(agentId) {
  heartbeats.delete(agentId);
}