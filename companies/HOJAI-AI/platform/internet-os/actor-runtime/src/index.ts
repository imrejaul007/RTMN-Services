/**
 * HOJAI Actor Runtime
 * Standardized web data extraction framework
 *
 * Uses Cheerio for HTML parsing (works in Node.js)
 * Integrates with existing HOJAI services:
 * - MemoryOS (4703) - Store scraped data
 * - TwinOS Hub (4705) - Register entities
 * - Knowledge Extraction (4784) - NER, entity linking
 * - Webhook Bus (4110) - Notifications
 */

import { EventEmitter } from 'events';

// Re-export utilities
export {
  parseHtml,
  extractText,
  extractAllText,
  extractAttribute,
  extractLinks,
  extractImages,
  extractJsonLd,
  extractMetaTags,
  extractTable,
  extractList,
  elementExists,
  countElements,
  extractHtmlSnippet,
} from './utils/parseHtml.js';

// Actor types
export interface ActorConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  rateLimit?: {
    requests: number;
    window: number; // in ms
  };
}

export interface ActorInput {
  actor: string;
  action: string;
  params?: Record<string, any>;
  options?: {
    timeout?: number;
    retries?: number;
    proxy?: boolean;
  };
}

export interface ActorOutput {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    scrapedAt: string;
    source: string;
    itemsFound: number;
    duration: number;
  };
}

// Base Actor class
export abstract class Actor {
  public config: ActorConfig;
  private lastRequest = 0;

  constructor(config: ActorConfig) {
    this.config = config;
  }

  abstract scrape(input: any): Promise<ActorOutput>;
  abstract validate(input: any): Promise<boolean>;

  protected async rateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    const now = Date.now();
    const elapsed = now - this.lastRequest;
    const minInterval = this.config.rateLimit.window / this.config.rateLimit.requests;

    if (elapsed < minInterval) {
      await new Promise((r) => setTimeout(r, minInterval - elapsed));
    }

    this.lastRequest = Date.now();
  }
}

// Actor Registry
export class ActorRegistry {
  private actors = new Map<string, Actor>();

  register(actor: Actor): void {
    this.actors.set(actor.config.id, actor);
  }

  get(id: string): Actor | undefined {
    return this.actors.get(id);
  }

  list(): ActorConfig[] {
    return Array.from(this.actors.values()).map((a) => a.config);
  }

  search(query: string): ActorConfig[] {
    return this.list().filter(
      (a) =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.description.toLowerCase().includes(query.toLowerCase()) ||
        a.capabilities.some((c) => c.toLowerCase().includes(query.toLowerCase()))
    );
  }
}

// Actor Runtime - executes actors
export class ActorRuntime extends EventEmitter {
  private registry: ActorRegistry;
  private requestCounts = new Map<string, number>();

  constructor() {
    super();
    this.registry = new ActorRegistry();
  }

  async execute(input: ActorInput): Promise<ActorOutput> {
    const startTime = Date.now();

    this.emit('start', { actor: input.actor, action: input.action });

    try {
      const actor = this.registry.get(input.actor);

      if (!actor) {
        throw new Error(`Actor not found: ${input.actor}`);
      }

      // Validate input
      const valid = await actor.validate(input.params);
      if (!valid) {
        throw new Error('Invalid input for actor');
      }

      // Apply rate limiting (use any to access protected method)
      await (actor as any).rateLimit();

      // Execute actor
      const output = await actor.scrape(input.params);

      const duration = Date.now() - startTime;
      output.metadata = {
        scrapedAt: new Date().toISOString(),
        source: input.actor,
        itemsFound: Array.isArray(output.data) ? output.data.length : 1,
        duration,
      };

      this.emit('complete', { actor: input.actor, output });
      return output;
    } catch (error) {
      const output: ActorOutput = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: input.actor,
          itemsFound: 0,
          duration: Date.now() - startTime,
        },
      };

      this.emit('error', { actor: input.actor, error: output.error });
      return output;
    }
  }

  // Batch execution
  async executeBatch(inputs: ActorInput[]): Promise<ActorOutput[]> {
    const results: ActorOutput[] = [];

    for (const input of inputs) {
      const result = await this.execute(input);
      results.push(result);
    }

    return results;
  }

  // Parallel batch
  async executeBatchParallel(inputs: ActorInput[], concurrency = 5): Promise<ActorOutput[]> {
    const chunks: ActorInput[][] = [];

    for (let i = 0; i < inputs.length; i += concurrency) {
      chunks.push(inputs.slice(i, i + concurrency));
    }

    const results: ActorOutput[] = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk.map((input) => this.execute(input)));
      results.push(...chunkResults);
    }

    return results;
  }

  getRegistry(): ActorRegistry {
    return this.registry;
  }
}

// HTTP fetcher utility
export async function fetchUrl(
  url: string,
  options: {
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
    proxy?: string;
  } = {}
): Promise<string> {
  const { headers = {}, timeout = 30000, retries = 3, proxy } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          ...headers,
        },
        signal: controller.signal,
      };

      if (proxy) {
        // Use proxy agent if configured - requires https-proxy-agent package
        // For now, we skip proxy in basic implementation
        console.warn('Proxy support requires https-proxy-agent package');
      }

      clearTimeout(timeoutId);

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }

  throw new Error('Should not reach here');
}

// Singleton runtime
export const actorRuntime = new ActorRuntime();
export default actorRuntime;
