/**
 * Root Cause Analysis Service
 * AI-powered root cause identification
 */

class RootCauseAnalysis {
  constructor(config) {
    this.aiServiceUrl = config.aiServiceUrl || 'http://localhost:4004';
    this.metricsServiceUrl = config.metricsServiceUrl;
  }

  // Analyze incident
  async analyze({ incident, logs, metrics, timeRange }) {
    // 1. Gather context
    const context = await this.gatherContext(incident, timeRange);

    // 2. Find anomalies
    const anomalies = await this.findAnomalies(metrics, timeRange);

    // 3. Correlate events
    const correlations = await this.correlateEvents(logs, anomalies, timeRange);

    // 4. AI analysis
    const aiAnalysis = await this.aiAnalysis({
      incident,
      context,
      anomalies,
      correlations,
    });

    return {
      success: true,
      root_causes: aiAnalysis.root_causes,
      confidence: aiAnalysis.confidence,
      recommendations: aiAnalysis.recommendations,
      evidence: correlations,
    };
  }

  async gatherContext(incident, timeRange) {
    return {
      service: incident.service,
      severity: incident.severity,
      startedAt: incident.startedAt,
      timeRange,
      relatedDeploys: [],
      relatedChanges: [],
    };
  }

  async findAnomalies(metrics, timeRange) {
    if (!this.metricsServiceUrl) return [];

    try {
      const axios = require('axios');
      const response = await axios.post(`${this.metricsServiceUrl}/anomalies`, {
        metrics,
        timeRange,
      });

      return response.data.anomalies || [];
    } catch {
      return [];
    }
  }

  async correlateEvents(logs, anomalies, timeRange) {
    const events = [];

    // Find deploys near incident start
    const deploys = logs.filter(l => l.type === 'deploy');
    const errors = logs.filter(l => l.level === 'error');

    // Find patterns
    events.push({
      type: 'deploys',
      count: deploys.length,
      timestamps: deploys.map(d => d.timestamp),
    });

    events.push({
      type: 'errors',
      count: errors.length,
      patterns: this.extractErrorPatterns(errors),
      firstSeen: errors[0]?.timestamp,
    });

    events.push({
      type: 'anomalies',
      items: anomalies,
    });

    return events;
  }

  extractErrorPatterns(errors) {
    const patterns = {};
    for (const error of errors) {
      const key = error.message?.substring(0, 50) || 'unknown';
      patterns[key] = (patterns[key] || 0) + 1;
    }
    return patterns;
  }

  async aiAnalysis({ incident, context, anomalies, correlations }) {
    if (!this.aiServiceUrl) {
      return this.fallbackAnalysis(incident, anomalies);
    }

    try {
      const axios = require('axios');
      const response = await axios.post(`${this.aiServiceUrl}/root-cause`, {
        incident,
        context,
        anomalies,
        correlations,
      });

      return response.data;
    } catch {
      return this.fallbackAnalysis(incident, anomalies);
    }
  }

  // Fallback heuristic analysis
  fallbackAnalysis(incident, anomalies) {
    const root_causes = [];
    const recommendations = [];

    if (anomalies.length > 0) {
      root_causes.push({
        cause: 'Resource exhaustion',
        confidence: 0.7,
        evidence: anomalies,
      });
      recommendations.push('Scale up affected services');
      recommendations.push('Investigate traffic patterns');
    }

    if (incident.severity === 'critical') {
      root_causes.push({
        cause: 'Service dependency failure',
        confidence: 0.6,
      });
      recommendations.push('Check downstream services');
    }

    return {
      root_causes,
      confidence: 0.6,
      recommendations,
    };
  }
}

module.exports = RootCauseAnalysis;
