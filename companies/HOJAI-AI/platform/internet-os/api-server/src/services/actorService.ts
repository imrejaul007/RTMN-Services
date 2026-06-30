/**
 * Actor Service
 * Manages actor execution and registry
 *
 * REUSES: Actor Runtime for core functionality
 */

import { ActorRuntime, ActorConfig, ActorInput, ActorOutput, Actor } from '@hojai/actor-runtime';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ActorService {
  private runtime: ActorRuntime;
  private stats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    totalDuration: 0,
  };

  constructor() {
    this.runtime = new ActorRuntime();
  }

  /**
   * Register an actor
   */
  registerActor(actor: Actor): void {
    this.runtime.getRegistry().register(actor);
  }

  /**
   * Load and register all built actors from disk
   */
  async loadAllActors(): Promise<number> {
    const actorNames = [
      'google-maps-actor',
      'zomato-actor',
      'airbnb-actor',
      'linkedin-actor',
      'news-actor',
      'company-intel-actor',
      'justdial-actor',
      'shopify-actor',
      'amazon-actor',
      'twitter-actor',
      'reddit-actor',
      'glassdoor-actor',
      'instagram-actor',
      'youtube-actor',
      'crunchbase-actor',
      'github-actor',
      'google-trends-actor',
    ];

    // Path to actors directory (relative to this file)
    const actorsDir = path.resolve(__dirname, '../../../actors');
    let loaded = 0;

    for (const name of actorNames) {
      try {
        const distPath = path.join(actorsDir, name, 'dist/index.js');

        // Read the actor file and replace the relative import with absolute path
        const fs = await import('fs');
        let content = fs.readFileSync(distPath, 'utf-8');

        // Replace `../../actor-runtime/dist/index.js` with absolute path
        const actorRuntimePath = path.resolve(__dirname, '../../../actor-runtime/dist/index.js');
        const actorRuntimeUrl = pathToFileURL(actorRuntimePath).href;
        content = content.replace(
          /from\s+['"]\.\.\/\.\.\/actor-runtime\/dist\/index\.js['"]/g,
          `from '${actorRuntimeUrl}'`
        );

        // Write to temp file
        const tempPath = path.join(actorsDir, name, 'dist/_patched.mjs');
        fs.writeFileSync(tempPath, content);

        const module: any = await import(pathToFileURL(tempPath).href);

        // Find the actor class - check keys first (like 'GoogleMapsActor', 'ZomatoActor')
        const possibleNames = [
          name.replace(/-/g, '').replace(/^(.)/, (m) => m.toUpperCase()) + 'Actor', // GoogleMapsActor
          name.replace(/-/g, ''), // googlemapsactor
          name.replace(/-actor$/, '').replace(/-/g, '').replace(/^(.)/, (m) => m.toUpperCase()), // GoogleMaps
        ];

        let ActorClass = module.default;
        for (const n of possibleNames) {
          if (module[n] && typeof module[n] === 'function') {
            ActorClass = module[n];
            break;
          }
        }

        // If still not found, find any class ending with 'Actor'
        if (!ActorClass || typeof ActorClass !== 'function') {
          for (const [key, value] of Object.entries(module)) {
            if (typeof value === 'function' && key.endsWith('Actor')) {
              ActorClass = value;
              break;
            }
          }
        }

        if (ActorClass && typeof ActorClass === 'function') {
          this.registerActor(new ActorClass());
          loaded++;
        } else {
          console.warn(`No Actor class found in ${name}. Exports:`, Object.keys(module));
        }

        // Cleanup temp file
        fs.unlinkSync(tempPath);
      } catch (error) {
        console.warn(`Could not load actor ${name}:`, (error as Error).message);
      }
    }

    console.log(`Loaded ${loaded}/${actorNames.length} actors`);
    return loaded;
  }

  /**
   * Run an actor
   */
  async runActor(
    actorId: string,
    action: string,
    params?: Record<string, any>,
    options?: Record<string, any>
  ): Promise<ActorOutput> {
    const input: ActorInput = {
      actor: actorId,
      action: action || 'scrape',
      params: params || {},
      options: options || {},
    };

    const result = await this.runtime.execute(input);

    this.stats.totalRuns++;
    this.stats.totalDuration += result.metadata?.duration || 0;
    if (result.success) {
      this.stats.successfulRuns++;
    } else {
      this.stats.failedRuns++;
    }

    return result;
  }

  /**
   * Run multiple actors sequentially
   */
  async runBatch(inputs: ActorInput[]): Promise<ActorOutput[]> {
    return this.runtime.executeBatch(inputs);
  }

  /**
   * Run multiple actors in parallel
   */
  async runBatchParallel(inputs: ActorInput[], concurrency = 5): Promise<ActorOutput[]> {
    return this.runtime.executeBatchParallel(inputs, concurrency);
  }

  /**
   * List all actors
   */
  listActors(): ActorConfig[] {
    return this.runtime.getRegistry().list();
  }

  /**
   * Get actor details
   */
  getActor(id: string): ActorConfig | undefined {
    return this.runtime.getRegistry().list().find((a: ActorConfig) => a.id === id);
  }

  /**
   * Search actors
   */
  searchActors(query: string): ActorConfig[] {
    return this.runtime.getRegistry().search(query);
  }

  /**
   * Get service stats
   */
  getStats() {
    return {
      ...this.stats,
      avgDuration:
        this.stats.totalRuns > 0
          ? Math.round(this.stats.totalDuration / this.stats.totalRuns)
          : 0,
      successRate:
        this.stats.totalRuns > 0
          ? Math.round((this.stats.successfulRuns / this.stats.totalRuns) * 100)
          : 0,
    };
  }

  /**
   * Health check
   */
  isHealthy(): boolean {
    return true;
  }
}

export const actorService = new ActorService();
export default actorService;