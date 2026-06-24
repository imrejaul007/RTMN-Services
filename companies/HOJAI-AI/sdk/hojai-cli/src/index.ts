/**
 * @hojai/cli — main entry point.
 *
 * Usage: `hojai <command> [args] [flags]`
 * Run `hojai help` for a full list of commands.
 */

import { loadConfig } from './config.js';
import { runConfig } from './commands/config.js';
import { runListings } from './commands/listings.js';
import { runMemory } from './commands/memory.js';
import { runWhoami } from './commands/whoami.js';
import { runAiSpec } from './commands/ai-spec.js';
import { printHelp } from './commands/help.js';
import { printError } from './output.js';

export const VERSION = '1.0.0';

function readGlobalFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  return args[i + 1];
}

export async function main(argv: string[]): Promise<void> {
  // Skip argv[0] (node) and argv[1] (script path)
  const args = argv.slice(2);
  // --help / -h
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h' || args[0] === 'help') {
    printHelp();
    return;
  }
  if (args[0] === 'version' || args[0] === '--version' || args[0] === '-v') {
    console.log(`hojai v${VERSION}`);
    return;
  }

  // Build config from flags + env + file
  const config = loadConfig({
    apiKey: readGlobalFlag(args, '--api-key'),
    baseUrl: readGlobalFlag(args, '--base-url') ?? '',
  });
  // Strip the global flags from args before passing to subcommands
  const subArgs = args.filter((_, i) => {
    if (args[i - 1] === '--api-key') return false;
    if (args[i - 1] === '--base-url') return false;
    return args[i] !== '--api-key' && args[i] !== '--base-url';
  });

  const command = subArgs[0];
  const rest = subArgs.slice(1);

  try {
    switch (command) {
      case 'config': return await runConfig(rest);
      case 'whoami': return await runWhoami(rest, config);
      case 'listings': return await runListings(rest, config);
      case 'memory': return await runMemory(rest, config);
      case 'ai-spec': return await runAiSpec(rest);
      default:
        printError(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (e) {
    printError((e as Error).message);
    process.exit(1);
  }
}
