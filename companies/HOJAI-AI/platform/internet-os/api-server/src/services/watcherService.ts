/**
 * Watcher Service
 * Manages watcher runtime and state
 *
 * REUSES: Watcher Runtime for core functionality
 */

import { WatcherRuntime, WatcherConfig, WatcherState } from '@hojai/watcher-runtime';

export class WatcherService {
  private runtime: WatcherRuntime;
  private stats = {
    totalWatchers: 0,
    activeWatchers: 0,
    pausedWatchers: 0,
    totalChanges: 0,
  };

  constructor() {
    this.runtime = new WatcherRuntime();
  }

  /**
   * Create a watcher
   */
  createWatcher(config: WatcherConfig): WatcherConfig {
    this.runtime.addWatcher(config);
    this.stats.totalWatchers++;
    this.runtime.startWatcher(config.id);
    return config;
  }

  /**
   * Delete a watcher
   */
  async deleteWatcher(id: string): Promise<boolean> {
    const watcher = this.runtime.getWatcher(id);
    if (!watcher) return false;

    await this.runtime.removeWatcher(id);
    this.stats.totalWatchers--;
    return true;
  }

  /**
   * Get watcher
   */
  getWatcher(id: string): WatcherConfig | undefined {
    return this.runtime.getWatcher(id);
  }

  /**
   * List all watchers
   */
  listWatchers(): WatcherConfig[] {
    return this.runtime.listWatchers();
  }

  /**
   * Get watcher state
   */
  getWatcherState(id: string): WatcherState | undefined {
    return this.runtime.getState(id);
  }

  /**
   * Get watcher changes
   */
  getWatcherChanges(id: string, limit = 100): any[] {
    return this.runtime.getChanges(id, limit);
  }

  /**
   * Start a watcher
   */
  startWatcher(id: string): boolean {
    const watcher = this.runtime.getWatcher(id);
    if (!watcher) return false;

    this.runtime.startWatcher(id);
    return true;
  }

  /**
   * Stop a watcher
   */
  stopWatcher(id: string): boolean {
    const watcher = this.runtime.getWatcher(id);
    if (!watcher) return false;

    this.runtime.stopWatcher(id);
    return true;
  }

  /**
   * Pause a watcher
   */
  pauseWatcher(id: string, duration?: number): void {
    this.runtime.pauseWatcher(id, duration);
  }

  /**
   * Force check a watcher
   */
  async forceCheck(id: string): Promise<WatcherState | undefined> {
    return this.runtime.forceCheck(id);
  }

  /**
   * Start all watchers
   */
  startAll(): void {
    this.runtime.start();
  }

  /**
   * Stop all watchers
   */
  stopAll(): void {
    this.runtime.stop();
  }

  /**
   * Get service stats
   */
  getStats() {
    const states = this.runtime.getAllStates();
    let active = 0;
    let paused = 0;
    let totalChanges = 0;

    states.forEach((state) => {
      if (state.status === 'active') active++;
      else if (state.status === 'paused') paused++;
      totalChanges += state.changes.length;
    });

    return {
      ...this.stats,
      activeWatchers: active,
      pausedWatchers: paused,
      totalChanges,
    };
  }

  /**
   * Health check
   */
  isHealthy(): boolean {
    return this.runtime.listWatchers().length >= 0;
  }
}

// Singleton instance
export const watcherService = new WatcherService();
export default watcherService;
