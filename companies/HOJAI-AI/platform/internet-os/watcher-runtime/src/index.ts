/**
 * HOJAI Watcher Runtime
 * Continuous monitoring of web resources for changes
 */

import { EventEmitter } from 'events';
import { fetchUrl } from '../actor-runtime';

export interface WatcherConfig {
  id: string;
  name: string;
  url: string;
  type: 'price' | 'review' | 'competitor' | 'job' | 'news' | 'custom';
  interval: number; // in milliseconds
  selector?: string; // CSS selector to watch
  transform?: (data: any) => any;
  onChange?: (newValue: any, oldValue: any) => void;
}

export interface WatcherState {
  id: string;
  currentValue: any;
  previousValue: any;
  lastChecked: string;
  changes: ChangeRecord[];
  status: 'active' | 'paused' | 'error';
  error?: string;
}

export interface ChangeRecord {
  timestamp: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

export class WatcherRuntime extends EventEmitter {
  private watchers = new Map<string, WatcherConfig>();
  private states = new Map<string, WatcherState>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private isRunning = false;

  // Add a watcher
  addWatcher(config: WatcherConfig): void {
    this.watchers.set(config.id, config);

    this.states.set(config.id, {
      id: config.id,
      currentValue: null,
      previousValue: null,
      lastChecked: new Date().toISOString(),
      changes: [],
      status: 'paused',
    });

    this.emit('watcher:added', { id: config.id, config });
  }

  // Remove a watcher
  removeWatcher(id: string): void {
    this.stopWatcher(id);
    this.watchers.delete(id);
    this.states.delete(id);
    this.emit('watcher:removed', { id });
  }

  // Start watching all watchers
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    for (const [id, config] of this.watchers) {
      this.startWatcher(id);
    }

    this.emit('runtime:started');
  }

  // Stop all watchers
  stop(): void {
    this.isRunning = false;

    for (const id of this.watchers.keys()) {
      this.stopWatcher(id);
    }

    this.emit('runtime:stopped');
  }

  // Start a specific watcher
  startWatcher(id: string): void {
    const config = this.watchers.get(id);
    if (!config) return;

    const state = this.states.get(id);
    if (!state) return;

    // Clear existing interval
    this.stopWatcher(id);

    // Set initial state
    state.status = 'active';

    // Start watching
    this.checkWatcher(id);

    // Set up interval
    const interval = setInterval(() => {
      this.checkWatcher(id);
    }, config.interval);

    this.intervals.set(id, interval);

    this.emit('watcher:started', { id });
  }

  // Stop a specific watcher
  stopWatcher(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }

    const state = this.states.get(id);
    if (state) {
      state.status = 'paused';
    }

    this.emit('watcher:stopped', { id });
  }

  // Check a watcher for changes
  private async checkWatcher(id: string): Promise<void> {
    const config = this.watchers.get(id);
    const state = this.states.get(id);

    if (!config || !state || state.status !== 'active') return;

    try {
      state.lastChecked = new Date().toISOString();

      // Fetch the page
      const html = await fetchUrl(config.url, { timeout: 30000 });

      // Extract data
      let newValue: any;

      if (config.selector) {
        // Parse selector
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const element = doc.querySelector(config.selector);

        if (element) {
          newValue = {
            text: element.textContent?.trim(),
            html: element.innerHTML,
          };
        }
      } else {
        // Raw HTML
        newValue = { raw: html.substring(0, 1000) };
      }

      // Apply transform if provided
      if (config.transform) {
        newValue = config.transform(newValue);
      }

      // Check for changes
      if (this.hasChanged(state.currentValue, newValue)) {
        const change: ChangeRecord = {
          timestamp: new Date().toISOString(),
          oldValue: state.currentValue,
          newValue,
          changeType: this.detectChangeType(state.currentValue, newValue),
        };

        state.previousValue = state.currentValue;
        state.currentValue = newValue;
        state.changes.push(change);

        // Keep only last 100 changes
        if (state.changes.length > 100) {
          state.changes = state.changes.slice(-100);
        }

        this.emit('watcher:change', { id, change });
        this.emit(`change:${id}`, change);

        // Call onChange callback
        if (config.onChange) {
          config.onChange(newValue, state.previousValue);
        }
      }

      // Update last checked
      this.states.set(id, state);

    } catch (error) {
      state.status = 'error';
      state.error = error instanceof Error ? error.message : 'Unknown error';

      this.emit('watcher:error', { id, error: state.error });
    }
  }

  // Check if values have changed
  private hasChanged(oldValue: any, newValue: any): boolean {
    if (!oldValue && newValue) return true;
    if (oldValue && !newValue) return true;

    if (typeof oldValue === 'string' && typeof newValue === 'string') {
      return oldValue !== newValue;
    }

    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
  }

  // Detect type of change
  private detectChangeType(oldValue: any, newValue: any): 'added' | 'removed' | 'modified' {
    if (!oldValue) return 'added';
    if (!newValue) return 'removed';
    return 'modified';
  }

  // Get watcher state
  getState(id: string): WatcherState | undefined {
    return this.states.get(id);
  }

  // Get all states
  getAllStates(): Map<string, WatcherState> {
    return this.states;
  }

  // Get watcher config
  getWatcher(id: string): WatcherConfig | undefined {
    return this.watchers.get(id);
  }

  // List all watchers
  listWatchers(): WatcherConfig[] {
    return Array.from(this.watchers.values());
  }

  // Pause watcher temporarily
  pauseWatcher(id: string, duration?: number): void {
    this.stopWatcher(id);

    if (duration) {
      setTimeout(() => {
        this.startWatcher(id);
      }, duration);
    }
  }

  // Resume watcher
  resumeWatcher(id: string): void {
    this.startWatcher(id);
  }

  // Force check
  async forceCheck(id: string): Promise<WatcherState | undefined> {
    await this.checkWatcher(id);
    return this.states.get(id);
  }

  // Clear change history
  clearHistory(id: string): void {
    const state = this.states.get(id);
    if (state) {
      state.changes = [];
    }
  }
}

// Pre-built watcher types
export class PriceWatcher {
  constructor(private runtime: WatcherRuntime) {}

  create(id: string, url: string, priceSelector: string, interval = 3600000): void {
    this.runtime.addWatcher({
      id,
      name: `Price Watcher: ${id}`,
      url,
      type: 'price',
      interval,
      selector: priceSelector,
      transform: (data) => {
        // Extract price from text
        const priceMatch = data.text?.match(/[\d,]+\.?\d*/);
        return priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;
      },
    });
  }
}

export class ReviewWatcher {
  constructor(private runtime: WatcherRuntime) {}

  create(id: string, url: string, reviewSelector: string, interval = 86400000): void {
    this.runtime.addWatcher({
      id,
      name: `Review Watcher: ${id}`,
      url,
      type: 'review',
      interval,
      selector: reviewSelector,
      transform: (data) => {
        // Extract rating and count
        const ratingMatch = data.text?.match(/(\d+\.?\d*)\s*(?:stars?|★)/i);
        const countMatch = data.text?.match(/(\d+,?\d*)\s*(?:reviews?|ratings?)/i);
        return {
          rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
          count: countMatch ? parseInt(countMatch[1].replace(/,/g, '')) : null,
          raw: data.text,
        };
      },
    });
  }
}

export class CompetitorWatcher {
  constructor(private runtime: WatcherRuntime) {}

  create(id: string, urls: string[], interval = 43200000): void {
    urls.forEach((url, index) => {
      this.runtime.addWatcher({
        id: `${id}-${index}`,
        name: `Competitor: ${url}`,
        url,
        type: 'competitor',
        interval,
        onChange: (newValue, oldValue) => {
          console.log(`Competitor ${url} changed:`, { old: oldValue, new: newValue });
        },
      });
    });
  }
}

// Singleton runtime
export const watcherRuntime = new WatcherRuntime();
export default watcherRuntime;
