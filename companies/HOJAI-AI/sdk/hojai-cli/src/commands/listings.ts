/**
 * `hojai listings` — search and view marketplace listings.
 *
 * Subcommands:
 *   hojai listings search [--query Q] [--category C] [--limit N]
 *   hojai listings get <id>
 */

import type { HojaiConfig } from '../foundation-config.js';
import { request, buildQueryString } from '../foundation-config.js';
import { printJson, printTable, printError, header } from '../output.js';

export async function runListings(args: string[], config: HojaiConfig): Promise<void> {
  const sub = args[0];
  const json = args.includes('--json');

  if (sub === 'search') {
    const query = readFlag(args, '--query') ?? readFlag(args, '--q');
    const category = readFlag(args, '--category');
    const minRating = readFlag(args, '--min-rating');
    const limit = readFlag(args, '--limit') ?? '20';
    const qs = buildQueryString({
      q: query,
      category,
      minRating: minRating ? Number(minRating) : undefined,
      limit: Number(limit)
    });
    try {
      const res = await request<{ items: any[]; total: number }>(config, 'GET', `/api/listings${qs}`);
      if (json) { printJson(res); return; }
      header(`Listings (${res.items.length} of ${res.total})`);
      printTable(
        res.items.map((it: any) => ({
          id: it.listingId,
          title: it.title,
          category: it.category,
          price: it.pricingModel === 'free' ? 'free' : `${(it.price / 100).toFixed(2)} ${it.currency}`,
          rating: it.averageRating?.toFixed(1) ?? '—',
          installs: it.installCount
        })),
        ['id', 'title', 'category', 'price', 'rating', 'installs']
      );
    } catch (e) {
      printError((e as Error).message);
      process.exit(1);
    }
    return;
  }

  if (sub === 'get') {
    const id = args[1];
    if (!id) { printError('Usage: hojai listings get <id>'); process.exit(1); }
    try {
      const listing = await request(config, 'GET', `/api/listings/${encodeURIComponent(id)}`);
      printJson(listing);
    } catch (e) {
      printError((e as Error).message);
      process.exit(1);
    }
    return;
  }

  printError('Usage: hojai listings [search|get]');
  process.exit(1);
}

function readFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  return args[i + 1];
}
