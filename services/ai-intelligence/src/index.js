/**
 * RTMN AI Intelligence Service
 *
 * Port: 4881
 * Purpose: AI-powered customer operations with Intent, Sentiment, Fraud agents
 *
 * Features:
 * - Intent Detection Agent
 * - Sentiment Analysis Agent
 * - Fraud Detection Agent
 * - Text Classification
 * - Entity Extraction
 * - Language Detection
 * - AI Response Generation
 * - Conversation Analysis
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.AI_INTELLIGENCE_PORT || 4881;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// DATA STORES
// ============================================================

const analyses = new Map();
const models = new Map();
const insights = new Map();

// Initialize AI models (simulated)
models.set('intent-classifier', {
  id: 'intent-classifier',
  name: 'Intent Classifier',
  version: '2.1.0',
  accuracy: 0.94,
  lastTrained: '2026-06-01',
  labels: ['billing', 'support', 'sales', 'feedback', 'complaint', 'refund', 'technical', 'general']
});

models.set('sentiment-analyzer', {
  id: 'sentiment-analyzer',
  name: 'Sentiment Analyzer',
  version: '1.8.0',
  accuracy: 0.91,
  lastTrained: '2026-06-05',
  labels: ['positive', 'negative', 'neutral']
});

models.set('fraud-detector', {
  id: 'fraud-detector',
  name: 'Fraud Detector',
  version: '3.0.0',
  accuracy: 0.87,
  lastTrained: '2026-06-10',
  rules: ['velocity_check', 'pattern_match', 'device_fingerprint', 'geo_anomaly']
});

// Sample analyses history
const sampleAnalyses = [
  {
    id: 'analysis-001',
    type: 'intent',
    input: 'I want to cancel my subscription',
    result: { intent: 'cancellation', confidence: 0.95, alternatives: [{ intent: 'billing', confidence: 0.12 }] },
    createdAt: '2026-06-17T10:30:00Z'
  },
  {
    id: 'analysis-002',
    type: 'sentiment',
    input: 'This is the worst service I have ever experienced!',
    result: { sentiment: 'negative', score: -0.89, emotions: { anger: 0.72, frustration: 0.65 } },
    createdAt: '2026-06-17T11:00:00Z'
  },
  {
    id: 'analysis-003',
    type: 'fraud',
    input: { customerId: 'cust-001', amount: 50000, velocity: 5, riskFactors: ['new_device', 'different_country'] },
    result: { risk: 'high', score: 0.82, factors: ['velocity_anomaly', 'geo_mismatch'], recommendation: 'block' },
    createdAt: '2026-06-17T11:30:00Z'
  }
];
sampleAnalyses.forEach(a => analyses.set(a.id, a));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Intelligence',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      models: models.size,
      analyses: analyses.size,
      uptime: process.uptime()
    }
  });
});

// ============================================================
// INTENT DETECTION
// ============================================================

// Analyze intent
app.post('/api/intent/analyze', (req, res) => {
  const { text, context, language } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text required' });
  }

  // Simulate intent detection
  const textLower = text.toLowerCase();

  let intent = 'general';
  let confidence = 0.7;

  // Intent detection rules (simplified)
  if (textLower.match(/cancel|refund|money back|dispute/i)) {
    intent = 'cancellation';
    confidence = 0.92;
  } else if (textLower.match(/price|cost|bill|invoice|payment|charge/i)) {
    intent = 'billing';
    confidence = 0.89;
  } else if (textLower.match(/broken|not working|error|bug|issue|problem/i)) {
    intent = 'technical';
    confidence = 0.87;
  } else if (textLower.match(/buy|purchase|subscribe|plan|upgrade/i)) {
    intent = 'sales';
    confidence = 0.85;
  } else if (textLower.match(/thank|great|amazing|love|excellent|wonderful/i)) {
    intent = 'positive_feedback';
    confidence = 0.91;
  } else if (textLower.match(/terrible|worst|awful|hate|disappointed|frustrated/i)) {
    intent = 'complaint';
    confidence = 0.88;
  } else if (textLower.match(/help|assist|support|how to|can i|what is|tell me/i)) {
    intent = 'support';
    confidence = 0.83;
  } else if (textLower.match(/feature|request|suggest|improve|would be nice/i)) {
    intent = 'feedback';
    confidence = 0.86;
  }

  const alternatives = [
    { intent: 'support', confidence: Math.max(0, confidence - 0.15) },
    { intent: 'general', confidence: Math.max(0, confidence - 0.25) }
  ].filter(a => a.intent !== intent);

  const analysis = {
    id: `analysis-${uuidv4().slice(0, 8)}`,
    type: 'intent',
    input: text,
    context,
    language: language || 'en',
    result: {
      intent,
      confidence,
      alternatives,
      entities: extractEntities(text),
      language: detectLanguage(text)
    },
    model: 'intent-classifier',
    createdAt: new Date().toISOString()
  };

  analyses.set(analysis.id, analysis);

  res.json({
    success: true,
    analysis: analysis.result
  });
});

// ============================================================
// SENTIMENT ANALYSIS
// ============================================================

// Analyze sentiment
app.post('/api/sentiment/analyze', (req, res) => {
  const { text, context } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text required' });
  }

  const textLower = text.toLowerCase();

  // Simulate sentiment analysis
  let sentiment = 'neutral';
  let score = 0;
  let confidence = 0.75;

  const emotions = {
    positive: 0,
    negative: 0,
    joy: 0,
    anger: 0,
    frustration: 0,
    excitement: 0
  };

  // Positive indicators
  if (textLower.match(/thank|great|amazing|love|excellent|wonderful|perfect|fantastic|best|awesome/i)) {
    sentiment = 'positive';
    score = 0.75;
    confidence = 0.89;
    emotions.positive = 0.82;
    emotions.joy = 0.71;
    emotions.excitement = 0.45;
  }

  // Negative indicators
  if (textLower.match(/terrible|worst|awful|hate|disappointed|frustrated|angry|annoyed|poor|bad/i)) {
    sentiment = 'negative';
    score = -0.82;
    confidence = 0.91;
    emotions.negative = 0.89;
    emotions.anger = 0.72;
    emotions.frustration = 0.68;
  }

  // Intensifiers
  if (textLower.match(/very|extremely|absolutely|completely|really/i)) {
    score = score * 1.2;
    confidence = Math.min(1, confidence + 0.05);
  }

  // Urgency indicators
  const urgency = textLower.match(/urgent|immediately|asap|emergency|critical/i) ? 0.8 : 0.2;

  // Emoji sentiment
  const positiveEmojis = text.match(/[😊😍🎉❤️✨👍]/g)?.length || 0;
  const negativeEmojis = text.match(/[😠😤😡😞😭😠]/g)?.length || 0;
  if (positiveEmojis > negativeEmojis) {
    score = Math.min(1, score + 0.15);
  } else if (negativeEmojis > positiveEmojis) {
    score = Math.max(-1, score - 0.15);
  }

  const analysis = {
    id: `analysis-${uuidv4().slice(0, 8)}`,
    type: 'sentiment',
    input: text,
    context,
    result: {
      sentiment,
      score: Math.max(-1, Math.min(1, score)),
      confidence,
      emotions,
      urgency,
      keywords: extractKeywords(text),
      language: detectLanguage(text)
    },
    model: 'sentiment-analyzer',
    createdAt: new Date().toISOString()
  };

  analyses.set(analysis.id, analysis);

  res.json({
    success: true,
    analysis: analysis.result
  });
});

// ============================================================
// FRAUD DETECTION
// ============================================================

// Analyze fraud risk
app.post('/api/fraud/analyze', (req, res) => {
  const { customerId, transaction, behavior } = req.body;

  if (!customerId) {
    return res.status(400).json({ success: false, error: 'Customer ID required' });
  }

  let riskScore = 0.15; // Base risk
  const riskFactors = [];
  let recommendation = 'allow';

  // Transaction analysis
  if (transaction) {
    // Amount checks
    if (transaction.amount > 10000) {
      riskScore += 0.15;
      riskFactors.push('high_amount');
    }
    if (transaction.amount > 50000) {
      riskScore += 0.2;
      riskFactors.push('very_high_amount');
    }

    // Velocity checks
    if (transaction.velocity && transaction.velocity > 5) {
      riskScore += 0.2;
      riskFactors.push('velocity_anomaly');
    }

    // New device
    if (transaction.isNewDevice) {
      riskScore += 0.1;
      riskFactors.push('new_device');
    }

    // Different country
    if (transaction.geoMismatch) {
      riskScore += 0.15;
      riskFactors.push('geo_mismatch');
    }

    // Unusual time
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 0.08;
      riskFactors.push('unusual_time');
    }
  }

  // Behavior analysis
  if (behavior) {
    if (behavior.loginFailures > 3) {
      riskScore += 0.25;
      riskFactors.push('multiple_login_failures');
    }
    if (behavior.newBehaviorPattern) {
      riskScore += 0.15;
      riskFactors.push('behavior_change');
    }
  }

  // Clamp risk score
  riskScore = Math.min(1, Math.max(0, riskScore));

  // Determine risk level and recommendation
  let risk = 'low';
  if (riskScore > 0.7) {
    risk = 'high';
    recommendation = 'block';
  } else if (riskScore > 0.4) {
    risk = 'medium';
    recommendation = 'review';
  }

  const analysis = {
    id: `analysis-${uuidv4().slice(0, 8)}`,
    type: 'fraud',
    input: { customerId, transaction, behavior },
    result: {
      risk,
      score: riskScore,
      factors: riskFactors,
      recommendation,
      actions: getRecommendedActions(risk, riskFactors)
    },
    model: 'fraud-detector',
    createdAt: new Date().toISOString()
  };

  analyses.set(analysis.id, analysis);

  res.json({
    success: true,
    analysis: analysis.result
  });
});

// ============================================================
// TEXT CLASSIFICATION
// ============================================================

// Classify text
app.post('/api/classify', (req, res) => {
  const { text, categories } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text required' });
  }

  const defaultCategories = ['billing', 'technical', 'sales', 'support', 'feedback', 'general'];
  const cats = categories || defaultCategories;

  // Simple keyword-based classification
  const textLower = text.toLowerCase();
  const scores = {};

  cats.forEach(cat => {
    scores[cat] = 0;

    const keywords = {
      billing: ['payment', 'invoice', 'charge', 'price', 'cost', 'subscription', 'plan', 'bill'],
      technical: ['error', 'bug', 'crash', 'broken', 'not working', 'issue', 'problem'],
      sales: ['buy', 'purchase', 'upgrade', 'pricing', 'demo', 'trial'],
      support: ['help', 'how to', 'can i', 'what is', 'explain', 'assist'],
      feedback: ['suggest', 'recommend', 'improve', 'feature', 'idea', 'request'],
      general: []
    };

    if (keywords[cat]) {
      keywords[cat].forEach(kw => {
        if (textLower.includes(kw)) scores[cat] += 0.25;
      });
    }
  });

  // Find best category
  let bestCategory = 'general';
  let bestScore = 0;
  Object.entries(scores).forEach(([cat, score]) => {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  });

  res.json({
    success: true,
    classification: {
      category: bestCategory,
      confidence: Math.min(0.99, bestScore + 0.3),
      scores,
      entities: extractEntities(text)
    }
  });
});

// ============================================================
// ENTITY EXTRACTION
// ============================================================

// Extract entities
app.post('/api/entities/extract', (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text required' });
  }

  const entities = {
    emails: [],
    phones: [],
    amounts: [],
    dates: [],
    orderIds: [],
    accountIds: [],
    urls: []
  };

  // Email extraction
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  entities.emails = text.match(emailRegex) || [];

  // Phone extraction
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  entities.phones = text.match(phoneRegex)?.slice(0, 3) || [];

  // Amount extraction
  const amountRegex = /\$[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|usd|rs|inr)/gi;
  entities.amounts = text.match(amountRegex) || [];

  // Date extraction
  const dateRegex = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}/g;
  entities.dates = text.match(dateRegex) || [];

  // Order ID extraction
  const orderRegex = /(?:order|ord)[-\s]?(?:id|#|no\.?)?\s*[A-Z0-9]{6,}/gi;
  entities.orderIds = text.match(orderRegex)?.map(id => id.replace(/\s+/g, '').toUpperCase()) || [];

  // Account ID extraction
  const accountRegex = /(?:account|acct)[-\s]?(?:id|#|no\.?)?\s*[A-Z0-9]{4,}/gi;
  entities.accountIds = text.match(accountRegex)?.map(id => id.replace(/\s+/g, '').toUpperCase()) || [];

  res.json({
    success: true,
    entities,
    count: Object.values(entities).reduce((sum, arr) => sum + arr.length, 0)
  });
});

// ============================================================
// LANGUAGE DETECTION
// ============================================================

app.post('/api/language/detect', (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'Text required' });
  }

  // Simple language detection
  const langs = {
    en: /\bthe|is|are|and|to|in|for|of|on|with|have|be|this|that|it|at|but\b/i,
    hi: /\bहै|में|का|की|को|से|हैं|ने|नहीं|या|और\b/,
    es: /\bel|la|los|las|de|en|que|es|un|una|por|con|para\b/i,
    fr: /\ble|la|les|de|en|que|est|un|une|et|sur|dans|pour|avec\b/i
  };

  let detected = 'en';
  let maxMatches = 0;

  Object.entries(langs).forEach(([lang, regex]) => {
    const matches = (text.match(regex) || []).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detected = lang;
    }
  });

  res.json({
    success: true,
    language: {
      code: detected,
      confidence: Math.min(0.95, 0.4 + maxMatches * 0.1),
      supported: ['en', 'hi', 'es', 'fr', 'de', 'pt', 'zh', 'ja']
    }
  });
});

// ============================================================
// AI INSIGHTS
// ============================================================

// Get conversation insights
app.post('/api/insights/conversation', (req, res) => {
  const { messages, customerId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, error: 'Messages array required' });
  }

  const insights = [];

  // Analyze sentiment trend
  const sentiments = messages.map(m => m.sentiment?.score || 0);
  if (sentiments.length > 1) {
    const trend = sentiments[sentiments.length - 1] - sentiments[0];
    insights.push({
      type: 'sentiment_trend',
      value: trend > 0.1 ? 'improving' : trend < -0.1 ? 'declining' : 'stable',
      detail: `Sentiment has ${trend > 0 ? 'improved' : trend < 0 ? 'declined' : 'remained stable'} during the conversation`
    });
  }

  // Check for escalation signals
  const escalationSignals = messages.filter(m =>
    m.text?.match(/supervisor|manager|speak|escalate|lawyer|legal|complaint/i)
  );
  if (escalationSignals.length > 0) {
    insights.push({
      type: 'escalation_risk',
      value: 'high',
      detail: `${escalationSignals.length} escalation signals detected`
    });
  }

  // CSAT prediction
  const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const predictedCSAT = Math.round((avgSentiment + 1) * 5) / 2;
  insights.push({
    type: 'csat_prediction',
    value: Math.max(1, Math.min(5, predictedCSAT.toFixed(1))),
    detail: `Based on conversation sentiment`
  });

  // Topic analysis
  const topics = {};
  messages.forEach(m => {
    if (m.intent) topics[m.intent] = (topics[m.intent] || 0) + 1;
  });
  const topTopic = Object.entries(topics).sort((a, b) => b[1] - a[1])[0];
  if (topTopic) {
    insights.push({
      type: 'primary_topic',
      value: topTopic[0],
      detail: `Most discussed topic (${topTopic[1]} mentions)`
    });
  }

  // Resolution indicators
  const resolutionPhrases = messages.filter(m =>
    m.text?.match(/resolved|fixed|solved|thank|great|appreciate/i)
  );
  insights.push({
    type: 'resolution_likelihood',
    value: resolutionPhrases.length > 0 ? 'high' : 'medium',
    detail: resolutionPhrases.length > 0 ? 'Customer showed positive resolution signals' : 'No clear resolution signals'
  });

  res.json({
    success: true,
    insights,
    summary: {
      messageCount: messages.length,
      duration: messages.length * 3, // estimated minutes
      topics: Object.keys(topics)
    }
  });
});

// ============================================================
// MODELS MANAGEMENT
// ============================================================

app.get('/api/models', (req, res) => {
  res.json({
    success: true,
    models: Array.from(models.values())
  });
});

app.get('/api/models/:id', (req, res) => {
  const model = models.get(req.params.id);
  if (!model) {
    return res.status(404).json({ success: false, error: 'Model not found' });
  }
  res.json({ success: true, model });
});

// ============================================================
// ANALYSIS HISTORY
// ============================================================

app.get('/api/analyses', (req, res) => {
  const { type, limit = 50 } = req.query;

  let result = Array.from(analyses.values());
  if (type) result = result.filter(a => a.type === type);

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  result = result.slice(0, parseInt(limit));

  res.json({
    success: true,
    total: analyses.size,
    analyses: result
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function extractEntities(text) {
  const entities = {
    emails: [],
    phones: [],
    amounts: [],
    dates: []
  };

  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  entities.emails = text.match(emailRegex) || [];

  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  entities.phones = text.match(phoneRegex)?.slice(0, 3) || [];

  const amountRegex = /\$[\d,]+(?:\.\d{2})?/g;
  entities.amounts = text.match(amountRegex) || [];

  return entities;
}

function extractKeywords(text) {
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but', 'and', 'or', 'if', 'because', 'as', 'until', 'while'];

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));

  const frequency = {};
  words.forEach(w => frequency[w] = (frequency[w] || 0) + 1);

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

function detectLanguage(text) {
  const patterns = {
    en: /\bthe|is|are|and|to|in|for|of|on|with|have|be|this|that|it|at|but\b/i,
    hi: /[ऀ-ॿ]/,
    es: /\bel|la|los|las|de|en|que|es|un|una|por|con|para\b/i,
    fr: /\ble|la|les|de|en|que|est|un|une|et|sur|dans|pour|avec\b/i
  };

  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) return lang;
  }
  return 'en';
}

function getRecommendedActions(risk, factors) {
  const actions = [];

  if (risk === 'high') {
    actions.push({ action: 'block_transaction', reason: 'High fraud risk detected' });
    actions.push({ action: 'send_otp', reason: 'Additional verification required' });
    actions.push({ action: 'alert_security', reason: 'Flag for security review' });
  } else if (risk === 'medium') {
    actions.push({ action: 'require_verification', reason: 'Additional verification recommended' });
    actions.push({ action: 'monitor_closely', reason: 'Enhanced monitoring' });
  }

  if (factors.includes('velocity_anomaly')) {
    actions.push({ action: 'check_account_age', reason: 'Velocity anomaly detected' });
  }

  if (factors.includes('geo_mismatch')) {
    actions.push({ action: 'verify_location', reason: 'Geographic mismatch' });
  }

  return actions;
}

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`[AI Intelligence] Service started on port ${PORT}`);
  console.log(`[AI Intelligence] ${models.size} AI models loaded`);
  console.log(`[AI Intelligence] Ready for inference`);
});

module.exports = app;
