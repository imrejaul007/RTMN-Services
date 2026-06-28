// Process manager for spawning and killing agent processes
import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Track running agent processes
const processes = new Map();

// Default agent entry point
const AGENT_ENTRY = join(__dirname, '..', 'agent-entry.js');

/**
 * Spawn an agent process
 * @param {Object} agent - Agent config
 * @returns {number} pid
 */
export function spawnAgent(agent) {
  if (processes.has(agent.id)) {
    throw new Error(`Agent ${agent.id} already running`);
  }

  // Resolve agent script
  const scriptPath = agent.config?.scriptPath || AGENT_ENTRY;
  const sandboxDir = agent.sandboxDir;

  // Ensure sandbox dir exists
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }

  const child = spawn('node', [scriptPath], {
    cwd: sandboxDir,
    env: {
      ...process.env,
      AGENT_ID: agent.id,
      AGENT_NAME: agent.name,
      AGENT_TYPE: agent.type,
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  processes.set(agent.id, child);

  child.stdout?.on('data', (data) => {
    console.log(`[agent:${agent.id}] ${data.toString().trim()}`);
  });

  child.stderr?.on('data', (data) => {
    console.error(`[agent:${agent.id} ERROR] ${data.toString().trim()}`);
  });

  child.on('exit', (code, signal) => {
    console.log(`[agent:${agent.id}] exited code=${code} signal=${signal}`);
    processes.delete(agent.id);
  });

  child.on('error', (err) => {
    console.error(`[agent:${agent.id}] error: ${err.message}`);
    processes.delete(agent.id);
  });

  return child.pid;
}

/**
 * Kill an agent process
 * @param {string} agentId
 * @returns {boolean} true if killed
 */
export function killAgent(agentId) {
  const child = processes.get(agentId);
  if (!child) return false;
  child.kill('SIGTERM');
  processes.delete(agentId);
  return true;
}

/**
 * Get the process handle for an agent
 * @param {string} agentId
 * @returns {ChildProcess|null}
 */
export function getAgentProcess(agentId) {
  return processes.get(agentId) || null;
}

/**
 * Check if agent is running
 * @param {string} agentId
 * @returns {boolean}
 */
export function isAgentRunning(agentId) {
  return processes.has(agentId);
}

/**
 * Get all running agent IDs
 * @returns {string[]}
 */
export function getRunningAgents() {
  return Array.from(processes.keys());
}

/**
 * Send input to agent stdin
 * @param {string} agentId
 * @param {string} data
 */
export function sendToAgent(agentId, data) {
  const child = processes.get(agentId);
  if (child && child.stdin) {
    child.stdin.write(data + '\n');
  }
}