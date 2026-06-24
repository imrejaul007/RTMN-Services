/**
 * `hojai help` / `hojai --help` / `hojai` (no args) — show usage.
 */

import { printInfo, header } from '../output.js';

export function printHelp(): void {
  header('hojai — the HOJAI command-line tool');
  console.log(`
Usage: hojai <command> [args] [flags]

Commands:
  config [show|set|clear]        Manage CLI configuration
  whoami                        Show current API key + gateway health
  listings search               Search the marketplace
  listings get <id>             Show a marketplace listing
  memory capture <text>         Capture a memory
  memory search <query>         Search your memories
  memory compose <owner> <q>    Compose LLM context
  ai-spec generate              Generate hojai.ai.md + .hojai/ files
  ai-spec read                  Show current AI-native spec
  ai-spec validate              Validate existing AI-native spec
  help                          Show this help
  version                       Print version

Flags (global):
  --json                        Machine-readable JSON output
  --api-key <key>               Override API key
  --base-url <url>              Override base URL

Environment:
  HOJAI_API_KEY                 API key (overrides config file)
  HOJAI_BASE_URL                Base URL (overrides config file)
  NO_COLOR                      Disable colored output

Examples:
  hojai config set --api-key hojai_live_xxxx
  hojai whoami
  hojai listings search --query "negotiation" --category agent
  hojai memory capture "Met Sarah at HOJAI meetup" --tags conference
  hojai memory compose u-1 "What is Sarah interested in?"
  hojai ai-spec generate    # in your HOJAI project, writes 3 files
`);
  printInfo('All HOJAI SDKs are available as @hojai/* packages on npm.');
}
