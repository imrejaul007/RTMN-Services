/**
 * Operations OS - MemoryOS Integration
 * Persists learnings, patterns, and insights to MemoryOS (port 4703)
 */

const fetch = require('node-fetch');

class MemoryOSIntegration {
  constructor() {
    this.memoryUrl = process.env.MEMORYOS_URL || 'http://localhost:4703';
    this.apiKey = process.env.MEMORYOS_API_KEY || 'rtmn-internal';
    this.enabled = process.env.MEMORYOS_ENABLED !== 'false';
    this.entityNamespace = 'operations';
    this.batchSize = parseInt(process.env.MEMORYOS_BATCH_SIZE || '50');
  }

  /**
   * Store a learning from process learning engine
   */
  async storeLearning(processId, learning) {
    if (!this.enabled) return null;

    try {
      const memory = {
        entityId: processId,
        entityType: 'process',
        namespace: this.entityNamespace,
        type: 'process_learning',
        data: {
          pattern: learning.pattern,
          steps: learning.steps,
          avgDuration: learning.avgDuration,
          successRate: learning.successRate,
          confidence: learning.confidence,
        },
        metadata: {
          source: 'operations-os',
          learnedAt: learning.learnedAt || new Date().toISOString(),
        },
      };

      const response = await this.post('/api/memories', memory);
      return response;

    } catch (err) {
      console.error('Failed to store learning:', err.message);
      return null;
    }
  }

  /**
   * Store observation from process learning
   */
  async storeObservation(observation) {
    if (!this.enabled) return null;

    try {
      const memory = {
        entityId: observation.id,
        entityType: 'observation',
        namespace: this.entityNamespace,
        type: 'process_observation',
        data: {
          processId: observation.entityId,
          step: observation.step,
          action: observation.action,
          duration: observation.duration,
          outcome: observation.outcome,
        },
        metadata: {
          source: 'operations-os',
          observedAt: observation.timestamp,
        },
      };

      return await this.post('/api/memories', memory);

    } catch (err) {
      console.error('Failed to store observation:', err.message);
      return null;
    }
  }

  /**
   * Store automation configuration
   */
  async storeAutomation(automation) {
    if (!this.enabled) return null;

    try {
      const memory = {
        entityId: automation.id,
        entityType: 'automation',
        namespace: this.entityNamespace,
        type: 'automation_config',
        data: {
          processId: automation.sourceProcess,
          trigger: automation.config?.trigger,
          actions: automation.config?.actions?.length,
          status: automation.status,
        },
        metadata: {
          source: 'operations-os',
          createdAt: automation.createdAt,
        },
      };

      return await this.post('/api/memories', memory);

    } catch (err) {
      console.error('Failed to store automation:', err.message);
      return null;
    }
  }

  /**
   * Store KPI data for trend analysis
   */
  async storeKPIData(kpiId, value, context = {}) {
    if (!this.enabled) return null;

    try {
      const memory = {
        entityId: `${kpiId}-${Date.now()}`,
        entityType: 'kpi',
        namespace: this.entityNamespace,
        type: 'kpi_snapshot',
        data: {
          kpiId,
          value,
          ...context,
        },
        metadata: {
          source: 'operations-os',
          timestamp: new Date().toISOString(),
        },
      };

      return await this.post('/api/memories', memory);

    } catch (err) {
      console.error('Failed to store KPI data:', err.message);
      return null;
    }
  }

  /**
   * Store process improvement suggestion
   */
  async storeImprovementSuggestion(processId, suggestion) {
    if (!this.enabled) return null;

    try {
      const memory = {
        entityId: `improvement-${processId}-${Date.now()}`,
        entityType: 'improvement',
        namespace: this.entityNamespace,
        type: 'process_improvement',
        data: {
          processId,
          type: suggestion.type,
          step: suggestion.step,
          message: suggestion.message,
        },
        metadata: {
          source: 'operations-os',
          timestamp: new Date().toISOString(),
        },
      };

      return await this.post('/api/memories', memory);

    } catch (err) {
      console.error('Failed to store improvement:', err.message);
      return null;
    }
  }

  /**
   * Store twin state for historical tracking
   */
  async storeTwinState(twin) {
    if (!this.enabled) return null;

    try {
      const memory = {
        entityId: twin.id,
        entityType: 'twin',
        namespace: this.entityNamespace,
        type: 'twin_state',
        data: {
          type: twin.type,
          health: twin.health?.score,
          stats: twin.data,
        },
        metadata: {
          source: 'operations-os',
          timestamp: new Date().toISOString(),
        },
      };

      return await this.post('/api/memories', memory);

    } catch (err) {
      console.error('Failed to store twin state:', err.message);
      return null;
    }
  }

  /**
   * Retrieve learnings for a process
   */
  async getLearnings(processId) {
    if (!this.enabled) return [];

    try {
      const response = await this.get('/api/memories', {
        entityType: 'process',
        namespace: this.entityNamespace,
      });

      return response.filter(m => m.data?.processId === processId);

    } catch (err) {
      console.error('Failed to get learnings:', err.message);
      return [];
    }
  }

  /**
   * Retrieve KPI history
   */
  async getKPIHistory(kpiId, days = 30) {
    if (!this.enabled) return [];

    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const response = await this.get('/api/memories', {
        entityType: 'kpi',
        namespace: this.entityNamespace,
        since: since.toISOString(),
      });

      return response.filter(m => m.data?.kpiId === kpiId);

    } catch (err) {
      console.error('Failed to get KPI history:', err.message);
      return [];
    }
  }

  /**
   * Batch store observations
   */
  async batchStoreObservations(observations) {
    if (!this.enabled || observations.length === 0) return [];

    const results = [];
    for (let i = 0; i < observations.length; i += this.batchSize) {
      const batch = observations.slice(i, i + this.batchSize);
      const batchPromises = batch.map(obs => this.storeObservation(obs));
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Search memories
   */
  async search(query) {
    if (!this.enabled) return [];

    try {
      return await this.get('/api/memories/search', { q: query, namespace: this.entityNamespace });

    } catch (err) {
      console.error('Failed to search memories:', err.message);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.memoryUrl}/health`, {
        timeout: 5000,
      });

      if (response.ok) {
        return { connected: true, url: this.memoryUrl };
      }

      return { connected: false, error: `HTTP ${response.status}` };

    } catch (err) {
      return { connected: false, error: err.message };
    }
  }

  // HTTP helpers
  async post(path, body) {
    const response = await fetch(`${this.memoryUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`MemoryOS returned ${response.status}`);
    }

    return await response.json();
  }

  async get(path, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${this.memoryUrl}${path}${query ? '?' + query : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`MemoryOS returned ${response.status}`);
    }

    return await response.json();
  }
}

// Singleton instance
const memoryOS = new MemoryOSIntegration();

module.exports = { MemoryOSIntegration, memoryOS };
