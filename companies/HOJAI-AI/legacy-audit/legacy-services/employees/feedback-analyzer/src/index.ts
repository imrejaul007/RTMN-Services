/**
 * Feedback Analyzer
 * Port: 4824
 *
 * Role: Sentiment analysis, insights extraction, trend detection, feedback synthesis
 * Persona: Analytical thinker, pattern finder, insight generator, communicator
 */

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4824;

// Integration endpoints
const MEMORY_SERVICE = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const EVENT_SERVICE = process.env.EVENT_SERVICE_URL || 'http://localhost:4510';

// Types
interface Feedback {
  id: string;
  type: 'survey' | 'support' | 'social' | 'review' | 'interview' | 'nps';
  source: string;
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  entities: { name: string; type: string; sentiment: string }[];
  topics: string[];
  customerId?: string;
  customerTier?: string;
  rating?: number;
  timestamp: Date;
}

interface Insight {
  id: string;
  type: 'pain_point' | 'feature_request' | 'competitive_intel' | 'trend' | 'praise' | 'complaint';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  evidence: string[];
  affectedCustomers: number;
  impact: 'revenue' | 'retention' | 'acquisition' | 'brand';
  recommendation: string;
  confidence: number;
  detectedAt: Date;
}

interface SentimentTrend {
  period: string;
  sentiment: { positive: number; neutral: number; negative: number };
  avgScore: number;
  volume: number;
}

// Analyze sentiment
function analyzeSentiment(text: string): { sentiment: 'positive' | 'neutral' | 'negative'; score: number } {
  const positiveWords = ['great', 'excellent', 'amazing', 'love', 'fantastic', 'helpful', 'easy', 'best', 'perfect', 'awesome', 'good', 'wonderful'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'difficult', 'frustrated', 'slow', 'broken', 'useless', 'disappointed'];

  const words = text.toLowerCase().split(/\s+/);
  let score = 50; // Neutral baseline

  words.forEach(word => {
    if (positiveWords.some(p => word.includes(p))) score += 5;
    if (negativeWords.some(n => word.includes(n))) score -= 5;
  });

  score = Math.max(0, Math.min(100, score));

  return {
    sentiment: score >= 60 ? 'positive' : score <= 40 ? 'negative' : 'neutral',
    score
  };
}

// Extract topics
function extractTopics(text: string): string[] {
  const topicKeywords: Record<string, string[]> = {
    'pricing': ['price', 'cost', 'expensive', 'cheap', 'affordable', 'pricing', 'subscription', 'plan', 'billing'],
    'features': ['feature', 'functionality', 'capability', 'tool', 'option', 'setting'],
    'usability': ['easy', 'difficult', 'intuitive', 'confusing', 'simple', 'complex', 'user-friendly'],
    'performance': ['fast', 'slow', 'speed', 'quick', 'loading', 'response', 'performance'],
    'support': ['support', 'help', 'service', 'response', 'agent', 'assist'],
    'integration': ['integrate', 'connect', 'api', 'sync', 'integration', 'third-party'],
    'reliability': ['reliable', 'stable', 'bug', 'crash', 'error', 'issue', 'downtime'],
    'mobile': ['mobile', 'app', 'iphone', 'android', 'phone', 'tablet'],
    'security': ['secure', 'security', 'privacy', 'data', 'compliance', 'gdpr']
  };

  const topics: string[] = [];
  const textLower = text.toLowerCase();

  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some(k => textLower.includes(k))) {
      topics.push(topic);
    }
  });

  return topics.length > 0 ? topics : ['general'];
}

// Generate insight from feedback
function generateInsights(feedback: Feedback[]): Insight[] {
  const insights: Insight[] = [];

  // Group by topic
  const topicFeedback: Record<string, Feedback[]> = {};
  feedback.forEach(f => {
    f.topics.forEach(topic => {
      if (!topicFeedback[topic]) topicFeedback[topic] = [];
      topicFeedback[topic].push(f);
    });
  });

  // Generate insights from negative feedback
  Object.entries(topicFeedback).forEach(([topic, feedbacks]) => {
    const negativeFeedback = feedbacks.filter(f => f.sentiment === 'negative');
    if (negativeFeedback.length >= 3) {
      insights.push({
        id: `insight-${Date.now()}-${topic}`,
        type: 'pain_point',
        severity: negativeFeedback.length >= 10 ? 'critical' : negativeFeedback.length >= 5 ? 'high' : 'medium',
        title: `Multiple complaints about ${topic}`,
        description: `${negativeFeedback.length} customers reported issues with ${topic}`,
        evidence: negativeFeedback.slice(0, 5).map(f => f.text.substring(0, 100)),
        affectedCustomers: negativeFeedback.length,
        impact: topic === 'pricing' ? 'retention' : topic === 'performance' ? 'revenue' : 'retention',
        recommendation: `Investigate and prioritize fix for ${topic}`,
        confidence: Math.min(negativeFeedback.length * 5, 95),
        detectedAt: new Date()
      });
    }
  });

  // Generate praise insights
  Object.entries(topicFeedback).forEach(([topic, feedbacks]) => {
    const positiveFeedback = feedbacks.filter(f => f.sentiment === 'positive');
    if (positiveFeedback.length >= 5) {
      insights.push({
        id: `insight-${Date.now()}-${topic}-praise`,
        type: 'praise',
        severity: positiveFeedback.length >= 15 ? 'high' : 'medium',
        title: `Customers love our ${topic}`,
        description: `${positiveFeedback.length} customers praised our ${topic}`,
        evidence: positiveFeedback.slice(0, 3).map(f => f.text.substring(0, 100)),
        affectedCustomers: positiveFeedback.length,
        impact: 'brand',
        recommendation: `Feature this in marketing and continue investing in ${topic}`,
        confidence: Math.min(positiveFeedback.length * 4, 95),
        detectedAt: new Date()
      });
    }
  });

  return insights;
}

// Analyze feedback
app.post('/api/analyze', (req: Request, res: Response) => {
  const { feedback } = req.body;

  const analyzed: Feedback = {
    ...feedback,
    sentiment: analyzeSentiment(feedback.text).sentiment,
    sentimentScore: analyzeSentiment(feedback.text).score,
    topics: extractTopics(feedback.text),
    entities: [],
    timestamp: new Date()
  };

  res.json({
    feedback: analyzed,
    analysis: {
      sentiment: analyzed.sentiment,
      score: analyzed.sentimentScore,
      topics: analyzed.topics,
      keywords: extractTopics(feedback.text),
      emotion: feedback.text.includes('frustrat') ? 'frustration' :
              feedback.text.includes('excit') ? 'excitement' :
              feedback.text.includes('confus') ? 'confusion' : 'neutral'
    }
  });
});

// Batch analyze
app.post('/api/analyze/batch', (req: Request, res: Response) => {
  const { feedbacks } = req.body;

  const analyzed = feedbacks.map((f: Partial<Feedback>) => ({
    ...f,
    sentiment: analyzeSentiment(f.text || '').sentiment,
    sentimentScore: analyzeSentiment(f.text || '').score,
    topics: extractTopics(f.text || ''),
    timestamp: new Date()
  })) as Feedback[];

  const sentimentCounts = {
    positive: analyzed.filter(f => f.sentiment === 'positive').length,
    neutral: analyzed.filter(f => f.sentiment === 'neutral').length,
    negative: analyzed.filter(f => f.sentiment === 'negative').length
  };

  const insights = generateInsights(analyzed);

  res.json({
    analyzed,
    summary: {
      total: analyzed.length,
      ...sentimentCounts,
      avgSentimentScore: Math.round(analyzed.reduce((sum, f) => sum + f.sentimentScore, 0) / analyzed.length),
      topTopics: Object.entries(
        analyzed.flatMap(f => f.topics).reduce((acc, t) => {
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1]).slice(0, 5)
    },
    insights
  });
});

// Get insights
app.get('/api/insights', (req: Request, res: Response) => {
  const { type, severity, period } = req.query;

  const insights: Insight[] = [
    {
      id: 'insight-1',
      type: 'pain_point',
      severity: 'high',
      title: 'Users struggling with workflow setup',
      description: '10 customers reported difficulty creating their first workflow',
      evidence: ['Text 1...', 'Text 2...', 'Text 3...'],
      affectedCustomers: 10,
      impact: 'retention',
      recommendation: 'Create better onboarding flow and video tutorials',
      confidence: 85,
      detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'insight-2',
      type: 'feature_request',
      severity: 'medium',
      title: 'Demand for mobile app',
      description: '8 customers asking for native iOS/Android app',
      evidence: ['Need mobile app...', 'When will you have app?...'],
      affectedCustomers: 8,
      impact: 'acquisition',
      recommendation: 'Evaluate mobile development roadmap',
      confidence: 75,
      detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'insight-3',
      type: 'praise',
      severity: 'medium',
      title: 'Excellent customer support',
      description: '12 customers specifically praised support team',
      evidence: ['Support was amazing...', 'Best support ever...'],
      affectedCustomers: 12,
      impact: 'brand',
      recommendation: 'Recognize support team and feature in marketing',
      confidence: 90,
      detectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ];

  let filtered = insights;
  if (type) filtered = filtered.filter(i => i.type === type);
  if (severity) filtered = filtered.filter(i => i.severity === severity);

  res.json({
    insights: filtered,
    summary: {
      total: filtered.length,
      byType: insights.reduce((acc, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: insights.reduce((acc, i) => {
        acc[i.severity] = (acc[i.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  });
});

// Sentiment trends
app.get('/api/trends', (req: Request, res: Response) => {
  const { period } = req.query;

  const trends: SentimentTrend[] = [
    { period: '2026-W21', sentiment: { positive: 65, neutral: 20, negative: 15 }, avgScore: 72, volume: 120 },
    { period: '2026-W22', sentiment: { positive: 68, neutral: 18, negative: 14 }, avgScore: 74, volume: 135 },
    { period: '2026-W23', sentiment: { positive: 70, neutral: 17, negative: 13 }, avgScore: 76, volume: 142 },
    { period: '2026-W24', sentiment: { positive: 72, neutral: 16, negative: 12 }, avgScore: 78, volume: 158 },
    { period: '2026-W25', sentiment: { positive: 75, neutral: 15, negative: 10 }, avgScore: 80, volume: 165 }
  ];

  res.json({
    trends,
    summary: {
      overallTrend: 'improving',
      sentimentChange: '+5% positive in 4 weeks',
      volumeChange: '+37% feedback volume'
    }
  });
});

// Word cloud data
app.get('/api/wordcloud', (req: Request, res: Response) => {
  const { sentiment, period } = req.query;

  const words = sentiment === 'positive' ? [
    { text: 'great', weight: 45 },
    { text: 'easy', weight: 38 },
    { text: 'helpful', weight: 35 },
    { text: 'love', weight: 32 },
    { text: 'amazing', weight: 28 },
    { text: 'excellent', weight: 25 },
    { text: 'fast', weight: 22 },
    { text: 'intuitive', weight: 18 }
  ] : sentiment === 'negative' ? [
    { text: 'slow', weight: 42 },
    { text: 'expensive', weight: 35 },
    { text: 'confusing', weight: 30 },
    { text: 'buggy', weight: 25 },
    { text: 'frustrating', weight: 22 },
    { text: 'complicated', weight: 18 },
    { text: 'crashes', weight: 15 },
    { text: 'unreliable', weight: 12 }
  ] : [
    { text: 'good', weight: 40 },
    { text: 'works', weight: 35 },
    { text: 'okay', weight: 30 },
    { text: 'average', weight: 25 },
    { text: 'basic', weight: 20 },
    { text: 'fine', weight: 15 }
  ];

  res.json({ words });
});

// NPS analysis
app.get('/api/nps', (req: Request, res: Response) => {
  res.json({
    nps: {
      score: 45,
      promoters: 62,
      passives: 21,
      detractors: 17,
      trend: '+5 vs last month',
      benchmark: 'Industry avg: 35'
    },
    bySegment: {
      enterprise: { nps: 55, promoters: 70, detractors: 15 },
      professional: { nps: 42, promoters: 60, detractors: 18 },
      starter: { nps: 35, promoters: 50, detractors: 25 }
    },
    byCohort: {
      onboarded_q1: { nps: 52, sample: 150 },
      onboarded_q2: { nps: 48, sample: 180 },
      onboarded_q3: { nps: 40, sample: 200 }
    },
    themes: {
      promoters: ['Great features', 'Easy to use', 'Excellent support'],
      passives: ['Satisfied but not enthusiastic', 'Waiting for key features'],
      detractors: ['Too expensive', 'Missing mobile app', 'Performance issues']
    },
    recommendations: [
      'Address mobile app demand from detractors',
      'Highlight value to convert passives to promoters',
      'Maintain support quality driving promoter scores'
    ]
  });
});

// CSAT analysis
app.get('/api/csat', (req: Request, res: Response) => {
  res.json({
    csat: {
      overall: 87,
      trend: '+3% vs last month',
      responseRate: 42
    },
    byChannel: {
      email: { csat: 85, volume: 450, responseRate: 38 },
      chat: { csat: 92, volume: 320, responseRate: 55 },
      phone: { csat: 88, volume: 180, responseRate: 62 },
      portal: { csat: 82, volume: 250, responseRate: 28 }
    },
    byTeam: {
      'tier1': { csat: 85, volume: 600 },
      'tier2': { csat: 89, volume: 300 },
      'technical': { csat: 91, volume: 200 }
    },
    trends: [
      { week: 'W21', csat: 84 },
      { week: 'W22', csat: 85 },
      { week: 'W23', csat: 86 },
      { week: 'W24', csat: 87 }
    ],
    factors: {
      responseTime: { impact: 35, correlation: -0.42 },
      agentKnowledge: { impact: 28, correlation: 0.65 },
      resolutionRate: { impact: 25, correlation: 0.58 },
      empathy: { impact: 12, correlation: 0.72 }
    }
  });
});

// Competitive intelligence from feedback
app.get('/api/competitive', (req: Request, res: Response) => {
  res.json({
    mentions: [
      { competitor: 'SalesForge', mentioned: 15, sentiment: 'negative', context: 'customers comparing features' },
      { competitor: 'Zoho', mentioned: 12, sentiment: 'neutral', context: 'price comparisons' },
      { competitor: 'HubSpot', mentioned: 8, sentiment: 'positive', context: 'as benchmark for quality' }
    ],
    winBackOpportunities: [
      { competitor: 'SalesForge', customersAtRisk: 5, reason: 'price', offer: 'loyalty discount' },
      { competitor: 'Zoho', customersAtRisk: 3, reason: 'feature gap', offer: 'feature roadmap access' }
    ],
    positioning: {
      ourStrengths: ['AI capabilities', 'Customer support', 'Ease of use'],
      ourWeaknesses: ['Pricing', 'Mobile app', 'Integration count'],
      competitorWeaknesses: ['Complexity', 'Customer service', 'Price']
    }
  });
});

// Feedback summary report
app.get('/api/report', (req: Request, res: Response) => {
  res.json({
    period: 'May 2026',
    overview: {
      totalFeedback: 1650,
      sentimentScore: 78,
      nps: 45,
      csat: 87
    },
    topInsights: [
      { title: 'Mobile app demand', type: 'feature_request', affected: 45 },
      { title: 'Support team praised', type: 'praise', affected: 38 },
      { title: 'Pricing concerns', type: 'complaint', affected: 28 }
    ],
    trends: {
      sentiment: 'improving (+5%)',
      volume: 'increasing (+15%)',
      nps: 'stable'
    },
    actionItems: [
      { priority: 'high', action: 'Evaluate mobile app development', impact: 'retention' },
      { priority: 'medium', action: 'Review pricing strategy', impact: 'acquisition' },
      { priority: 'low', action: 'Document support best practices', impact: 'scalability' }
    ],
    recommendedNextSteps: [
      'Share insights with product team',
      'Review pricing tiers with finance',
      'Create mobile app user research study'
    ]
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'feedback-analyzer',
    port: PORT,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`Feedback Analyzer running on port ${PORT}`);
  console.log('Role: Sentiment analysis, insights, trend detection');
});

export default app;
