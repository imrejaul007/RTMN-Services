/**
 * `hojai config` — view / set / clear CLI configuration.
 *
 * Subcommands:
 *   hojai config                    show current config
 *   hojai config set --api-key X    save API key
 *   hojai config set --base-url Y   save base URL
 *   hojai config clear              remove config file
 */

import { loadConfig, saveConfig, configFilePath } from '../config.js';
import { printJson, printSuccess, printInfo, printError, printTable } from '../output.js';

export async function runConfig(args: string[]): Promise<void> {
  const sub = args[0];

  if (!sub || sub === 'show' || sub === 'list') {
    const cfg = loadConfig();
    if (args.includes('--json')) {
      const redacted = { ...cfg, apiKey: cfg.apiKey ? cfg.apiKey.slice(0, 8) + '...' : undefined };
      printJson(redacted);
    } else {
      printTable(
        [
          { key: 'baseUrl', value: cfg.baseUrl },
          { key: 'apiKey', value: cfg.apiKey ? cfg.apiKey.slice(0, 8) + '...' : '(not set)' },
          { key: 'configFile', value: configFilePath() }
        ],
        ['key', 'value']
      );
    }
    return;
  }

  if (sub === 'set') {
    const apiKey = readFlag(args, '--api-key');
    const baseUrl = readFlag(args, '--base-url');
    if (!apiKey && !baseUrl) {
      printError('Nothing to set. Use --api-key or --base-url.');
      process.exit(1);
    }
    const existing = loadConfig();
    const merged = {
      apiKey: apiKey ?? existing.apiKey,
      baseUrl: baseUrl ?? existing.baseUrl
    };
    saveConfig(merged);
    printSuccess(`Saved config to ${configFilePath()}`);
    return;
  }

  if (sub === 'clear') {
    const fs = await import('node:fs');
    try {
      fs.unlinkSync(configFilePath());
      printSuccess('Config cleared.');
    } catch {
      printInfo('No config to clear.');
    }
    return;
  }

  printError(`Unknown config subcommand: ${sub}`);
  printInfo('Try: hojai config [show|set|clear]');
  process.exit(1);
}

function readFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  return args[i + 1];
}
