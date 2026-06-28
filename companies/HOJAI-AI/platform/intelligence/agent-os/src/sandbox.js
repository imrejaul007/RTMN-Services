// Sandbox manager - isolated working directories per agent
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SANDBOX_ROOT = join(__dirname, '..', '..', 'agent-sandboxes');

if (!fs.existsSync(SANDBOX_ROOT)) {
  fs.mkdirSync(SANDBOX_ROOT, { recursive: true });
}

/**
 * Get sandbox directory for an agent
 * @param {string} agentId
 * @returns {string} absolute path
 */
export function getSandboxDir(agentId) {
  const dir = join(SANDBOX_ROOT, agentId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * List all sandbox directories
 * @returns {string[]}
 */
export function listSandboxes() {
  try {
    return fs.readdirSync(SANDBOX_ROOT);
  } catch {
    return [];
  }
}

/**
 * Delete a sandbox directory
 * @param {string} agentId
 * @returns {boolean}
 */
export function deleteSandbox(agentId) {
  const dir = join(SANDBOX_ROOT, agentId);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

/**
 * Write a file inside an agent's sandbox
 * @param {string} agentId
 * @param {string} filename
 * @param {string} content
 */
export function writeSandboxFile(agentId, filename, content) {
  const dir = getSandboxDir(agentId);
  const path = join(dir, filename);
  fs.writeFileSync(path, content);
}

/**
 * Read a file from an agent's sandbox
 * @param {string} agentId
 * @param {string} filename
 * @returns {string|null}
 */
export function readSandboxFile(agentId, filename) {
  const dir = getSandboxDir(agentId);
  const path = join(dir, filename);
  if (!fs.existsSync(path)) return null;
  return fs.readFileSync(path, 'utf-8');
}

/**
 * List files in an agent's sandbox
 * @param {string} agentId
 * @returns {string[]}
 */
export function listSandboxFiles(agentId) {
  const dir = getSandboxDir(agentId);
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}