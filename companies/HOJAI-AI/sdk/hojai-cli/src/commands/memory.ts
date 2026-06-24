/**
 * `hojai memory` — capture, search, and compose memories.
 *
 * Subcommands:
 *   hojai memory capture <text> [--type TYPE] [--tags T1,T2]
 *   hojai memory search <query> [--limit N]
 *   hojai memory compose <owner> <query> [--max-tokens N]
 */

import type { HojaiConfig } from '../foundation-config.js';
import { request, buildQueryString } from '../foundation-config.js';
import { printJson, printTable, printSuccess, printError, header } from '../output.js';

export async function runMemory(args: string[], config: HojaiConfig): Promise<void> {
  const sub = args[0];
  const json = args.includes('--json');

  if (sub === 'capture') {
    const text = args[1];
    if (!text) { printError('Usage: hojai memory capture <text> [--type TYPE]'); process.exit(1); }
    const type = readFlag(args, '--type') ?? 'note';
    const tags = (readFlag(args, '--tags') ?? '').split(',').filter(Boolean);
    try {
      const mem = await request<{ id: string }>(config, 'POST', '/api/memory', { ownerId: 'cli-user', type, content: text, tags });
      if (json) { printJson(mem); return; }
      printSuccess(`Captured memory: ${mem.id}`);
    } catch (e) {
      printError((e as Error).message); process.exit(1);
    }
    return;
  }

  if (sub === 'search') {
    const query = args[1];
    if (!query) { printError('Usage: hojai memory search <query>'); process.exit(1); }
    try {
      const items = await request<any[]>(config, 'GET', `/api/memory/cli-user${buildQueryString({})}`);
      const filtered = items.filter((m: any) => m.content.toLowerCase().includes(query.toLowerCase())).slice(0, 20);
      if (json) { printJson(filtered); return; }
      header(`Memory search: "${query}" (${filtered.length} hits)`);
      printTable(
        filtered.map((m: any) => ({
          id: m.id, type: m.type, content: m.content.slice(0, 60), captured: m.createdAt?.slice(0, 10)
        })),
        ['id', 'type', 'content', 'captured']
      );
    } catch (e) {
      printError((e as Error).message); process.exit(1);
    }
    return;
  }

  if (sub === 'compose') {
    const owner = args[1];
    const query = args[2];
    if (!owner || !query) { printError('Usage: hojai memory compose <owner> <query>'); process.exit(1); }
    const maxTokens = Number(readFlag(args, '--max-tokens') ?? '2000');
    try {
      const ctx = await request<{ items: Array<{ relevance: number; content: string }>; totalTokens: number }>(config, 'POST', '/api/context', { ownerId: owner, query, maxTokens });
      if (json) { printJson(ctx); return; }
      header(`Composed context for "${query}"`);
      console.log(`  ${ctx.items.length} items, ${ctx.totalTokens} tokens`);
      for (const item of ctx.items.slice(0, 5)) {
        console.log(`  - [${item.relevance.toFixed(2)}] ${item.content.slice(0, 80)}`);
      }
    } catch (e) {
      printError((e as Error).message); process.exit(1);
    }
    return;
  }

  printError('Usage: hojai memory [capture|search|compose]');
  process.exit(1);
}

function readFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  return args[i + 1];
}
