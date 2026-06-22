/**
 * AI Sink - ReZ Mind Integration
 * Sends data for AI/ML processing and predictions
 */

import axios, { AxiosInstance } from 'axios';

export interface AIDataPayload {
  type: 'order' | 'customer' | 'behavior' | 'metric' | 'anomaly';
  merchantId: string;
  customerId?: string;
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface PredictionRequest {
  customerId: string;
  merchantId: string;
  predictionType: 'churn_risk' | 'lifetime_value' | 'next_order' | 'product_recommendation' | 'demand_forecast';
  context: Record<string, any>;
}

export interface PredictionResponse {
  predictionType: string;
  score?: number;
  prediction?: any;
  confidence?: number;
  recommendations?: string[];
  modelVersion: string;
  timestamp: Date;
}

export interface AIConfig {
  endpoint: string;
  apiKey?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  retryAttempts?: number;
  timeoutMs?: number;
}

export class AISink {
  private client: AxiosInstance;
  private eventBuffer: AIDataPayload[] = [];
  private batchSize: number;
  private flushIntervalMs: number;
  private retryAttempts: number;
  private flushTimer?: NodeJS.Timeout;
  private queueMetrics = {
    queued: 0,
    sent: 0,
    failed: 0,
    byPriority: { low: 0, normal: 0, high: 0, critical: 0 }
  };

  constructor(config: AIConfig) {
    this.batchSize = config.batchSize ?? 50;
    this.flushIntervalMs = config.flushIntervalMs ?? 3000;
    this.retryAttempts = config.retryAttempts ?? 3;

    this.client = axios.create({
      baseURL: config.endpoint,
      timeout: config.timeoutMs ?? 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
  }

  /**
   * Queue data for AI processing
   */
  async queue(data: AIDataPayload): Promise<void> {
    this.eventBuffer.push(data);
    this.queueMetrics.queued++;
    this.queueMetrics.byPriority[data.priority]++;

    if (this.eventBuffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Queue order data for AI
   */
  async queueOrderData(
    merchantId: string,
    customerId: string,
    orderData: {
      orderId: string;
      amount: number;
      items: string[];
      source: string;
      timeFeatures?: Record<string, any>;
    },
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<void> {
    await this.queue({
      type: 'order',
      merchantId,
      customerId,
      data: orderData,
      priority,
      metadata: {
        source: 'data_pipeline',
        pipelineVersion: '1.0.0'
      }
    });
  }

  /**
   * Queue customer data for AI
   */
  async queueCustomerData(
    merchantId: string,
    customerId: string,
    customerData: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<void> {
    await this.queue({
      type: 'customer',
      merchantId,
      customerId,
      data: customerData,
      priority
    });
  }

  /**
   * Queue behavior data for AI
   */
  async queueBehaviorData(
    merchantId: string,
    customerId: string,
    sessionId: string,
    behaviorData: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    await this.queue({
      type: 'behavior',
      merchantId,
      customerId,
      data: {
        ...behaviorData,
        sessionId
      },
      priority
    });
  }

  /**
   * Queue metric for AI analysis
   */
  async queueMetric(
    merchantId: string,
    metricData: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<void> {
    await this.queue({
      type: 'metric',
      merchantId,
      data: metricData,
      priority
    });
  }

  /**
   * Report anomaly for AI analysis
   */
  async reportAnomaly(
    merchantId: string,
    anomalyType: string,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    const priorityMap = {
      low: 'low',
      medium: 'normal',
      high: 'high',
      critical: 'critical'
    };

    await this.queue({
      type: 'anomaly',
      merchantId,
      data: {
        anomalyType,
        details,
        severity,
        detectedAt: new Date().toISOString()
      },
      priority: priorityMap[severity]
    });
  }

  /**
   * Request a prediction from AI
   */
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    try {
      const response = await this.client.post<PredictionResponse>('/predictions', request);
      return {
        ...response.data,
        timestamp: new Date(response.data.timestamp as any)
      };
    } catch (error) {
      console.error('AI prediction request failed:', error);
      throw error;
    }
  }

  /**
   * Batch predict for multiple customers
   */
  async batchPredict(requests: PredictionRequest[]): Promise<PredictionResponse[]> {
    try {
      const response = await this.client.post<{ predictions: PredictionResponse[] }>(
        '/predictions/batch',
        { requests }
      );
      return response.data.predictions.map(p => ({
        ...p,
        timestamp: new Date(p.timestamp as any)
      }));
    } catch (error) {
      console.error('AI batch prediction failed:', error);
      throw error;
    }
  }

  /**
   * Get customer churn risk score
   */
  async getChurnRisk(customerId: string, merchantId: string): Promise<PredictionResponse> {
    return this.predict({
      customerId,
      merchantId,
      predictionType: 'churn_risk',
      context: {}
    });
  }

  /**
   * Get customer lifetime value prediction
   */
  async getLifetimeValue(customerId: string, merchantId: string): Promise<PredictionResponse> {
    return this.predict({
      customerId,
      merchantId,
      predictionType: 'lifetime_value',
      context: {}
    });
  }

  /**
   * Get next order prediction
   */
  async getNextOrderPrediction(customerId: string, merchantId: string): Promise<PredictionResponse> {
    return this.predict({
      customerId,
      merchantId,
      predictionType: 'next_order',
      context: {}
    });
  }

  /**
   * Get product recommendations
   */
  async getRecommendations(
    customerId: string,
    merchantId: string,
    context?: { category?: string; excludeItems?: string[] }
  ): Promise<PredictionResponse> {
    return this.predict({
      customerId,
      merchantId,
      predictionType: 'product_recommendation',
      context: context || {}
    });
  }

  /**
   * Get demand forecast
   */
  async getDemandForecast(
    merchantId: string,
    periods: number = 7
  ): Promise<PredictionResponse> {
    // No customerId needed for demand forecast
    return this.predict({
      customerId: 'global',
      merchantId,
      predictionType: 'demand_forecast',
      context: { periods }
    });
  }

  /**
   * Start periodic flush
   */
  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  /**
   * Stop and flush remaining
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }

  /**
   * Flush buffer to AI service
   */
  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const events = [...this.eventBuffer].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    this.eventBuffer = [];

    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        await this.client.post('/data/queue', {
          events,
          timestamp: new Date().toISOString()
        });

        this.queueMetrics.sent += events.length;
        return;
      } catch (error) {
        attempt++;
        if (attempt < this.retryAttempts) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    this.queueMetrics.failed += events.length;
    console.error(`Failed to send ${events.length} events to AI after ${this.retryAttempts} attempts`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue metrics
   */
  getMetrics(): typeof this.queueMetrics & { bufferSize: number } {
    return {
      ...this.queueMetrics,
      bufferSize: this.eventBuffer.length
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    byPriority: Record<string, number>;
  } {
    return {
      pending: this.eventBuffer.length,
      byPriority: { ...this.queueMetrics.byPriority }
    };
  }
}

// Default instance
export const aiSink = new AISink({
  endpoint: process.env.AI_ENDPOINT || 'https://ai.rez.app/api/v1',
  apiKey: process.env.AI_API_KEY
});
