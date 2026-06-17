import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Sentiment analysis (mock)
function analyzeSentiment(text: string): { sentiment: string; score: number; emotions: Record<string, number> } {
  const positiveWords = ['love', 'great', 'excellent', 'amazing', 'good', 'best', 'happy', 'wonderful', 'fantastic', 'awesome'];
  const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'worst', 'horrible', 'poor', 'disappointed', 'frustrated', 'angry'];
  const neutralWords = ['okay', 'fine', 'normal', 'regular', 'standard'];

  const textLower = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(w => { if (textLower.includes(w)) positiveCount++; });
  negativeWords.forEach(w => { if (textLower.includes(w)) negativeCount++; });

  let sentiment: string;
  let score: number;

  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    score = Math.min((positiveCount - negativeCount) / 5 * 100, 100);
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    score = Math.min((negativeCount - positiveCount) / 5 * 100, 100);
  } else {
    sentiment = 'neutral';
    score = 50;
  }

  // Mock emotions
  const emotions: Record<string, number> = {
    joy: Math.random() * 40 + (sentiment === 'positive' ? 40 : 0),
    trust: Math.random() * 30 + 20,
    fear: Math.random() * 20,
    surprise: Math.random() * 25,
    sadness: Math.random() * 15 + (sentiment === 'negative' ? 20 : 0),
    disgust: Math.random() * 10 + (sentiment === 'negative' ? 15 : 0),
    anger: Math.random() * 10 + (sentiment === 'negative' ? 25 : 0),
    anticipation: Math.random() * 35 + 15
  };

  return { sentiment, score: Math.round(score), emotions };
}

// Topic extraction (mock)
function extractTopics(text: string): { topics: Array<{ topic: string; relevance: number; keywords: string[] }>; categories: string[] } {
  const topicPatterns: Record<string, { keywords: string[]; category: string }> = {
    'Pricing & Cost': {
      keywords: ['price', 'cost', 'expensive', 'cheap', 'budget', 'affordable', 'pricing', 'fee', 'charge', 'worth'],
      category: 'finance'
    },
    'Product Features': {
      keywords: ['feature', 'function', 'capability', 'integration', 'works', 'does', 'can', 'ability'],
      category: 'product'
    },
    'Customer Support': {
      keywords: ['support', 'help', 'service', 'assist', 'response', 'ticket', 'agent', 'representative'],
      category: 'support'
    },
    'Implementation': {
      keywords: ['implement', 'setup', 'configure', 'install', 'deploy', 'onboard', 'integration', 'technical'],
      category: 'technical'
    },
    'Competitor Comparison': {
      keywords: ['compared', 'better', 'worse', 'competitor', 'alternative', 'other', 'versus', 'instead'],
      category: 'competitive'
    },
    'Usability': {
      keywords: ['easy', 'simple', 'intuitive', 'user', 'interface', 'experience', 'learn', 'navigate'],
      category: 'ux'
    },
    'ROI & Results': {
      keywords: ['roi', 'result', 'impact', 'outcome', 'benefit', 'value', 'effective', 'productivity', 'savings'],
      category: 'business'
    },
    'Reliability': {
      keywords: ['reliable', 'stable', 'down', 'uptime', 'crash', 'bug', 'issue', 'problem', 'error'],
      category: 'technical'
    }
  };

  const textLower = text.toLowerCase();
  const topics: Array<{ topic: string; relevance: number; keywords: string[] }> = [];

  for (const [topicName, config] of Object.entries(topicPatterns)) {
    const matchedKeywords = config.keywords.filter(k => textLower.includes(k));
    if (matchedKeywords.length > 0) {
      const relevance = Math.min(matchedKeywords.length / config.keywords.length * 100, 100);
      topics.push({
        topic: topicName,
        relevance: Math.round(relevance),
        keywords: matchedKeywords
      });
    }
  }

  // Sort by relevance
  topics.sort((a, b) => b.relevance - a.relevance);

  // Get unique categories
  const categories = [...new Set(topics.map(t => topicPatterns[t.topic]?.category || 'general'))];

  return { topics: topics.slice(0, 5), categories };
}

// Objection detection (mock)
function detectObjections(text: string): { has_objection: boolean; objections: Array<{ type: string; severity: string; text: string; suggested_response: string }> } {
  const objectionPatterns: Array<{ pattern: RegExp; type: string; severity: string; response: string }> = [
    { pattern: /too (expensive|pricey|costly)/i, type: 'price', severity: 'high', response: 'Focus on ROI and long-term value. Offer flexible pricing tiers or payment plans.' },
    { pattern: /not (in budget|affordable)/i, type: 'budget', severity: 'high', response: 'Discuss timing flexibility or smaller initial implementation.' },
    { pattern: /need to think|consider|review/i, type: 'timing', severity: 'medium', response: 'Identify specific concerns. Offer to schedule follow-up with decision maker.' },
    { pattern: /already (have|using|working with)/i, type: 'competition', severity: 'medium', response: 'Acknowledge their current solution. Focus on differentiated benefits.' },
    { pattern: /don\'t (have time|need)/i, type: 'priority', severity: 'medium', response: 'Align with their goals. Show quick wins and efficiency gains.' },
    { pattern: /won\'t (work|fit|meet)/i, type: 'capability', severity: 'high', response: 'Offer detailed demo addressing specific requirements.' },
    { pattern: /concerned aboutworried about/i, type: 'risk', severity: 'medium', response: 'Provide case studies, testimonials, and guarantees.' },
    { pattern: /not (interested|for us)/i, type: 'interest', severity: 'low', response: 'Ask qualifying questions to understand their priorities.' },
    { pattern: /complicated|complex|difficult/i, type: 'usability', severity: 'medium', response: 'Highlight ease of use, onboarding support, and training resources.' },
    { pattern: /security|privacy|compliance/i, type: 'security', severity: 'high', response: 'Provide security documentation, certifications, and compliance info.' }
  ];

  const objections: Array<{ type: string; severity: string; text: string; suggested_response: string }> = [];

  for (const obj of objectionPatterns) {
    const match = text.match(obj.pattern);
    if (match) {
      // Extract the relevant sentence
      const sentences = text.split(/[.!?]+/);
      const relevantSentence = sentences.find(s => obj.pattern.test(s.trim())) || match[0];

      objections.push({
        type: obj.type,
        severity: obj.severity,
        text: relevantSentence.trim(),
        suggested_response: obj.response
      });
    }
  }

  return {
    has_objection: objections.length > 0,
    objections
  };
}

// POST /analyze/sentiment - Sentiment analysis
router.post('/sentiment', (req: Request, res: Response) => {
  const { text, texts } = req.body;

  if (!text && (!texts || !Array.isArray(texts))) {
    res.status(400).json({ success: false, error: 'text or texts array is required' });
    return;
  }

  if (text) {
    const result = analyzeSentiment(text);
    res.json({
      success: true,
      data: {
        id: randomUUID(),
        ...result,
        analyzed_at: new Date().toISOString()
      }
    });
    return;
  }

  // Batch analysis
  const results = texts.map((t: string, i: number) => ({
    index: i,
    ...analyzeSentiment(t),
    analyzed_at: new Date().toISOString()
  }));

  // Aggregate sentiment
  const positiveCount = results.filter((r: any) => r.sentiment === 'positive').length;
  const negativeCount = results.filter((r: any) => r.sentiment === 'negative').length;
  const neutralCount = results.filter((r: any) => r.sentiment === 'neutral').length;

  res.json({
    success: true,
    data: {
      results,
      aggregate: {
        overall_sentiment: positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral',
        positive_count: positiveCount,
        negative_count: negativeCount,
        neutral_count: neutralCount,
        total: results.length
      }
    }
  });
});

// POST /analyze/topics - Topic extraction
router.post('/topics', (req: Request, res: Response) => {
  const { text, texts } = req.body;

  if (!text && (!texts || !Array.isArray(texts))) {
    res.status(400).json({ success: false, error: 'text or texts array is required' });
    return;
  }

  const inputTexts = text ? [text] : texts;
  const combinedText = inputTexts.join(' ');
  const result = extractTopics(combinedText);

  res.json({
    success: true,
    data: {
      ...result,
      text_count: inputTexts.length,
      analyzed_at: new Date().toISOString()
    }
  });
});

// POST /analyze/objections - Objection detection
router.post('/objections', (req: Request, res: Response) => {
  const { text, texts } = req.body;

  if (!text && (!texts || !Array.isArray(texts))) {
    res.status(400).json({ success: false, error: 'text or texts array is required' });
    return;
  }

  const inputTexts = text ? [text] : texts;
  const allObjections: Array<{ type: string; severity: string; text: string; suggested_response: string; source_index: number }> = [];

  inputTexts.forEach((t: string, i: number) => {
    const result = detectObjections(t);
    result.objections.forEach(obj => {
      allObjections.push({ ...obj, source_index: i });
    });
  });

  res.json({
    success: true,
    data: {
      total_objections: allObjections.length,
      objections: allObjections,
      summary: {
        by_type: allObjections.reduce((acc, obj) => {
          acc[obj.type] = (acc[obj.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        by_severity: allObjections.reduce((acc, obj) => {
          acc[obj.severity] = (acc[obj.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      analyzed_at: new Date().toISOString()
    }
  });
});

export default router;
