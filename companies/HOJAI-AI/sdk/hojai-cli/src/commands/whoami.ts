/**
 * `hojai whoami` — show the current API key identity.
 */

import type { HojaiConfig } from '../foundation-config.js';
import { request } from '../foundation-config.js';
import { printJson, printError, printInfo } from '../output.js';

export async function runWhoami(args: string[], config: HojaiConfig): Promise<void> {
  const json = args.includes('--json');
  if (!config.apiKey) {
    printError('No API key configured. Run: hojai config set --api-key <key>');
    process.exit(1);
  }
  try {
    // Probe the gateway to confirm the key is valid
    const health = await request<{ status: string; version?: string }>(config, 'GET', '/health');
    if (json) { printJson({ apiKey: config.apiKey.slice(0, 8) + '...', baseUrl: config.baseUrl, health }); return; }
    printInfo(`API key: ${config.apiKey.slice(0, 8)}...`);
    printInfo(`Base URL: ${config.baseUrl}`);
    printInfo(`Gateway: ${health.status}${health.version ? ` (v${health.version})` : ''}`);
  } catch (e) {
    printError(`Auth check failed: ${(e as Error).message}`);
    process.exit(1);
  }
}
