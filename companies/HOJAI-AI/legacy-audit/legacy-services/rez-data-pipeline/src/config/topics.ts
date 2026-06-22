/**
 * Event Topics Configuration
 * Defines all event topics and their routing configuration
 */

export interface TopicConfig {
  name: string;
  type: 'order' | 'customer' | 'behavior' | 'metric' | 'system';
  sources: string[];
  sinks: string[];
  enrichment: {
    enabled: boolean;
    steps: string[];
  };
  aggregation: {
    enabled: boolean;
    intervals: ('1m' | '5m' | '15m' | '1h' | '1d')[];
  };
  retention: {
    realtime: number; // seconds
    hourly: number; // days
    daily: number; // days
  };
  priority: 'low' | 'normal' | 'high' | 'critical';
  schema?: Record<string, any>;
}

export interface TopicRouting {
  topic: string;
  handlers: string[];
  filters?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
    value: any;
  }>;
  transformations?: Array<{
    type: 'map' | 'filter' | 'aggregate';
    config: Record<string, any>;
  }>;
}

// Topic configurations
export const TOPICS: Record<string, TopicConfig> = {
  // Order topics
  order_created: {
    name: 'order_created',
    type: 'order',
    sources: ['app', 'qr', 'aggregator'],
    sinks: ['analytics', 'cdp', 'ai'],
    enrichment: {
      enabled: true,
      steps: ['customer', 'merchant', 'geo', 'time']
    },
    aggregation: {
      enabled: true,
      intervals: ['1m', '5m', '15m', '1h', '1d']
    },
    retention: {
      realtime: 3600,
      hourly: 90,
      daily: 365
    },
    priority: 'high',
    schema: {
      required: ['orderId', 'merchantId', 'customerId', 'amount', 'timestamp'],
      properties: {
        orderId: { type: 'string' },
        merchantId: { type: 'string' },
        customerId: { type: 'string' },
        amount: { type: 'number', minimum: 0 },
        items: { type: 'array', items: { type: 'string' } },
        source: { type: 'string', enum: ['app', 'qr', 'aggregator'] }
      }
    }
  },

  order_completed: {
    name: 'order_completed',
    type: 'order',
    sources: ['app', 'qr', 'aggregator'],
    sinks: ['analytics', 'cdp', 'ai'],
    enrichment: {
      enabled: true,
      steps: ['customer', 'merchant', 'geo', 'time']
    },
    aggregation: {
      enabled: true,
      intervals: ['1m', '5m', '15m', '1h', '1d']
    },
    retention: {
      realtime: 3600,
      hourly: 90,
      daily: 365
    },
    priority: 'critical',
    schema: {
      required: ['orderId', 'merchantId', 'customerId', 'amount', 'completedAt'],
      properties: {
        orderId: { type: 'string' },
        merchantId: { type: 'string' },
        customerId: { type: 'string' },
        amount: { type: 'number', minimum: 0 },
        completedAt: { type: 'string', format: 'date-time' }
      }
    }
  },

  order_cancelled: {
    name: 'order_cancelled',
    type: 'order',
    sources: ['app', 'qr', 'aggregator'],
    sinks: ['analytics', 'cdp', 'ai'],
    enrichment: {
      enabled: true,
      steps: ['customer', 'merchant', 'time']
    },
    aggregation: {
      enabled: true,
      intervals: ['1h', '1d']
    },
    retention: {
      realtime: 3600,
      hourly: 90,
      daily: 365
    },
    priority: 'high',
    schema: {
      required: ['orderId', 'merchantId', 'customerId', 'cancelledAt', 'reason'],
      properties: {
        orderId: { type: 'string' },
        merchantId: { type: 'string' },
        customerId: { type: 'string' },
        cancelledAt: { type: 'string', format: 'date-time' },
        reason: { type: 'string' }
      }
    }
  },

  // Customer topics
  customer_search: {
    name: 'customer_search',
    type: 'customer',
    sources: ['app', 'web'],
    sinks: ['analytics', 'ai'],
    enrichment: {
      enabled: true,
      steps: ['geo', 'time']
    },
    aggregation: {
      enabled: true,
      intervals: ['5m', '15m', '1h', '1d']
    },
    retention: {
      realtime: 1800,
      hourly: 30,
      daily: 90
    },
    priority: 'normal'
  },

  customer_view: {
    name: 'customer_view',
    type: 'customer',
    sources: ['app', 'web'],
    sinks: ['analytics', 'ai'],
    enrichment: {
      enabled: true,
      steps: ['item', 'merchant', 'geo', 'time']
    },
    aggregation: {
      enabled: true,
      intervals: ['5m', '15m', '1h', '1d']
    },
    retention: {
      realtime: 1800,
      hourly: 30,
      daily: 90
    },
    priority: 'normal'
  },

  cart_add: {
    name: 'cart_add',
    type: 'customer',
    sources: ['app', 'web'],
    sinks: ['analytics', 'cdp', 'ai'],
    enrichment: {
      enabled: true,
      steps: ['customer', 'item', 'merchant', 'time']
    },
    aggregation: {
      enabled: true,
      intervals: ['5m', '1h', '1d']
    },
    retention: {
      realtime: 3600,
      hourly: 60,
      daily: 180
    },
    priority: 'high'
  },

  cart_abandon: {
    name: 'cart_abandon',
    type: 'customer',
    sources: ['app', 'web'],
    sinks: ['analytics', 'cdp', 'ai'],
    enrichment: {
      enabled: true,
      steps: ['customer', 'time']
    },
    aggregation: {
      enabled: true,
      intervals: ['1h', '1d']
    },
    retention: {
      realtime: 3600,
      hourly: 60,
      daily: 180
    },
    priority: 'normal'
  },

  // Behavior topics
  page_view: {
    name: 'page_view',
    type: 'behavior',
    sources: ['app', 'web'],
    sinks: ['analytics'],
    enrichment: {
      enabled: true,
      steps: ['geo', 'time']
    },
    aggregation: {
      enabled: true,
      intervals: ['5m', '1h', '1d']
    },
    retention: {
      realtime: 900,
      hourly: 14,
      daily: 30
    },
    priority: 'low'
  },

  click: {
    name: 'click',
    type: 'behavior',
    sources: ['app', 'web'],
    sinks: ['analytics'],
    enrichment: {
      enabled: true,
      steps: ['geo', 'time']
    },
    aggregation: {
      enabled: true,
      intervals: ['5m', '1h']
    },
    retention: {
      realtime: 900,
      hourly: 14,
      daily: 30
    },
    priority: 'low'
  },

  // System topics
  metric_revenue: {
    name: 'metric_revenue',
    type: 'metric',
    sources: ['pipeline'],
    sinks: ['analytics', 'ai'],
    enrichment: {
      enabled: false,
      steps: []
    },
    aggregation: {
      enabled: false,
      intervals: []
    },
    retention: {
      realtime: 86400,
      hourly: 365,
      daily: 730
    },
    priority: 'critical'
  },

  anomaly_detected: {
    name: 'anomaly_detected',
    type: 'system',
    sources: ['pipeline', 'ai'],
    sinks: ['analytics', 'ai'],
    enrichment: {
      enabled: false,
      steps: []
    },
    aggregation: {
      enabled: false,
      intervals: []
    },
    retention: {
      realtime: 604800,
      hourly: 365,
      daily: 730
    },
    priority: 'critical'
  }
};

// Default routing rules
export const DEFAULT_ROUTING: TopicRouting[] = [
  {
    topic: 'order_*',
    handlers: ['enrichment', 'aggregation'],
    transformations: [
      {
        type: 'map',
        config: {
          fields: ['orderId', 'merchantId', 'customerId', 'amount', 'source']
        }
      }
    ]
  },
  {
    topic: 'customer_*',
    handlers: ['enrichment'],
    transformations: [
      {
        type: 'filter',
        config: {
          excludeFields: ['sensitiveData']
        }
      }
    ]
  },
  {
    topic: 'cart_*',
    handlers: ['enrichment', 'aggregation'],
    filters: [
      {
        field: 'customerId',
        operator: 'exists',
        value: true
      }
    ]
  },
  {
    topic: 'anomaly_*',
    handlers: ['analytics', 'ai'],
    filters: [
      {
        field: 'severity',
        operator: 'in',
        value: ['high', 'critical']
      }
    ]
  }
];

// Sink configurations
export const SINK_CONFIGS = {
  analytics: {
    name: 'Analytics Service',
    endpoint: process.env.ANALYTICS_ENDPOINT || 'https://analytics.rez.app/api/v1',
    batchSize: 100,
    flushIntervalMs: 5000,
    topics: ['order_*', 'customer_*', 'metric_*', 'page_view']
  },
  cdp: {
    name: 'Customer Data Platform',
    endpoint: process.env.CDP_ENDPOINT || 'https://cdp.rez.app/api/v1',
    batchSize: 50,
    flushIntervalMs: 10000,
    topics: ['order_completed', 'cart_*', 'customer_*']
  },
  ai: {
    name: 'ReZ Mind AI',
    endpoint: process.env.AI_ENDPOINT || 'https://ai.rez.app/api/v1',
    batchSize: 50,
    flushIntervalMs: 3000,
    topics: ['order_*', 'cart_abandon', 'anomaly_*']
  }
};

// Helper functions
export function getTopicConfig(topicName: string): TopicConfig | undefined {
  return TOPICS[topicName];
}

export function getTopicsByType(type: TopicConfig['type']): TopicConfig[] {
  return Object.values(TOPICS).filter(t => t.type === type);
}

export function getTopicsBySink(sink: string): TopicConfig[] {
  return Object.values(TOPICS).filter(t => t.sinks.includes(sink));
}

export function getTopicsByPriority(priority: TopicConfig['priority']): TopicConfig[] {
  return Object.values(TOPICS).filter(t => t.priority === priority);
}

export function getAllTopicNames(): string[] {
  return Object.keys(TOPICS);
}
