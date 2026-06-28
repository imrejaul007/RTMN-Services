// Sandbox manager - isolated working directories per agent
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SANDBOX_ROOT = join(__dirname, '..', '..', '..', 'agent-sandboxes');
if (!fs.existsSync(SANDBOX_ROOT)) fs.mkdirSync(SANDBOX_ROOT, { recursive: true });

export function getSandboxDir(agentId) {
  const dir = join(SANDBOX_ROOT, agentId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function listSandboxes() { try { return fs.readdirSync(SANDBOX_ROOT); } catch { return []; } }

export function deleteSandbox(agentId) {
  const dir = join(SANDBOX_ROOT, agentId);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

export function writeSandboxFile(agentId, filename, content) {
  const path = join(getSandboxDir(agentId), filename);
  fs.writeFileSync(path, content);
}

export function readSandboxFile(agentId, filename) {
  const path = join(getSandboxDir(agentId), filename);
  if (!fs.existsSync(path)) return null;
  return fs.readFileSync(path, 'utf-8');
}

export function listSandboxFiles(agentId) { try { return fs.readdirSync(getSandboxDir(agentId)); } catch { return []; } }
