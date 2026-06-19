/**
 * HOJAI Intelligence - Prediction Agent
 * Predicts CSAT scores, escalation probability, and churn risk
 */

import { PredictionResult, SentimentResult, IntentResult } from '../types';

// CSAT prediction factors
const CSAT_WEIGHTS = {
  sentiment: 0.35,
  intent: 0.25,
  entities: 0.15,
  historical: 0.25,
};

// Escalation prediction factors
const ESCALATION_WEIGHTS = {
  negativeSentiment: 0.3,
  complaintIntent: 0.25,
  frustrationEmotion: 0.2,
  refundRequest: 0.15,
  previousEscalations: 0.1,
};

// Churn risk thresholds
const CHURN_THRESHOLDS = {
  high: 0.7,
  medium: 0.4,
};

// Intent risk multipliers
const INTENT_RISK: Record<string, number> = {
  'complaint': 1.5,
  'refund_request': 1.3,
  'technical_support': 1.1,
  'general_inquiry': 0.8,
  'product_inquiry': 0.6,
  'feedback': 0.5,
  'upgrade_request': 0.4,
  'greeting': 0.2,
  'farewell': 0.1,
};

// Critical phrases that increase escalation risk
const CRITICAL_PHRASES = [
  'speak to manager', 'supervisor', 'escalate', 'legal action',
  'file complaint', 'consumer forum', 'twitter', 'facebook', 'review',
  'money back', 'refund', 'cancel subscription', 'report you',
  'consumer protection', 'take action', 'compensation',
];

export class PredictionAgent {
  /**
   * Predict outcomes based on current interaction data
   */
  async predict(
    sentiment: SentimentResult,
    intent: IntentResult,
    customerHistory?: {
      previousCsatScores?: number[];
      previousEscalations?: number;
      accountAge?: number;
      lifetimeValue?: number;
      tier?: string;
    }
  ): Promise<PredictionResult> {
    // Predict CSAT score
    const csatScore = this.predictCsat(sentiment, intent, customerHistory);

    // Calculate escalation probability
    const escalationProbability = this.predictEscalation(sentiment, intent, customerHistory);

    // Assess churn risk
    const churnRisk = this.assessChurnRisk(escalationProbability, customerHistory);

    // Generate proactive action recommendations
    const recommendedProactiveActions = this.generateProactiveActions(
      sentiment,
      intent,
      escalationProbability,
      churnRisk
    );

    // Calculate overall confidence
    const confidence = this.calculateConfidence(sentiment, intent, customerHistory);

    return {
      csatScore: Math.round(csatScore * 10) / 10,
      escalationProbability: Math.round(escalationProbability * 100) / 100,
      churnRisk,
      recommendedProactiveActions,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Predict CSAT score (1-5 scale)
   */
  private predictCsat(
    sentiment: SentimentResult,
    intent: IntentResult,
    customerHistory?: {
      previousCsatScores?: number[];
      previousEscalations?: number;
      accountAge?: number;
      lifetimeValue?: number;
      tier?: string;
    }
  ): number {
    // Base score from sentiment
    let score = 3.0; // Neutral baseline

    // Apply sentiment weight
    score += sentiment.score * CSAT_WEIGHTS.sentiment * 2;

    // Apply intent weight
    const intentRisk = INTENT_RISK[intent.primaryIntent] || 1.0;
    const intentAdjustment = (2 - intentRisk) * CSAT_WEIGHTS.intent;
    score += intentAdjustment;

    // Check for critical phrases
    for (const phrase of CRITICAL_PHRASES) {
      if (sentiment.keyPhrases.some(kp => kp.includes(phrase))) {
        score -= 0.3;
        break;
      }
    }

    // Factor in emotion intensity
    const hasFrustration = sentiment.emotions.some(e => e.emotion === 'frustration' || e.emotion === 'anger');
    if (hasFrustration) {
      score -= 0.5;
    }

    // Historical adjustment
    if (customerHistory?.previousCsatScores && customerHistory.previousCsatScores.length > 0) {
      const avgHistorical = customerHistory.previousCsatScores.reduce((a, b) => a + b, 0) / customerHistory.previousCsatScores.length;
      score = score * (1 - CSAT_WEIGHTS.historical) + avgHistorical * CSAT_WEIGHTS.historical;
    }

    // Customer tier adjustment
    if (customerHistory?.tier === 'vip') {
      score = Math.min(score + 0.3, 5.0);
    } else if (customerHistory?.tier === 'premium') {
      score = Math.min(score + 0.15, 5.0);
    }

    return Math.max(1.0, Math.min(5.0, score));
  }

  /**
   * Predict escalation probability
   */
  private predictEscalation(
    sentiment: SentimentResult,
    intent: IntentResult,
    customerHistory?: {
      previousEscalations?: number;
      accountAge?: number;
    }
  ): number {
    let probability = 0;

    // Negative sentiment contribution
    if (sentiment.sentiment === 'negative') {
      probability += ESCALATION_WEIGHTS.negativeSentiment * Math.abs(sentiment.score);
    } else if (sentiment.sentiment === 'mixed') {
      probability += ESCALATION_WEIGHTS.negativeSentiment * 0.5;
    }

    // Complaint intent contribution
    if (intent.primaryIntent === 'complaint') {
      probability += ESCALATION_WEIGHTS.complaintIntent;
    } else if (intent.primaryIntent === 'refund_request') {
      probability += ESCALATION_WEIGHTS.refundRequest;
    }

    // Frustration/emotion contribution
    const frustrationEmotion = sentiment.emotions.find(e => e.emotion === 'frustration' || e.emotion === 'anger');
    if (frustrationEmotion) {
      probability += frustrationEmotion.intensity * ESCALATION_WEIGHTS.frustrationEmotion;
    }

    // Critical phrases
    for (const phrase of CRITICAL_PHRASES) {
      if (sentiment.keyPhrases.some(kp => kp.includes(phrase))) {
        probability += 0.15;
        break;
      }
    }

    // Previous escalations (customer history)
    if (customerHistory?.previousEscalations && customerHistory.previousEscalations > 0) {
      probability += customerHistory.previousEscalations * ESCALATION_WEIGHTS.previousEscalations;
    }

    // Low confidence reduces certainty
    if (sentiment.confidence < 0.7) {
      probability *= 0.9;
    }

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Assess churn risk
   */
  private assessChurnRisk(
    escalationProbability: number,
    customerHistory?: {
      previousCsatScores?: number[];
      previousEscalations?: number;
      lifetimeValue?: number;
      accountAge?: number;
    }
  ): 'low' | 'medium' | 'high' {
    let riskScore = escalationProbability;

    // Declining CSAT trend
    if (customerHistory?.previousCsatScores && customerHistory.previousCsatScores.length >= 3) {
      const scores = customerHistory.previousCsatScores.slice(-3);
      if (scores[0] > scores[1] && scores[1] > scores[2]) {
        riskScore += 0.15; // Declining trend
      }
    }

    // Multiple previous escalations
    if (customerHistory?.previousEscalations && customerHistory.previousEscalations >= 2) {
      riskScore += 0.1;
    }

    // New customer (less invested)
    if (customerHistory?.accountAge && customerHistory.accountAge < 30) {
      riskScore += 0.05;
    }

    // Low lifetime value (less invested)
    if (customerHistory?.lifetimeValue && customerHistory.lifetimeValue < 100) {
      riskScore += 0.05;
    }

    // Apply thresholds
    if (riskScore >= CHURN_THRESHOLDS.high) return 'high';
    if (riskScore >= CHURN_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  /**
   * Generate proactive action recommendations
   */
  private generateProactiveActions(
    sentiment: SentimentResult,
    intent: IntentResult,
    escalationProbability: number,
    churnRisk: 'low' | 'medium' | 'high'
  ): string[] {
    const actions: string[] = [];

    // Based on escalation probability
    if (escalationProbability > 0.7) {
      actions.push('Proactively offer supervisor call');
      actions.push('Prepare compensation options');
      actions.push('Log for management review');
    } else if (escalationProbability > 0.4) {
      actions.push('Monitor closely for next 24 hours');
      actions.push('Prepare alternative solutions');
    }

    // Based on churn risk
    if (churnRisk === 'high') {
      actions.push('Offer loyalty discount');
      actions.push('Escalate to retention team');
      actions.push('Schedule follow-up call within 48 hours');
    } else if (churnRisk === 'medium') {
      actions.push('Send satisfaction survey');
      actions.push('Offer small goodwill gesture');
    }

    // Based on sentiment
    if (sentiment.sentiment === 'negative') {
      actions.push('Acknowledge frustration');
      actions.push('Provide clear timeline for resolution');
    }

    // Based on intent
    if (intent.primaryIntent === 'refund_request') {
      actions.push('Prepare refund options ready');
      actions.push('Consider partial compensation as alternative');
    }

    // Add default actions if none generated
    if (actions.length === 0) {
      actions.push('Standard resolution process');
      actions.push('Send confirmation email');
    }

    return [...new Set(actions)].slice(0, 5);
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(
    sentiment: SentimentResult,
    intent: IntentResult,
    customerHistory?: Record<string, unknown>
  ): number {
    let confidence = 0.5; // Base confidence

    // Sentiment confidence contribution
    confidence += sentiment.confidence * 0.25;

    // Intent confidence contribution
    confidence += intent.confidence * 0.25;

    // Historical data availability
    if (customerHistory) {
      confidence += 0.15;
    }

    // Emotion detection boosts confidence for strong signals
    if (sentiment.emotions.length > 0) {
      confidence += 0.05;
    }

    return Math.min(0.95, Math.max(0.3, confidence));
  }
}

export const predictionAgent = new PredictionAgent();
