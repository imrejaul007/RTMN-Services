import chalk from 'chalk';
import { exec, execQuiet } from '../utils.js';

export async function logs(service?: string, options?: Record<string, unknown>) {
  const runtimeDir = process.env.NEXHA_RUNTIME_DIR ?? process.cwd();
  const dc = execQuiet('docker compose version') ? 'docker compose' : 'docker-compose';

  const follow = options?.['follow'] ?? options?.f ?? false;
  const tail = options?.['tail'] ?? '100';

  if (!service) {
    console.log(chalk.yellow('Streaming logs from all services...\n'));
    exec(`${dc} logs --follow --tail=${tail}`, runtimeDir);
    return;
  }

  // Map user-friendly name to container name
  const nameMap: Record<string, string> = {
    gateway: 'nexha-gateway',
    corpid: 'nexha-corpid',
    memory: 'nexha-memory',
    twinos: 'nexha-twinos',
    'sutar-gateway': 'nexha-sutar-gateway',
    trust: 'nexha-trust-engine',
    contract: 'nexha-contract-os',
    negotiation: 'nexha-negotiation-engine',
    economy: 'nexha-economy-os',
    directory: 'nexha-business-directory',
    partner: 'nexha-partner-graph',
    commerce: 'nexha-commerce-runtime',
    capability: 'nexha-capability-os',
    acp: 'nexha-acp-messaging',
    marketplace: 'nexha-agent-marketplace',
    mission: 'nexha-mission-planner',
  };

  const containerName = nameMap[service] ?? service;
  console.log(chalk.blue(`Streaming logs from ${containerName}...\n`));
  exec(`${dc} logs --follow --tail=${tail} ${containerName}`, runtimeDir);
}
