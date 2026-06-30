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
export { parseHtml, extractText, extractAllText, extractAttribute, extractLinks, extractImages, extractJsonLd, extractMetaTags, extractTable, extractList, elementExists, countElements, extractHtmlSnippet, } from './utils/parseHtml.js';
export interface ActorConfig {
    id: string;
    name: string;
    description: string;
    version: string;
    capabilities: string[];
    rateLimit?: {
        requests: number;
        window: number;
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
export declare abstract class Actor {
    config: ActorConfig;
    private lastRequest;
    constructor(config: ActorConfig);
    abstract scrape(input: any): Promise<ActorOutput>;
    abstract validate(input: any): Promise<boolean>;
    protected rateLimit(): Promise<void>;
}
export declare class ActorRegistry {
    private actors;
    register(actor: Actor): void;
    get(id: string): Actor | undefined;
    list(): ActorConfig[];
    search(query: string): ActorConfig[];
}
export declare class ActorRuntime extends EventEmitter {
    private registry;
    private requestCounts;
    constructor();
    execute(input: ActorInput): Promise<ActorOutput>;
    executeBatch(inputs: ActorInput[]): Promise<ActorOutput[]>;
    executeBatchParallel(inputs: ActorInput[], concurrency?: number): Promise<ActorOutput[]>;
    getRegistry(): ActorRegistry;
}
export declare function fetchUrl(url: string, options?: {
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
    proxy?: string;
}): Promise<string>;
export declare const actorRuntime: ActorRuntime;
export default actorRuntime;
//# sourceMappingURL=index.d.ts.map