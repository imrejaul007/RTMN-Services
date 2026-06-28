// Process manager for spawning and killing agent processes
import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const AGENT_ENTRY = join(__dirname, '..', 'agent-entry.js');
const processes = new Map();

export function spawnAgent(agent) {
  if (processes.has(agent.id)) throw new Error(`Agent ${agent.id} already running`);
  const scriptPath = agent.config?.scriptPath || AGENT_ENTRY;
  const sandboxDir = agent.sandboxDir;
  if (!fs.existsSync(sandboxDir)) fs.mkdirSync(sandboxDir, { recursive: true });
  const child = spawn('node', [scriptPath], {
    cwd: sandboxDir,
    env: { ...process.env, AGENT_ID: agent.id, AGENT_NAME: agent.name, AGENT_TYPE: agent.type, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  processes.set(agent.id, child);
  child.stdout?.on('data', (data) => { console.log(`[agent:${agent.id}] ${data.toString().trim()}`); });
  child.stderr?.on('data', (data) => { console.error(`[agent:${agent.id} ERROR] ${data.toString().trim()}`); });
  child.on('exit', () => { processes.delete(agent.id); });
  child.on('error', (err) => { console.error(`[agent:${agent.id}] error: ${err.message}`); processes.delete(agent.id); });
  return child.pid;
}

export function killAgent(agentId) {
  const child = processes.get(agentId);
  if (!child) return false;
  child.kill('SIGTERM');
  processes.delete(agentId);
  return true;
}

export function getAgentProcess(agentId) { return processes.get(agentId) || null; }
export function isAgentRunning(agentId) { return processes.has(agentId); }
export function getRunningAgents() { return Array.from(processes.keys()); }

export function sendToAgent(agentId, data) {
  const child = processes.get(agentId);
  if (child && child.stdin) child.stdin.write(data + '\n');
}
