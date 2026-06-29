/**
 * Genie Intelligence Bridge
 *
 * Connects Genie OS to the HOJAI Intelligence Gateway
 * Enables Genie to leverage all intelligence services
 *
 * Port: 4701 (Genie Gateway)
 * Routes: /api/intelligence/*
 */

import axios from 'axios';

const INTELLIGENCE_GATEWAY = process.env.INTELLIGENCE_GATEWAY_URL || 'http://localhost:4750';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'intelligence-gateway-token';

class IntelligenceBridge {
  constructor() {
    this.gateway = axios.create({
      baseURL: INTELLIGENCE_GATEWAY,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': INTERNAL_TOKEN
      }
    });
  }

  // ===== AI INTELLIGENCE =====

  /**
   * Analyze text for intent, sentiment, entities
   */
  async analyze(text, userId = null) {
    try {
      const response = await this.gateway.post('/api/intelligence/ai-intelligence/analyze', {
        text,
        userId
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Analyze error:', error.message);
      throw error;
    }
  }

  /**
   * Detect intent from user message
   */
  async detectIntent(text, userId = null) {
    try {
      const response = await this.gateway.post('/api/intelligence/intent-engine/intent', {
        text,
        actor: userId
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Intent detection error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze sentiment
   */
  async analyzeSentiment(text) {
    try {
      const response = await this.gateway.post('/api/intelligence/ai-intelligence/sentiment', {
        text
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Sentiment error:', error.message);
      throw error;
    }
  }

  /**
   * Detect fraud/anomaly
   */
  async detectFraud(transaction) {
    try {
      const response = await this.gateway.post('/api/intelligence/ai-intelligence/fraud', {
        transaction
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Fraud detection error:', error.message);
      throw error;
    }
  }

  // ===== PREDICTIVE INTELLIGENCE =====

  /**
   * Forecast demand/trends
   */
  async forecast(metric, history) {
    try {
      const response = await this.gateway.post('/api/intelligence/predictive-intelligence/forecast', {
        metric,
        history
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Forecast error:', error.message);
      throw error;
    }
  }

  /**
   * Detect anomalies
   */
  async detectAnomaly(value, baseline) {
    try {
      const response = await this.gateway.post('/api/intelligence/predictive-intelligence/anomaly', {
        value,
        baseline
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Anomaly detection error:', error.message);
      throw error;
    }
  }

  // ===== RISK INTELLIGENCE =====

  /**
   * Score fraud risk
   */
  async fraudScore(userId, transaction) {
    try {
      const response = await this.gateway.post('/api/intelligence/risk-intelligence/fraud-score', {
        userId,
        transaction
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Fraud score error:', error.message);
      throw error;
    }
  }

  /**
   * Predict churn probability
   */
  async churnScore(userId, metrics) {
    try {
      const response = await this.gateway.post('/api/intelligence/risk-intelligence/churn-score', {
        userId,
        metrics
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Churn score error:', error.message);
      throw error;
    }
  }

  // ===== DECISION INTELLIGENCE =====

  /**
   * Get personalized recommendations
   */
  async recommend(userId, category = null, limit = 10) {
    try {
      const response = await this.gateway.post('/api/intelligence/decision-intelligence/recommend', {
        userId,
        category,
        limit
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Recommendation error:', error.message);
      throw error;
    }
  }

  /**
   * Get Next Best Action
   */
  async nextBestAction(userId, context = {}) {
    try {
      const response = await this.gateway.post('/api/intelligence/decision-intelligence/nba', {
        userId,
        context
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] NBA error:', error.message);
      throw error;
    }
  }

  // ===== REASONING ENGINE =====

  /**
   * Chain-of-thought reasoning
   */
  async reason(query, strategy = 'deductive') {
    try {
      const response = await this.gateway.post('/api/intelligence/reasoning-engine/reason', {
        query,
        strategy
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Reasoning error:', error.message);
      throw error;
    }
  }

  // ===== PERSONALIZATION =====

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    try {
      const response = await this.gateway.post('/api/intelligence/personalization/profiles', {
        userId
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Get profile error:', error.message);
      throw error;
    }
  }

  /**
   * Track user preference
   */
  async trackPreference(userId, action, itemId = null, itemType = null) {
    try {
      const response = await this.gateway.post('/api/intelligence/personalization/track', {
        userId,
        action,
        itemId,
        itemType
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Track preference error:', error.message);
      throw error;
    }
  }

  // ===== KNOWLEDGE =====

  /**
   * Search knowledge base
   */
  async searchKnowledge(query, type = null) {
    try {
      const response = await this.gateway.post('/api/intelligence/knowledge-registry/search', {
        query,
        type
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Knowledge search error:', error.message);
      throw error;
    }
  }

  /**
   * Get knowledge asset
   */
  async getKnowledgeAsset(assetId) {
    try {
      const response = await this.gateway.post('/api/intelligence/knowledge-registry/assets', {
        id: assetId
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Get asset error:', error.message);
      throw error;
    }
  }

  // ===== PLANNING =====

  /**
   * Create plan from goal
   */
  async createPlan(name, goal, owner = 'genie') {
    try {
      const response = await this.gateway.post('/api/intelligence/planning-engine/plans', {
        name,
        goal,
        owner
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Create plan error:', error.message);
      throw error;
    }
  }

  /**
   * Execute plan
   */
  async executePlan(planId, context = {}) {
    try {
      const response = await this.gateway.post(`/api/intelligence/planning-engine/plans/${planId}/execute`, context);
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Execute plan error:', error.message);
      throw error;
    }
  }

  // ===== REFLECTION =====

  /**
   * Score content quality
   */
  async reflect(text, dimensions = ['clarity', 'accuracy', 'completeness']) {
    try {
      const response = await this.gateway.post('/api/intelligence/reflection-engine/reflect', {
        text,
        dimensions
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Reflection error:', error.message);
      throw error;
    }
  }

  // ===== PROACTIVE =====

  /**
   * Get proactive suggestions
   */
  async suggest(userId, context = {}) {
    try {
      const response = await this.gateway.post('/api/intelligence/proactive-engine/suggest', {
        userId,
        context
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Suggest error:', error.message);
      throw error;
    }
  }

  // ===== BATCH & CHAIN =====

  /**
   * Batch multiple intelligence requests
   */
  async batch(requests) {
    try {
      const response = await this.gateway.post('/api/intelligence/batch', {
        requests
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Batch error:', error.message);
      throw error;
    }
  }

  /**
   * Chain multiple intelligence services
   */
  async chain(steps) {
    try {
      const response = await this.gateway.post('/api/intelligence/chain', {
        steps
      });
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Chain error:', error.message);
      throw error;
    }
  }

  // ===== HEALTH =====

  /**
   * Check gateway health
   */
  async health() {
    try {
      const response = await this.gateway.get('/health');
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Health check error:', error.message);
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Get all services status
   */
  async servicesHealth() {
    try {
      const response = await this.gateway.get('/api/services/health');
      return response.data;
    } catch (error) {
      console.error('[Genie-Intelligence] Services health error:', error.message);
      return { status: 'error', error: error.message };
    }
  }
}

// Export singleton
export const intelligenceBridge = new IntelligenceBridge();
export default intelligenceBridge;
