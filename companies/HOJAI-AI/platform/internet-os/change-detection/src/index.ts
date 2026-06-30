/**
 * HOJAI Change Detection Engine
 *
 * REUSES: MemoryOS (4703) + Webhook Bus (4110)
 *
 * Detects changes in web content and triggers alerts.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';
const WEBHOOK_BUS_URL = process.env.WEBHOOK_BUS_URL || 'http://localhost:4110';

export interface ChangeDetectionConfig {
  url: string;
  selector?: string;
  watchType: 'content' | 'price' | 'availability' | 'custom';
  thresholds?: {
    priceChange?: number;
    contentChange?: number;
  };
}

export interface DetectedChange {
  id: string;
  url: string;
  changeType: 'added' | 'removed' | 'modified' | 'price_up' | 'price_down' | 'available' | 'unavailable';
  oldValue?: any;
  newValue?: any;
  changePercent?: number;
  detectedAt: string;
}

export interface Snapshot {
  url: string;
  takenAt: string;
  watchType: string;
  content?: string;
  html?: string;
  price?: number | null;
  available?: boolean;
}

export class ChangeDetectionEngine {
  private token: string;
  private snapshots = new Map<string, Snapshot>();
  private changes: DetectedChange[] = [];

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'change-detection';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'x-internal-token': this.token,
    };
  }

  /**
   * Take a snapshot of current state
   */
  async takeSnapshot(config: ChangeDetectionConfig): Promise<Snapshot> {
    const response = await axios.get(config.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChangeDetection/1.0)',
      },
      timeout: 30000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const snapshot: Snapshot = {
      url: config.url,
      takenAt: new Date().toISOString(),
      watchType: config.watchType,
    };

    if (config.selector) {
      snapshot.content = $(config.selector).text().trim();
      snapshot.html = $(config.selector).html() || '';
    } else {
      snapshot.content = $('body').text().trim().substring(0, 10000);
    }

    if (config.watchType === 'price') {
      snapshot.price = this.extractPrice($);
    } else if (config.watchType === 'availability') {
      snapshot.available = this.checkAvailability($);
    }

    this.snapshots.set(config.url, snapshot);
    return snapshot;
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(
    config: ChangeDetectionConfig,
    oldSnapshot: Snapshot,
    newSnapshot: Snapshot
  ): DetectedChange[] {
    const changes: DetectedChange[] = [];
    const changeId = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (config.watchType === 'content' && config.selector) {
      if (oldSnapshot.content !== newSnapshot.content) {
        const changePercent = this.calculateChangePercent(
          oldSnapshot.content || '',
          newSnapshot.content || ''
        );

        if (config.thresholds?.contentChange &&
            changePercent < config.thresholds.contentChange) {
          return [];
        }

        changes.push({
          id: changeId,
          url: config.url,
          changeType: 'modified',
          oldValue: oldSnapshot.content,
          newValue: newSnapshot.content,
          changePercent,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    if (config.watchType === 'price') {
      const oldPrice = oldSnapshot.price ?? 0;
      const newPrice = newSnapshot.price ?? 0;

      if (oldPrice !== newPrice && oldPrice !== 0 && newPrice !== 0) {
        const changePercent = oldPrice > 0
          ? ((newPrice - oldPrice) / oldPrice) * 100
          : 0;

        if (config.thresholds?.priceChange &&
            Math.abs(changePercent) < config.thresholds.priceChange) {
          return [];
        }

        changes.push({
          id: changeId,
          url: config.url,
          changeType: newPrice > oldPrice ? 'price_up' : 'price_down',
          oldValue: oldPrice,
          newValue: newPrice,
          changePercent,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    if (config.watchType === 'availability') {
      if (oldSnapshot.available !== newSnapshot.available) {
        changes.push({
          id: changeId,
          url: config.url,
          changeType: newSnapshot.available ? 'available' : 'unavailable',
          oldValue: oldSnapshot.available,
          newValue: newSnapshot.available,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    this.changes.push(...changes);
    return changes;
  }

  /**
   * Check URL once and compare to previous snapshot
   */
  async checkForChanges(config: ChangeDetectionConfig): Promise<DetectedChange[]> {
    const oldSnapshot = this.snapshots.get(config.url);
    const newSnapshot = await this.takeSnapshot(config);

    if (!oldSnapshot) {
      return [];
    }

    return this.compareSnapshots(config, oldSnapshot, newSnapshot);
  }

  /**
   * Extract price from page
   */
  private extractPrice($: cheerio.CheerioAPI): number | null {
    const pricePatterns = [
      /₹\s*([\d,]+\.?\d*)/,
      /\$\s*([\d,]+\.?\d*)/,
      /€\s*([\d,]+\.?\d*)/,
      /AED\s*([\d,]+\.?\d*)/,
      /([\d,]+\.?\d*)\s*(?:INR|USD|EUR)/i,
    ];

    const text = $('body').text();

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
    }

    return null;
  }

  /**
   * Check availability status
   */
  private checkAvailability($: cheerio.CheerioAPI): boolean {
    const unavailableSelectors = [
      '.out-of-stock',
      '.sold-out',
      '.unavailable',
      '[data-stock="0"]',
      '.oos',
      '.unavailable-badge',
    ];

    for (const selector of unavailableSelectors) {
      if ($(selector).length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate percentage change
   */
  private calculateChangePercent(oldVal: string, newVal: string): number {
    if (!oldVal || !newVal) return 0;
    const oldLen = oldVal.length;
    const newLen = newVal.length;
    if (oldLen === 0) return 100;
    return Math.abs((newLen - oldLen) / oldLen) * 100;
  }

  /**
   * Store change in MemoryOS
   */
  async storeChange(change: DetectedChange): Promise<void> {
    try {
      await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: 'change-detection',
          content: JSON.stringify(change),
          type: 'change-detection',
          metadata: {
            url: change.url,
            changeType: change.changeType,
            detectedAt: change.detectedAt,
          },
        },
        { headers: this.headers }
      );
    } catch (error) {
      console.error('Failed to store change:', error);
    }
  }

  /**
   * Dispatch webhook for change
   */
  async dispatchWebhook(change: DetectedChange): Promise<void> {
    try {
      await axios.post(
        `${WEBHOOK_BUS_URL}/api/dispatch`,
        {
          eventType: `change.${change.changeType}`,
          payload: change,
        },
        { headers: { 'x-internal-token': this.token } }
      );
    } catch (error) {
      console.error('Failed to dispatch webhook:', error);
    }
  }

  /**
   * Get all detected changes
   */
  getChanges(limit = 100): DetectedChange[] {
    return this.changes.slice(-limit);
  }

  /**
   * Get changes for specific URL
   */
  getChangesForUrl(url: string): DetectedChange[] {
    return this.changes.filter(c => c.url === url);
  }

  /**
   * Clear old changes
   */
  clearChanges(olderThanHours = 24): void {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - olderThanHours);
    this.changes = this.changes.filter(
      c => new Date(c.detectedAt) > cutoff
    );
  }
}

export const changeDetectionEngine = new ChangeDetectionEngine();
export default changeDetectionEngine;