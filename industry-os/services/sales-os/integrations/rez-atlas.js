/**
 * REZ Atlas Integration for Sales OS
 *
 * Connects Sales OS (Port 5055) to REZ Atlas (Port 5190) for enhanced analytics:
 * - Pipeline data synchronization
 * - AI-powered forecasting
 * - Rep performance analytics
 * - Revenue predictions
 *
 * Version: 1.0.0
 */

const axios = require('axios');

// REZ Atlas Service Configuration
const ATLAS_CONFIG = {
  name: 'REZ Atlas',
  port: 5190,
  baseUrl: process.env.ATLAS_URL || 'http://localhost:5190',
  description: 'Sales Analytics & Intelligence Platform',
};

// API Endpoints
const ATLAS_ENDPOINTS = {
  health: '/health',
  syncPipeline: '/api/atlas/sync/pipeline',
  syncRepPerformance: '/api/atlas/sync/rep-performance',
  getForecast: '/api/atlas/forecast',
  getRevenuePrediction: '/api/atlas/revenue/predict',
  getPipelineAnalytics: '/api/atlas/analytics/pipeline',
  getRepLeaderboard: '/api/atlas/analytics/rep-leaderboard',
  getTrendAnalysis: '/api/atlas/analytics/trends',
  syncDealData: '/api/atlas/sync/deals',
  syncLeadData: '/api/atlas/sync/leads',
  getCohortAnalysis: '/api/atlas/analytics/cohorts',
  getConversionMetrics: '/api/atlas/metrics/conversion',
};

// Atlas Event Types
const ATLAS_EVENTS = {
  PIPELINE_SYNCED: 'atlas.pipeline.synced',
  REP_PERFORMANCE_SYNCED: 'atlas.rep.performance.synced',
  FORECAST_GENERATED: 'atlas.forecast.generated',
  REVENUE_PREDICTED: 'atlas.revenue.predicted',
  ANALYTICS_UPDATED: 'atlas.analytics.updated',
};

// Sales OS Data Types for Atlas
const DATA_TYPES = {
  DEAL: 'deal',
  LEAD: 'lead',
  OPPORTUNITY: 'opportunity',
  REP: 'rep',
  ACCOUNT: 'account',
  STAGE: 'stage',
};

// REZ Atlas Integration Class
class REZAtlasIntegration {
  constructor() {
    this.config = ATLAS_CONFIG;
    this.endpoints = ATLAS_ENDPOINTS;
    this.events = ATLAS_EVENTS;
    this.dataTypes = DATA_TYPES;
    this.isConnected = false;
    this.lastSync = null;
  }

  /**
   * Connect to REZ Atlas
   * Establishes connection and verifies health
   */
  async connectToAtlas() {
    try {
      const response = await axios.get(`${this.config.baseUrl}${this.endpoints.health}`, {
        timeout: 5000,
      });

      if (response.data && response.data.status === 'ok') {
        this.isConnected = true;
        return {
          success: true,
          connected: true,
          service: this.config.name,
          port: this.config.port,
          response: response.data,
        };
      }

      return {
        success: false,
        connected: false,
        error: 'Atlas health check returned unexpected response',
      };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        connected: false,
        service: this.config.name,
        port: this.config.port,
        error: error.message,
        hint: `Ensure REZ Atlas is running on port ${this.config.port}`,
      };
    }
  }

  /**
   * Sync pipeline data to Atlas
   * Sends current pipeline state for analytics
   */
  async syncPipelineToAtlas(data) {
    if (!this.isConnected) {
      const connectResult = await this.connectToAtlas();
      if (!connectResult.success) {
        return {
          success: false,
          error: 'Not connected to Atlas. Run connectToAtlas() first.',
        };
      }
    }

    try {
      const pipelineData = {
        deals: data.deals || [],
        stages: data.stages || [],
        accounts: data.accounts || [],
        metadata: {
          source: 'sales-os',
          timestamp: new Date().toISOString(),
          recordCount: (data.deals || []).length,
        },
      };

      const response = await axios.post(
        `${this.config.baseUrl}${this.endpoints.syncPipeline}`,
        pipelineData,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Source-Service': 'sales-os',
          },
        }
      );

      this.lastSync = new Date().toISOString();

      return {
        success: true,
        event: ATLAS_EVENTS.PIPELINE_SYNCED,
        syncedRecords: pipelineData.metadata.recordCount,
        response: response.data,
        timestamp: this.lastSync,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        endpoint: this.endpoints.syncPipeline,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Get AI-powered forecast from Atlas
   * Returns predicted pipeline values
   */
  async getForecastFromAtlas(options = {}) {
    if (!this.isConnected) {
      const connectResult = await this.connectToAtlas();
      if (!connectResult.success) {
        return {
          success: false,
          error: 'Not connected to Atlas. Run connectToAtlas() first.',
        };
      }
    }

    try {
      const forecastOptions = {
        period: options.period || 'quarterly',
        startDate: options.startDate || new Date().toISOString(),
        endDate: options.endDate,
        stages: options.stages || [],
        reps: options.reps || [],
        includeConfidence: options.includeConfidence !== false,
        granularity: options.granularity || 'monthly',
      };

      const response = await axios.post(
        `${this.config.baseUrl}${this.endpoints.getForecast}`,
        forecastOptions,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'X-Source-Service': 'sales-os',
          },
        }
      );

      return {
        success: true,
        forecast: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        endpoint: this.endpoints.getForecast,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Sync rep performance data to Atlas
   * Sends sales rep metrics for analysis
   */
  async syncRepPerformance(data) {
    if (!this.isConnected) {
      const connectResult = await this.connectToAtlas();
      if (!connectResult.success) {
        return {
          success: false,
          error: 'Not connected to Atlas. Run connectToAtlas() first.',
        };
      }
    }

    try {
      const performanceData = {
        reps: data.reps || [],
        metrics: data.metrics || {},
        period: data.period || 'monthly',
        metadata: {
          source: 'sales-os',
          timestamp: new Date().toISOString(),
          repCount: (data.reps || []).length,
        },
      };

      const response = await axios.post(
        `${this.config.baseUrl}${this.endpoints.syncRepPerformance}`,
        performanceData,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Source-Service': 'sales-os',
          },
        }
      );

      return {
        success: true,
        event: ATLAS_EVENTS.REP_PERFORMANCE_SYNCED,
        syncedReps: performanceData.metadata.repCount,
        response: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        endpoint: this.endpoints.syncRepPerformance,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Get revenue prediction from Atlas
   * Returns AI-powered revenue forecasts
   */
  async getRevenuePrediction(options = {}) {
    if (!this.isConnected) {
      const connectResult = await this.connectToAtlas();
      if (!connectResult.success) {
        return {
          success: false,
          error: 'Not connected to Atlas. Run connectToAtlas() first.',
        };
      }
    }

    try {
      const predictionOptions = {
        forecastPeriod: options.forecastPeriod || 'quarterly',
        segments: options.segments || ['all'],
        includeScenarios: options.includeScenarios !== false,
        confidenceLevel: options.confidenceLevel || 0.95,
        historicalPeriods: options.historicalPeriods || 6,
        factors: options.factors || ['seasonality', 'trend', 'reps', 'pipeline'],
      };

      const response = await axios.post(
        `${this.config.baseUrl}${this.endpoints.getRevenuePrediction}`,
        predictionOptions,
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'X-Source-Service': 'sales-os',
          },
        }
      );

      return {
        success: true,
        prediction: response.data,
        event: ATLAS_EVENTS.REVENUE_PREDICTED,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        endpoint: this.endpoints.getRevenuePrediction,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Get pipeline analytics from Atlas
   */
  async getPipelineAnalytics(options = {}) {
    try {
      const params = {
        startDate: options.startDate,
        endDate: options.endDate,
        groupBy: options.groupBy || 'stage',
        includeTrends: options.includeTrends !== false,
      };

      const response = await axios.get(
        `${this.config.baseUrl}${this.endpoints.getPipelineAnalytics}`,
        {
          params,
          timeout: 10000,
        }
      );

      return {
        success: true,
        analytics: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Get rep leaderboard from Atlas
   */
  async getRepLeaderboard(options = {}) {
    try {
      const params = {
        period: options.period || 'monthly',
        metric: options.metric || 'revenue',
        limit: options.limit || 10,
      };

      const response = await axios.get(
        `${this.config.baseUrl}${this.endpoints.getRepLeaderboard}`,
        {
          params,
          timeout: 10000,
        }
      );

      return {
        success: true,
        leaderboard: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Sync deal data to Atlas
   */
  async syncDeals(deals) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}${this.endpoints.syncDealData}`,
        {
          deals,
          source: 'sales-os',
          timestamp: new Date().toISOString(),
        },
        {
          timeout: 15000,
        }
      );

      return {
        success: true,
        syncedDeals: deals.length,
        response: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sync lead data to Atlas
   */
  async syncLeads(leads) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}${this.endpoints.syncLeadData}`,
        {
          leads,
          source: 'sales-os',
          timestamp: new Date().toISOString(),
        },
        {
          timeout: 15000,
        }
      );

      return {
        success: true,
        syncedLeads: leads.length,
        response: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get trend analysis from Atlas
   */
  async getTrendAnalysis(options = {}) {
    try {
      const params = {
        startDate: options.startDate,
        endDate: options.endDate,
        metrics: options.metrics || ['revenue', 'deals', 'conversion'],
        granularity: options.granularity || 'weekly',
      };

      const response = await axios.get(
        `${this.config.baseUrl}${this.endpoints.getTrendAnalysis}`,
        {
          params,
          timeout: 10000,
        }
      );

      return {
        success: true,
        trends: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get conversion metrics
   */
  async getConversionMetrics(options = {}) {
    try {
      const params = {
        startDate: options.startDate,
        endDate: options.endDate,
        funnelStages: options.funnelStages,
      };

      const response = await axios.get(
        `${this.config.baseUrl}${this.endpoints.getConversionMetrics}`,
        {
          params,
          timeout: 10000,
        }
      );

      return {
        success: true,
        conversion: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      service: this.config.name,
      port: this.config.port,
      baseUrl: this.config.baseUrl,
      lastSync: this.lastSync,
      endpoints: Object.keys(this.endpoints),
    };
  }

  /**
   * Bidirectional sync - pull from Atlas and push to Sales OS
   */
  async bidirectionalSync(data) {
    const results = {
      pushed: null,
      pulled: null,
      errors: [],
    };

    // Push pipeline data to Atlas
    const pushResult = await this.syncPipelineToAtlas(data);
    results.pushed = pushResult;

    if (!pushResult.success) {
      results.errors.push({ type: 'push', error: pushResult.error });
    }

    // Pull analytics from Atlas
    const pullResult = await this.getPipelineAnalytics();
    results.pulled = pullResult;

    if (!pullResult.success) {
      results.errors.push({ type: 'pull', error: pullResult.error });
    }

    return {
      success: results.errors.length === 0,
      ...results,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
const rezAtlasIntegration = new REZAtlasIntegration();

// Module exports
module.exports = {
  REZAtlasIntegration,
  rezAtlasIntegration,
  ATLAS_CONFIG,
  ATLAS_ENDPOINTS,
  ATLAS_EVENTS,
  DATA_TYPES,
  // Exported functions as requested
  connectToAtlas: () => rezAtlasIntegration.connectToAtlas(),
  syncPipelineToAtlas: (data) => rezAtlasIntegration.syncPipelineToAtlas(data),
  getForecastFromAtlas: (options) => rezAtlasIntegration.getForecastFromAtlas(options),
  syncRepPerformance: (data) => rezAtlasIntegration.syncRepPerformance(data),
  getRevenuePrediction: (options) => rezAtlasIntegration.getRevenuePrediction(options),
};
