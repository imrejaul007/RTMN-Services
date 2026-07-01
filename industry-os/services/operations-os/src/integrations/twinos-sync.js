/**
 * Operations OS - TwinOS Sync Integration
 * Syncs Operations twins to central TwinOS (port 4705)
 */

// Use native fetch (Node 18+) or polyfill
const fetch = globalThis.fetch || require('node-fetch');

class TwinOSSync {
  constructor() {
    this.twinosUrl = process.env.TWINOS_URL || 'http://localhost:4705';
    this.apiKey = process.env.TWINOS_API_KEY || 'rtmn-internal';
    this.syncEnabled = process.env.TWINOS_SYNC !== 'false';
    this.syncInterval = parseInt(process.env.TWINOS_SYNC_INTERVAL || '60000'); // 1 minute default
    this.syncTimer = null;
    this.pendingSyncs = new Map();
  }

  /**
   * Start automatic sync
   */
  startAutoSync(getTwinsFn) {
    if (!this.syncEnabled) {
      console.log('📡 TwinOS sync disabled');
      return;
    }

    console.log(`📡 TwinOS sync enabled (interval: ${this.syncInterval}ms)`);

    // Initial sync
    this.syncAll(getTwinsFn);

    // Periodic sync
    this.syncTimer = setInterval(() => {
      this.syncAll(getTwinsFn);
    }, this.syncInterval);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('📡 TwinOS sync stopped');
    }
  }

  /**
   * Sync all twins to TwinOS
   */
  async syncAll(getTwinsFn) {
    const twins = getTwinsFn();

    for (const twin of twins) {
      await this.syncTwin(twin);
    }

    console.log(`📡 Synced ${twins.length} twins to TwinOS`);
  }

  /**
   * Sync a single twin to TwinOS
   */
  async syncTwin(twin) {
    if (!this.syncEnabled) return;

    try {
      const twinType = `operations.${twin.type}`;
      const twinData = {
        twinType,
        name: twin.name,
        entityId: twin.id,
        data: twin.data || twin,
        health: twin.health,
        metadata: {
          source: 'operations-os',
          syncedAt: new Date().toISOString(),
        },
      };

      const response = await fetch(`${this.twinosUrl}/api/twins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(twinData),
      });

      if (!response.ok) {
        throw new Error(`TwinOS returned ${response.status}`);
      }

      this.pendingSyncs.set(twin.id, { success: true, timestamp: Date.now() });
      return twinData;

    } catch (err) {
      console.error(`❌ TwinOS sync failed for ${twin.id}:`, err.message);
      this.pendingSyncs.set(twin.id, { success: false, error: err.message, timestamp: Date.now() });
      return null;
    }
  }

  /**
   * Get twin from TwinOS
   */
  async getTwin(twinType, entityId) {
    try {
      const response = await fetch(
        `${this.twinosUrl}/api/twins/${twinType}/${entityId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();

    } catch (err) {
      console.error('Failed to get twin from TwinOS:', err.message);
      return null;
    }
  }

  /**
   * Update twin state in TwinOS
   */
  async updateTwinState(twinType, entityId, updates) {
    try {
      const response = await fetch(
        `${this.twinosUrl}/api/twins/${twinType}/${entityId}/state`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error(`TwinOS returned ${response.status}`);
      }

      return await response.json();

    } catch (err) {
      console.error('Failed to update twin state:', err.message);
      return null;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    const syncs = Array.from(this.pendingSyncs.entries()).map(([id, status]) => ({
      twinId: id,
      ...status,
    }));

    return {
      enabled: this.syncEnabled,
      interval: this.syncInterval,
      pendingSyncs: syncs.length,
      recentSyncs: syncs.slice(-10),
    };
  }

  /**
   * Health check - verify TwinOS connectivity
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.twinosUrl}/health`, {
        timeout: 5000,
      });

      if (response.ok) {
        return { connected: true, url: this.twinosUrl };
      }

      return { connected: false, error: `HTTP ${response.status}` };

    } catch (err) {
      return { connected: false, error: err.message };
    }
  }
}

// Singleton instance
const twinSync = new TwinOSSync();

module.exports = { TwinOSSync, twinSync };
