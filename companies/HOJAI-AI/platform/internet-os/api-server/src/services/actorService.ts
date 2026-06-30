/**
 * Actor Service
 * Manages actor execution and registry
 *
 * REUSES: Actor Runtime for core functionality
 */

import { ActorRuntime, ActorConfig, ActorInput, ActorOutput } from '@hojai/actor-runtime';
import { GoogleMapsActor } from '../actors/google-maps-actor/index.js';
import { ZomatoActor } from '../actors/zomato-actor/index.js';
import { AirbnbActor } from '../actors/airbnb-actor/index.js';
import { LinkedInActor } from '../actors/linkedin-actor/index.js';
import { NewsActor } from '../actors/news-actor/index.js';
import { CompanyIntelActor } from '../actors/company-intel-actor/index.js';
import { JustDialActor } from '../actors/justdial-actor/index.js';

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
    this.registerDefaultActors();
  }

  /**
   * Register default actors
   */
  private registerDefaultActors(): void {
    // Register all built actors
    this.runtime.getRegistry().register(new GoogleMapsActor());
    this.runtime.getRegistry().register(new ZomatoActor());
    this.runtime.getRegistry().register(new AirbnbActor());
    this.runtime.getRegistry().register(new LinkedInActor());
    this.runtime.getRegistry().register(new NewsActor());
    this.runtime.getRegistry().register(new CompanyIntelActor());
    this.runtime.getRegistry().register(new JustDialActor());

    console.log(`Registered ${this.runtime.getRegistry().list().length} actors`);
  }

  /**
   * Register a custom actor
   */
  registerActor(actor: any): void {
    this.runtime.getRegistry().register(actor);
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

    // Update stats
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
    return this.runtime.getRegistry().list().find((a) => a.id === id);
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
    return this.runtime.getRegistry().list().length > 0;
  }
}

// Singleton instance
export const actorService = new ActorService();
export default actorService;
