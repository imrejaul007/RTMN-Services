/**
 * Real-time Data Pipeline Orchestrator
 * Main entry point for the unified analytics pipeline
 */

import {
  orderCollector,
  OrderEvent,
  EnrichedOrderEvent
} from './collectors/orderCollector';
import {
  customerCollector,
  CustomerEvent,
  EnrichedCustomerEvent
} from './collectors/customerCollector';
import {
  behaviorCollector,
  BehaviorEvent,
  EnrichedBehaviorEvent
} from './collectors/behaviorCollector';
import {
  enrichmentProcessor,
  EnrichedEvent
} from './processors/enrichmentProcessor';
import { aggregationProcessor } from './processors/aggregationProcessor';
import { redisStorage } from './storage/redisStorage';
import { mongoStorage } from './storage/mongoStorage';
import { analyticsSink } from './sinks/analyticsSink';
import { cdpSink } from './sinks/cdpSink';
import { aiSink } from './sinks/aiSink';
import { pipelineMonitor, PipelineHealth } from './monitoring/pipeline';
import { TOPICS, TopicConfig, SINK_CONFIGS } from './config/topics';

export interface PipelineConfig {
  redis?: {
    host?: string;
    port?: number;
    password?: string;
  };
  mongodb?: {
    uri?: string;
    database?: string;
  };
  sinks?: {
    analytics?: { endpoint?: string; apiKey?: string };
    cdp?: { endpoint?: string; apiKey?: string };
    ai?: { endpoint?: string; apiKey?: string };
  };
  collectors?: {
    bufferSize?: number;
    flushIntervalMs?: number;
  };
  processors?: {
    cacheEnabled?: boolean;
    geoServiceUrl?: string;
  };
}

export class DataPipeline {
  private config: PipelineConfig;
  private running: boolean = false;
  private startedAt?: Date;

  constructor(config: PipelineConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize and connect all components
   */
  async initialize(): Promise<void> {
    console.log('Initializing Data Pipeline...');

    // Connect to Redis
    try {
      if (this.config.redis) {
        redisStorage.connect(this.config.redis as any);
      } else {
        await redisStorage.connect();
      }
      console.log('Redis connected');
    } catch (error) {
      console.warn('Redis connection failed, continuing without Redis:', error);
    }

    // Connect to MongoDB
    try {
      if (this.config.mongodb) {
        mongoStorage.connect(this.config.mongodb as any);
      } else {
        await mongoStorage.connect();
      }
      console.log('MongoDB connected');
    } catch (error) {
      console.warn('MongoDB connection failed, continuing without MongoDB:', error);
    }

    // Set Redis storage for aggregation processor
    aggregationProcessor.setRedisStorage(redisStorage);

    // Setup event handlers
    this.setupEventHandlers();

    // Start all collectors
    orderCollector.start();
    customerCollector.start();
    behaviorCollector.start();

    // Start all sinks
    analyticsSink.start();
    cdpSink.start();
    aiSink.start();

    // Start monitoring
    pipelineMonitor.start();

    console.log('Data Pipeline initialized successfully');
  }

  /**
   * Setup event handlers for collectors
   */
  private setupEventHandlers(): void {
    // Order event handler
    orderCollector.onEvent(async (event: EnrichedOrderEvent) => {
      const startTime = Date.now();
      try {
        // Enrich the event
        const enriched = await enrichmentProcessor.enrichOrderEvent(event);

        // Send to all configured sinks
        await Promise.all([
          analyticsSink.sendOrderEvent(
            event.eventType,
            event.merchantId,
            event.orderId,
            event.customerId,
            enriched as any
          ),
          cdpSink.identifyFromOrder(event.customerId, {
            merchantId: event.merchantId,
            amount: event.amount,
            items: event.items,
            tier: enriched.customerTier
          }),
          cdpSink.trackOrderComplete(event.customerId, event.orderId, {
            merchantId: event.merchantId,
            amount: event.amount,
            items: event.items,
            source: event.source
          }),
          aiSink.queueOrderData(event.merchantId, event.customerId, {
            orderId: event.orderId,
            amount: event.amount,
            items: event.items,
            source: event.source,
            timeFeatures: enriched.timeFeatures as any
          })
        ]);

        // Store in Redis for real-time metrics
        await this.storeRealTimeMetrics(enriched);

        pipelineMonitor.incrementProcessed();
      } catch (error) {
        pipelineMonitor.incrementFailed();
        pipelineMonitor.trackError('order', error as Error);
        console.error('Error processing order event:', error);
      } finally {
        pipelineMonitor.trackLatency('order', Date.now() - startTime);
      }
    });

    // Customer event handler
    customerCollector.onEvent(async (event: EnrichedCustomerEvent) => {
      const startTime = Date.now();
      try {
        // Enrich the event
        const enriched = await enrichmentProcessor.enrichCustomerEvent(event);

        // Send to configured sinks
        await Promise.all([
          analyticsSink.sendCustomerEvent(
            event.eventType,
            event.merchantId || 'global',
            event.customerId,
            enriched as any
          ),
          cdpSink.track(event.eventType, event.customerId, enriched as any),
          aiSink.queueCustomerData(
            event.merchantId || 'global',
            event.customerId,
            enriched as any
          )
        ]);

        // Track specific events
        if (event.eventType === 'cart_abandon') {
          cdpSink.trackCartEvent('abandon', event.customerId, {
            merchantId: event.merchantId,
            items: event.items
          });
        }

        pipelineMonitor.incrementProcessed();
      } catch (error) {
        pipelineMonitor.incrementFailed();
        pipelineMonitor.trackError('customer', error as Error);
        console.error('Error processing customer event:', error);
      } finally {
        pipelineMonitor.trackLatency('customer', Date.now() - startTime);
      }
    });

    // Behavior event handler
    behaviorCollector.onEvent(async (event: EnrichedBehaviorEvent) => {
      const startTime = Date.now();
      try {
        // Enrich the event
        const enriched = await enrichmentProcessor.enrichBehaviorEvent(event);

        // Send to sinks
        await Promise.all([
          analyticsSink.sendBehaviorEvent(
            event.eventType,
            event.customerId,
            event.sessionId,
            enriched as any
          ),
          cdpSink.trackEngagement(
            event.customerId,
            event.eventType as any,
            enriched as any
          ),
          aiSink.queueBehaviorData(
            'global',
            event.customerId,
            event.sessionId,
            enriched as any
          )
        ]);

        pipelineMonitor.incrementProcessed();
      } catch (error) {
        pipelineMonitor.incrementFailed();
        pipelineMonitor.trackError('behavior', error as Error);
        console.error('Error processing behavior event:', error);
      } finally {
        pipelineMonitor.trackLatency('behavior', Date.now() - startTime);
      }
    });
  }

  /**
   * Store real-time metrics in Redis
   */
  private async storeRealTimeMetrics(event: EnrichedOrderEvent): Promise<void> {
    if (!redisStorage.isConnected()) return;

    try {
      const now = new Date();
      const hourKey = `metrics:${event.merchantId}:hourly:${now.toISOString().slice(0, 13)}`;
      const dayKey = `metrics:${event.merchantId}:daily:${now.toISOString().slice(0, 10)}`;

      // Increment counters
      await redisStorage.incrementCounter(`${hourKey}:orders`);
      await redisStorage.incrementCounter(`${hourKey}:revenue`, event.amount);
      await redisStorage.incrementCounter(`${dayKey}:orders`);
      await redisStorage.incrementCounter(`${dayKey}:revenue`, event.amount);

      // Increment by source
      await redisStorage.incrementHashField(`${hourKey}:by_source`, event.source);
      await redisStorage.incrementHashField(`${dayKey}:by_source`, event.source);

      // Track unique customers
      await redisStorage.addToSortedSet(
        `unique_customers:${event.merchantId}:${now.toISOString().slice(0, 10)}`,
        now.getTime(),
        event.customerId,
        { maxSize: 10000 }
      );
    } catch (error) {
      console.error('Error storing real-time metrics:', error);
    }
  }

  /**
   * Start the pipeline
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn('Pipeline is already running');
      return;
    }

    await this.initialize();
    this.running = true;
    this.startedAt = new Date();

    console.log('Data Pipeline started');

    // Setup graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Stop the pipeline gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Data Pipeline...');
    this.running = false;

    // Stop all collectors (flush remaining events)
    await Promise.all([
      orderCollector.stop(),
      customerCollector.stop(),
      behaviorCollector.stop()
    ]);

    // Stop all sinks (flush remaining events)
    await Promise.all([
      analyticsSink.stop(),
      cdpSink.stop(),
      aiSink.stop()
    ]);

    // Stop monitoring
    pipelineMonitor.stop();

    // Disconnect from storage
    await Promise.all([
      redisStorage.disconnect(),
      mongoStorage.disconnect()
    ]);

    console.log('Data Pipeline shut down successfully');
  }

  /**
   * Get pipeline health
   */
  getHealth(): PipelineHealth {
    return pipelineMonitor.getPipelineHealth();
  }

  /**
   * Get pipeline metrics
   */
  getMetrics() {
    return {
      monitor: pipelineMonitor.getMetrics(),
      collectors: {
        order: orderCollector.getMetrics?.() || {},
        customer: customerCollector.getMetrics?.() || {},
        behavior: behaviorCollector.getMetrics?.() || {}
      },
      sinks: {
        analytics: analyticsSink.getMetrics(),
        cdp: cdpSink.getMetrics(),
        ai: aiSink.getMetrics()
      }
    };
  }

  /**
   * Collect order event
   */
  async collectOrder(event: OrderEvent): Promise<void> {
    await orderCollector.collect(event);
  }

  /**
   * Collect customer event
   */
  async collectCustomer(event: CustomerEvent): Promise<void> {
    await customerCollector.collect(event);
  }

  /**
   * Collect behavior event
   */
  async collectBehavior(event: BehaviorEvent): Promise<void> {
    await behaviorCollector.collect(event);
  }

  /**
   * Get revenue metrics for a merchant
   */
  async getRevenueMetrics(
    merchantId: string,
    period: 'hour' | 'day'
  ) {
    return aggregationProcessor.aggregateRevenue(merchantId, period);
  }

  /**
   * Get customer metrics for a merchant
   */
  async getCustomerMetrics(merchantId: string) {
    return aggregationProcessor.aggregateCustomerMetrics(merchantId);
  }

  /**
   * Get dish metrics for a merchant
   */
  async getDishMetrics(merchantId: string) {
    return aggregationProcessor.aggregateDishMetrics(merchantId);
  }

  /**
   * Compare periods for a merchant
   */
  async comparePeriods(
    merchantId: string,
    period: 'hour' | 'day',
    comparisonType: 'day' | 'week' | 'month'
  ) {
    return aggregationProcessor.comparePeriods(merchantId, period, comparisonType);
  }

  /**
   * Request AI prediction
   */
  async getPrediction(
    customerId: string,
    merchantId: string,
    predictionType: 'churn_risk' | 'lifetime_value' | 'next_order' | 'product_recommendation' | 'demand_forecast'
  ) {
    switch (predictionType) {
      case 'churn_risk':
        return aiSink.getChurnRisk(customerId, merchantId);
      case 'lifetime_value':
        return aiSink.getLifetimeValue(customerId, merchantId);
      case 'next_order':
        return aiSink.getNextOrderPrediction(customerId, merchantId);
      case 'product_recommendation':
        return aiSink.getRecommendations(customerId, merchantId);
      case 'demand_forecast':
        return aiSink.getDemandForecast(merchantId);
      default:
        throw new Error(`Unknown prediction type: ${predictionType}`);
    }
  }
}

// Create and export default pipeline instance
const pipeline = new DataPipeline();

// CLI entry point
if (require.main === module) {
  const config: PipelineConfig = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    },
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: process.env.MONGODB_DATABASE || 'rez_analytics'
    },
    sinks: {
      analytics: {
        endpoint: process.env.ANALYTICS_ENDPOINT,
        apiKey: process.env.ANALYTICS_API_KEY
      },
      cdp: {
        endpoint: process.env.CDP_ENDPOINT,
        apiKey: process.env.CDP_API_KEY
      },
      ai: {
        endpoint: process.env.AI_ENDPOINT,
        apiKey: process.env.AI_API_KEY
      }
    }
  };

  const mainPipeline = new DataPipeline(config);

  mainPipeline.start().catch(console.error);

  // Export for testing and other modules
  module.exports = { DataPipeline, pipeline, mainPipeline };
}

export { DataPipeline, pipeline };


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rez-data-pipeline',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe (for Kubernetes)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
app.get('/health/ready', async (req, res) => {
  try {
    // Add readiness checks here (DB connection, etc.)
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
