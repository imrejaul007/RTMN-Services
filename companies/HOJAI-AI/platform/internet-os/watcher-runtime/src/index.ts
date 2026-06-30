/**
 * HOJAI Watcher Runtime
 * Continuous monitoring of web resources for changes
 *
 * Integrates with:
 * - Actor Runtime - For fetching URLs
 * - MemoryOS (4703) - For storing state and changes (via memoryBridge)
 * - Webhook Bus (4110) - For notifications (via alertRouter)
 *
 * REUSES: DO NOT build new storage, use MemoryOS bridge
 */

import { EventEmitter } from 'events';
import { fetchUrl } from '@hojai/actor-runtime';
import { parseHtml } from '@hojai/actor-runtime/utils/parseHtml.js';
import { MemoryBridge, getMemoryBridge } from './bridges/memoryBridge.js';

export interface WatcherConfig {
  id: string;
  name: string;
  url: string;
  type: 'price' | 'review' | 'competitor' | 'job' | 'news' | 'custom';
  interval: number; // in milliseconds
  selector?: string; // CSS selector to watch
  transform?: (data: any) => any;
  onChange?: (newValue: any, oldValue: any) => void;
  storeInMemory?: boolean; // Store state in MemoryOS
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
  private memoryBridge: MemoryBridge;

  constructor(memoryBridge?: MemoryBridge) {
    super();
    this.memoryBridge = memoryBridge || getMemoryBridge();
  }

  /**
   * Set custom memory bridge
   */
  setMemoryBridge(bridge: MemoryBridge): void {
    this.memoryBridge = bridge;
  }

  // Add a watcher
  addWatcher(config: WatcherConfig): void {
    // Set default for storing in MemoryOS
    const finalConfig = { ...config, storeInMemory: config.storeInMemory ?? true };
    this.watchers.set(finalConfig.id, finalConfig);

    this.states.set(finalConfig.id, {
      id: finalConfig.id,
      currentValue: null,
      previousValue: null,
      lastChecked: new Date().toISOString(),
      changes: [],
      status: 'paused',
    });

    this.emit('watcher:added', { id: finalConfig.id, config: finalConfig });
  }

  // Remove a watcher
  async removeWatcher(id: string): Promise<void> {
    this.stopWatcher(id);
    this.watchers.delete(id);
    this.states.delete(id);
    this.emit('watcher:removed', { id });
  }

  // Start watching all watchers
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    for (const [id] of this.watchers) {
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

      // Extract data using Cheerio (works in Node.js)
      let newValue: any;

      if (config.selector) {
        const $ = parseHtml(html);
        const element = $(config.selector).first();

        if (element.length > 0) {
          newValue = {
            text: element.text().trim(),
            html: element.html() || '',
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

        // Emit change events
        this.emit('watcher:change', { id, change });
        this.emit(`change:${id}`, change);

        // Call onChange callback
        if (config.onChange) {
          config.onChange(newValue, state.previousValue);
        }

        // Store in MemoryOS if enabled
        if (config.storeInMemory) {
          await this.storeInMemory(id, change);
        }
      }

      // Update state
      this.states.set(id, state);

      // Clear error state on successful check
      if (state.status === 'error') {
        state.status = 'active';
        state.error = undefined;
      }

    } catch (error) {
      state.status = 'error';
      state.error = error instanceof Error ? error.message : 'Unknown error';

      this.emit('watcher:error', { id, error: state.error });
    }
  }

  /**
   * Store change in MemoryOS via bridge
   */
  private async storeInMemory(id: string, change: ChangeRecord): Promise<void> {
    try {
      await this.memoryBridge.storeChange({
        id: `change-${id}-${Date.now()}`,
        watcherId: id,
        changeType: change.changeType,
        oldValue: change.oldValue,
        newValue: change.newValue,
        detectedAt: change.timestamp,
      });
    } catch (error) {
      console.error(`Failed to store change in MemoryOS:`, error);
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

  // Get changes for a watcher
  getChanges(id: string, limit = 100): ChangeRecord[] {
    const state = this.states.get(id);
    if (!state) return [];
    return state.changes.slice(-limit);
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
        // Extract price from text - supports multiple currencies
        const pricePatterns = [
          /₹([\d,]+\.?\d*)/,    // INR
          /\$([\d,]+\.?\d*)/,    // USD
          /€([\d,]+\.?\d*)/,     // EUR
          /AED\s*([\d,]+\.?\d*)/, // AED
          /([\d,]+\.?\d*)\s*(?:INR|USD|EUR|AED)/i,
          /([\d,]+\.?\d*)/,       // Generic
        ];

        for (const pattern of pricePatterns) {
          const match = data.text?.match(pattern);
          if (match) {
            return {
              price: parseFloat(match[1].replace(/,/g, '')),
              currency: this.detectCurrency(data.text || ''),
              raw: data.text,
            };
          }
        }
        return { price: null, currency: null, raw: data.text };
      },
    });
  }

  private detectCurrency(text: string): string {
    if (text.includes('₹')) return 'INR';
    if (text.includes('$')) return 'USD';
    if (text.includes('€')) return 'EUR';
    if (text.includes('AED')) return 'AED';
    return 'UNKNOWN';
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
        const ratingPatterns = [
          /([\d.]+)\s*(?:stars?|★|out of 5|out of 10)/i,
          /rating[:\s]*([\d.]+)/i,
          /([\d.]+)\s*\/\s*5/i,
          /([\d.]+)\s*\/\s*10/i,
        ];

        const countPatterns = [
          /([\d,]+)\s*(?:reviews?|ratings?|customers?)/i,
          /([\d,]+)\s*(?:total\s+)?ratings?/i,
          /\(([\d,]+)\)/,
        ];

        let rating = null;
        let count = null;

        for (const pattern of ratingPatterns) {
          const match = data.text?.match(pattern);
          if (match) {
            rating = parseFloat(match[1]);
            break;
          }
        }

        for (const pattern of countPatterns) {
          const match = data.text?.match(pattern);
          if (match) {
            count = parseInt(match[1].replace(/,/g, ''));
            break;
          }
        }

        return { rating, count, raw: data.text };
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
