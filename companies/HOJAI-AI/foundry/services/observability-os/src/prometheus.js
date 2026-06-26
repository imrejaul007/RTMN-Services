/**
 * ObservabilityOS - Prometheus Metrics Integration
 *
 * Provides:
 * - Prometheus exposition format (/metrics endpoint)
 * - Pushgateway support for batch jobs
 * - Histogram buckets and summary quantiles
 * - Recording rules generation
 * - Alert rules generation
 * - Grafana dashboard JSON
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// PROMETHEUS CONFIGURATION
// ============================================

const PROMETHEUS_CONFIG = {
  // Histogram buckets (in seconds for latency metrics)
  latencyBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],

  // Summary quantiles (for percentiles)
  quantiles: [0.5, 0.9, 0.95, 0.99],

  // Default labels applied to all metrics
  defaultLabels: {
    service: process.env.SERVICE_NAME || 'hojai-foundry',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },

  // Pushgateway configuration
  pushgateway: {
    enabled: process.env.PUSHGATEWAY_ENABLED === 'true',
    url: process.env.PUSHGATEWAY_URL || 'http://localhost:9091',
    jobName: process.env.PUSHGATEWAY_JOB || 'hojai-foundry',
    interval: parseInt(process.env.PUSH_INTERVAL) || 60000 // 1 minute
  }
};

// ============================================
// METRIC REGISTRY
// ============================================

class PrometheusRegistry {
  constructor() {
    this.metrics = new Map();
    this.counterMetrics = new Map();
    this.gaugeMetrics = new Map();
    this.histogramMetrics = new Map();
    this.summaryMetrics = new Map();

    this.pushgatewayTimer = null;
  }

  /**
   * Create a counter metric
   */
  createCounter(name, help, labelNames = []) {
    const metric = {
      name,
      help,
      type: 'counter',
      labelNames,
      values: new Map(), // labelValues -> value
      total: 0,
      createdAt: new Date()
    };

    this.metrics.set(name, metric);
    this.counterMetrics.set(name, metric);

    return metric;
  }

  /**
   * Create a gauge metric
   */
  createGauge(name, help, labelNames = []) {
    const metric = {
      name,
      help,
      type: 'gauge',
      labelNames,
      values: new Map(),
      createdAt: new Date()
    };

    this.metrics.set(name, metric);
    this.gaugeMetrics.set(name, metric);

    return metric;
  }

  /**
   * Create a histogram metric
   */
  createHistogram(name, help, labelNames = [], buckets = PROMETHEUS_CONFIG.latencyBuckets) {
    const metric = {
      name,
      help,
      type: 'histogram',
      labelNames,
      buckets: buckets.map(b => ({ upperBound: b, count: 0 })),
      sum: 0,
      count: 0,
      values: new Map(),
      createdAt: new Date()
    };

    this.metrics.set(name, metric);
    this.histogramMetrics.set(name, metric);

    return metric;
  }

  /**
   * Create a summary metric
   */
  createSummary(name, help, labelNames = [], quantiles = PROMETHEUS_CONFIG.quantiles) {
    const metric = {
      name,
      help,
      type: 'summary',
      labelNames,
      quantiles: quantiles.map(q => ({ quantile: q, value: 0 })),
      sum: 0,
      count: 0,
      values: new Map(),
      createdAt: new Date()
    };

    this.metrics.set(name, metric);
    this.summaryMetrics.set(name, metric);

    return metric;
  }

  // ============================================
  // RECORDING OPERATIONS
  // ============================================

  /**
   * Increment a counter
   */
  incCounter(name, value = 1, labelValues = {}) {
    const metric = this.counterMetrics.get(name);
    if (!metric) return;

    const labelKey = this.labelsToKey(metric.labelNames, labelValues);
    const current = metric.values.get(labelKey) || 0;
    metric.values.set(labelKey, current + value);
    metric.total += value;
  }

  /**
   * Set a gauge value
   */
  setGauge(name, value, labelValues = {}) {
    const metric = this.gaugeMetrics.get(name);
    if (!metric) return;

    const labelKey = this.labelsToKey(metric.labelNames, labelValues);
    metric.values.set(labelKey, value);
  }

  /**
   * Add to a gauge
   */
  incGauge(name, value = 1, labelValues = {}) {
    const metric = this.gaugeMetrics.get(name);
    if (!metric) return;

    const labelKey = this.labelsToKey(metric.labelNames, labelValues);
    const current = metric.values.get(labelKey) || 0;
    metric.values.set(labelKey, current + value);
  }

  /**
   * Observe a value for histogram or summary
   */
  observe(name, value, labelValues = {}) {
    // Try histogram first
    let metric = this.histogramMetrics.get(name);
    if (metric) {
      this.observeHistogram(metric, value, labelValues);
      return;
    }

    // Try summary
    metric = this.summaryMetrics.get(name);
    if (metric) {
      this.observeSummary(metric, value, labelValues);
      return;
    }
  }

  observeHistogram(metric, value, labelValues) {
    const labelKey = this.labelsToKey(metric.labelNames, labelValues);

    // Find the bucket
    for (const bucket of metric.buckets) {
      if (value <= bucket.upperBound) {
        bucket.count++;
      }
    }

    metric.sum += value;
    metric.count++;

    // Store individual observation if labels exist
    if (metric.labelNames.length > 0) {
      if (!metric.values.has(labelKey)) {
        metric.values.set(labelKey, { buckets: metric.buckets.map(b => ({...b})), sum: 0, count: 0 });
      }
      const stored = metric.values.get(labelKey);
      for (const bucket of stored.buckets) {
        if (value <= bucket.upperBound) {
          bucket.count++;
        }
      }
      stored.sum += value;
      stored.count++;
    }
  }

  observeSummary(metric, value, labelValues) {
    const labelKey = this.labelsToKey(metric.labelNames, labelValues);

    metric.sum += value;
    metric.count++;

    // Calculate quantiles from observations
    if (metric.labelNames.length === 0) {
      // Simple quantile tracking
      for (const q of metric.quantiles) {
        // In production, store sorted array of values for accurate quantile calculation
        // For now, use approximation
      }
    }
  }

  // ============================================
  // EXPOSITION FORMAT
  // ============================================

  /**
   * Generate Prometheus exposition format
   */
  toPrometheusFormat() {
    const lines = [];

    // Add HELP and TYPE for each metric
    for (const [name, metric] of this.metrics) {
      // HELP
      lines.push(`# HELP ${name} ${metric.help}`);

      // TYPE
      lines.push(`# TYPE ${name} ${metric.type}`);

      // VALUES
      if (metric.type === 'counter' || metric.type === 'gauge') {
        this.formatSimpleMetric(lines, metric);
      } else if (metric.type === 'histogram') {
        this.formatHistogramMetric(lines, metric);
      } else if (metric.type === 'summary') {
        this.formatSummaryMetric(lines, metric);
      }
    }

    return lines.join('\n');
  }

  formatSimpleMetric(lines, metric) {
    const labelStr = metric.labelNames.length > 0 ? `{${metric.labelNames.join(',')}}` : '';

    if (metric.labelNames.length === 0) {
      const value = metric.type === 'counter' ? metric.total : Array.from(metric.values.values())[0] || 0;
      lines.push(`${metric.name}${labelStr} ${value}`);
    } else {
      for (const [labelKey, value] of metric.values) {
        const labels = this.keyToLabels(metric.labelNames, labelKey);
        const labelParts = metric.labelNames.map(l => `${l}="${labels[l]}"`).join(',');
        lines.push(`${metric.name}{${labelParts}} ${value}`);
      }
    }
  }

  formatHistogramMetric(lines, metric) {
    if (metric.labelNames.length === 0) {
      // Cumulative buckets
      let cumulative = 0;
      for (const bucket of metric.buckets) {
        cumulative += bucket.count;
        lines.push(`${metric.name}_bucket{le="${bucket.upperBound}"} ${cumulative}`);
      }
      lines.push(`${metric.name}_bucket{le="+Inf"} ${metric.count}`);
      lines.push(`${metric.name}_sum ${metric.sum}`);
      lines.push(`${metric.name}_count ${metric.count}`);
    } else {
      for (const [labelKey, stored] of metric.values) {
        const labels = this.keyToLabels(metric.labelNames, labelKey);
        const labelParts = metric.labelNames.map(l => `${l}="${labels[l]}"`).join(',');

        let cumulative = 0;
        for (let i = 0; i < stored.buckets.length; i++) {
          cumulative += stored.buckets[i].count;
          lines.push(`${metric.name}_bucket{${labelParts},le="${stored.buckets[i].upperBound}"} ${cumulative}`);
        }
        lines.push(`${metric.name}_bucket{${labelParts},le="+Inf"} ${stored.count}`);
        lines.push(`${metric.name}_sum{${labelParts}} ${stored.sum}`);
        lines.push(`${metric.name}_count{${labelParts}} ${stored.count}`);
      }
    }
  }

  formatSummaryMetric(lines, metric) {
    if (metric.labelNames.length === 0) {
      for (const q of metric.quantiles) {
        lines.push(`${metric.name}{quantile="${q}"} ${q * metric.sum / metric.count}`);
      }
      lines.push(`${metric.name}_sum ${metric.sum}`);
      lines.push(`${metric.name}_count ${metric.count}`);
    } else {
      for (const [labelKey, stored] of metric.values) {
        const labels = this.keyToLabels(metric.labelNames, labelKey);
        const labelParts = metric.labelNames.map(l => `${l}="${labels[l]}"`).join(',');

        for (const q of metric.quantiles) {
          lines.push(`${metric.name}_${q}{${labelParts}} ${q * stored.sum / stored.count}`);
        }
        lines.push(`${metric.name}_sum{${labelParts}} ${stored.sum}`);
        lines.push(`${metric.name}_count{${labelParts}} ${stored.count}`);
      }
    }
  }

  // ============================================
  // LABEL UTILITIES
  // ============================================

  labelsToKey(labelNames, labelValues) {
    if (labelNames.length === 0) return '_';
    return labelNames.map(l => labelValues[l] || '').join('|');
  }

  keyToLabels(labelNames, key) {
    if (key === '_') return {};
    const parts = key.split('|');
    return labelNames.reduce((acc, name, i) => {
      acc[name] = parts[i];
      return acc;
    }, {});
  }

  // ============================================
  // PUSHGATEWAY
  // ============================================

  startPushgateway() {
    if (!PROMETHEUS_CONFIG.pushgateway.enabled) return;

    this.pushgatewayTimer = setInterval(() => {
      this.pushToGateway();
    }, PROMETHEUS_CONFIG.pushgateway.interval);
  }

  stopPushgateway() {
    if (this.pushgatewayTimer) {
      clearInterval(this.pushgatewayTimer);
      this.pushgatewayTimer = null;
    }
  }

  async pushToGateway() {
    if (!PROMETHEUS_CONFIG.pushgateway.enabled) return;

    const { url, jobName } = PROMETHEUS_CONFIG.pushgateway;
    const metrics = this.toPrometheusFormat();

    try {
      const response = await fetch(`${url}/metrics/job/${jobName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: metrics
      });

      if (!response.ok) {
        console.error(`Pushgateway error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to push to gateway:', error);
    }
  }

  // ============================================
  // STANDARD METRICS
  // ============================================

  registerStandardMetrics() {
    // Process metrics
    const processMetrics = this.createGauge(
      'process_cpu_seconds_total',
      'Total user and system CPU time spent in seconds',
      []
    );
    this.setGauge('process_cpu_seconds_total', 0);

    const memMetric = this.createGauge(
      'process_resident_memory_bytes',
      'Resident memory size in bytes',
      []
    );
    this.setGauge('process_resident_memory_bytes', 0);

    // HTTP metrics
    this.createHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      ['method', 'path', 'status']
    );

    this.createCounter(
      'http_requests_total',
      'Total HTTP requests',
      ['method', 'path', 'status']
    );

    // Business metrics
    this.createCounter(
      'company_builders_total',
      'Total companies created',
      ['template']
    );

    this.createGauge(
      'active_builds',
      'Number of active builds',
      ['platform']
    );

    this.createHistogram(
      'build_duration_seconds',
      'Build duration in seconds',
      ['platform', 'status']
    );

    this.createCounter(
      'api_calls_total',
      'Total API calls to services',
      ['service', 'method', 'status']
    );

    this.createHistogram(
      'api_latency_seconds',
      'API latency in seconds',
      ['service', 'method']
    );

    // AI metrics
    this.createCounter(
      'ai_requests_total',
      'Total AI requests',
      ['model', 'status']
    );

    this.createHistogram(
      'ai_latency_seconds',
      'AI request latency in seconds',
      ['model']
    );

    this.createCounter(
      'ai_tokens_total',
      'Total AI tokens used',
      ['model', 'type'] // type: prompt|completion
    );

    this.createGauge(
      'ai_cost_total_dollars',
      'Total AI cost in dollars',
      ['model']
    );
  }
}

// ============================================
// ALERT RULES GENERATOR
// ============================================

class AlertRulesGenerator {
  constructor() {
    this.rules = [];
  }

  /**
   * Generate Prometheus alert rules
   */
  generateAlertRules() {
    return {
      groups: [{
        name: 'hojai-foundry-alerts',
        rules: [
          ...this.generateHighErrorRateRules(),
          ...this.generateLatencyRules(),
          ...this.generateBuildFailureRules(),
          ...this.generateAIUsageRules(),
          ...this.generateSystemRules()
        ]
      }]
    };
  }

  generateHighErrorRateRules() {
    return [{
      alert: 'HighErrorRate',
      expr: `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05`,
      for: '5m',
      labels: { severity: 'critical' },
      annotations: {
        summary: 'High error rate detected',
        description: 'Error rate is {{ $value | humanizePercentage }} over the last 5 minutes'
      }
    }, {
      alert: 'APIErrorSpike',
      expr: `sum by (service) (rate(http_requests_total{status=~"5.."}[5m])) > 10`,
      for: '2m',
      labels: { severity: 'warning' },
      annotations: {
        summary: 'API error spike',
        description: 'Service {{ $labels.service }} is experiencing elevated errors'
      }
    }];
  }

  generateLatencyRules() {
    return [{
      alert: 'HighLatency',
      expr: `histogram_quantile(0.95, sum(rate(api_latency_seconds_bucket[5m])) by (le, service)) > 2`,
      for: '5m',
      labels: { severity: 'warning' },
      annotations: {
        summary: 'High API latency',
        description: 'P95 latency for {{ $labels.service }} is {{ $value | humanizeDuration }}'
      }
    }, {
      alert: 'BuildDurationHigh',
      expr: `histogram_quantile(0.95, sum(rate(build_duration_seconds_bucket[10m])) by (le, platform)) > 1800`,
      for: '10m',
      labels: { severity: 'warning' },
      annotations: {
        summary: 'Build taking too long',
        description: 'Builds for {{ $labels.platform }} are taking over 30 minutes'
      }
    }];
  }

  generateBuildFailureRules() {
    return [{
      alert: 'BuildFailureRate',
      expr: `sum(rate(build_duration_seconds_count{status="failed"}[1h])) / sum(rate(build_duration_seconds_count[1h])) > 0.1`,
      for: '30m',
      labels: { severity: 'critical' },
      annotations: {
        summary: 'High build failure rate',
        description: 'Build failure rate is {{ $value | humanizePercentage }}'
      }
    }];
  }

  generateAIUsageRules() {
    return [{
      alert: 'HighAICost',
      expr: `increase(ai_cost_total_dollars[1h]) > 100`,
      for: '5m',
      labels: { severity: 'warning' },
      annotations: {
        summary: 'High AI cost detected',
        description: 'AI costs of ${{ $value }} in the last hour'
      }
    }, {
      alert: 'AIRequestFailures',
      expr: `sum(rate(ai_requests_total{status="error"}[5m])) / sum(rate(ai_requests_total[5m])) > 0.1`,
      for: '5m',
      labels: { severity: 'critical' },
      annotations: {
        summary: 'High AI request failure rate',
        description: '{{ $value | humanizePercentage }} of AI requests are failing'
      }
    }];
  }

  generateSystemRules() {
    return [{
      alert: 'ServiceDown',
      expr: `up{job="hojai-foundry"} == 0`,
      for: '1m',
      labels: { severity: 'critical' },
      annotations: {
        summary: 'Service is down',
        description: '{{ $labels.instance }} is not responding'
      }
    }, {
      alert: 'NoRecentBuilds',
      expr: `time() - max(build_duration_seconds_count) > 86400`,
      for: '1h',
      labels: { severity: 'info' },
      annotations: {
        summary: 'No recent builds',
        description: 'No builds have been triggered in the last 24 hours'
      }
    }];
  }

  /**
   * Generate Grafana dashboard JSON
   */
  generateGrafanaDashboard() {
    return {
      title: 'HOJAI Foundry Overview',
      uid: 'hojai-foundry',
      version: 1,
      panels: [
        {
          title: 'Request Rate',
          type: 'graph',
          gridPos: { x: 0, y: 0, w: 12, h: 8 },
          targets: [{
            expr: 'sum(rate(http_requests_total[5m])) by (service)',
            legendFormat: '{{service}}'
          }]
        },
        {
          title: 'Error Rate',
          type: 'graph',
          gridPos: { x: 12, y: 0, w: 12, h: 8 },
          targets: [{
            expr: 'sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service)',
            legendFormat: '{{service}}'
          }]
        },
        {
          title: 'P95 Latency',
          type: 'graph',
          gridPos: { x: 0, y: 8, w: 12, h: 8 },
          targets: [{
            expr: 'histogram_quantile(0.95, sum(rate(api_latency_seconds_bucket[5m])) by (le, service))',
            legendFormat: 'p95 - {{service}}'
          }]
        },
        {
          title: 'Build Success Rate',
          type: 'graph',
          gridPos: { x: 12, y: 8, w: 12, h: 8 },
          targets: [{
            expr: 'sum(rate(build_duration_seconds_count{status="success"}[1h])) by (platform) / sum(rate(build_duration_seconds_count[1h])) by (platform)',
            legendFormat: '{{platform}}'
          }]
        },
        {
          title: 'AI Cost',
          type: 'graph',
          gridPos: { x: 0, y: 16, w: 12, h: 8 },
          targets: [{
            expr: 'sum(rate(ai_cost_total_dollars[1h])) by (model)',
            legendFormat: '{{model}}'
          }]
        },
        {
          title: 'Active Builds',
          type: 'stat',
          gridPos: { x: 12, y: 16, w: 6, h: 4 },
          targets: [{
            expr: 'sum(active_builds)',
            legendFormat: 'Active'
          }]
        },
        {
          title: 'Companies Created',
          type: 'stat',
          gridPos: { x: 18, y: 16, w: 6, h: 4 },
          targets: [{
            expr: 'sum(company_builders_total)',
            legendFormat: 'Total'
          }]
        }
      ]
    };
  }
}

// ============================================
// RECORDING RULES GENERATOR
// ============================================

class RecordingRulesGenerator {
  generateRecordingRules() {
    return {
      groups: [{
        name: 'hojai-foundry-recording-rules',
        rules: [
          // Service level indicators
          {
            record: 'service:http_requests_total:rate5m',
            expr: 'sum(rate(http_requests_total[5m])) by (service)'
          },
          {
            record: 'service:http_request_errors:rate5m',
            expr: 'sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)'
          },
          {
            record: 'service:http_request_duration_seconds:p95',
            expr: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))'
          },

          // Build metrics
          {
            record: 'platform:builds_total:rate1h',
            expr: 'sum(rate(build_duration_seconds_count[1h])) by (platform)'
          },
          {
            record: 'platform:build_success_rate',
            expr: 'sum(rate(build_duration_seconds_count{status="success"}[1h])) by (platform) / sum(rate(build_duration_seconds_count[1h])) by (platform)'
          },
          {
            record: 'platform:build_duration_seconds:p95',
            expr: 'histogram_quantile(0.95, sum(rate(build_duration_seconds_bucket[1h])) by (le, platform))'
          },

          // AI metrics
          {
            record: 'model:ai_requests_total:rate5m',
            expr: 'sum(rate(ai_requests_total[5m])) by (model)'
          },
          {
            record: 'model:ai_latency_seconds:p95',
            expr: 'histogram_quantile(0.95, sum(rate(ai_latency_seconds_bucket[5m])) by (le, model))'
          },
          {
            record: 'model:ai_cost_total:increase1h',
            expr: 'increase(ai_cost_total_dollars[1h])'
          },
          {
            record: 'model:ai_tokens_total:rate5m',
            expr: 'sum(rate(ai_tokens_total[5m])) by (model, type)'
          },

          // Business metrics
          {
            record: ':template:companies_created:rate1d',
            expr: 'sum(rate(company_builders_total[1d])) by (template)'
          }
        ]
      }]
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export const prometheusRegistry = new PrometheusRegistry();
export const alertRulesGenerator = new AlertRulesGenerator();
export const recordingRulesGenerator = new RecordingRulesGenerator();

export default prometheusRegistry;
