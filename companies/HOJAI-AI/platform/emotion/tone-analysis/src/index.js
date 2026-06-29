import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4767;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Sales tone patterns
const SALES_TONES = {
  opening: ['hello', 'hi', 'good morning', 'how are you'],
  qualification: ['need', 'looking for', 'budget', 'timeline', 'decision'],
  objection: ['but', 'however', 'concern', 'worry', 'expensive', 'too much'],
  negotiation: ['discount', 'price', 'deal', 'offer', 'compromise'],
  closing: ['great', 'perfect', 'deal', 'let's do it', 'sign'],
  rapport: ['understand', 'appreciate', 'helpful', 'great talking', 'enjoyed']
};

// Analyze sales conversation
function analyzeTone(conversation) {
  const results = {
    overallTone: 'neutral',
    tones: {},
    sentiment: 0,
    engagement: 0,
    objections: [],
    opportunities: []
  };

  const text = conversation.toLowerCase();

  // Detect tones
  for (const [tone, keywords] of Object.entries(SALES_TONES)) {
    const matches = keywords.filter(k => text.includes(k)).length;
    results.tones[tone] = matches;
  }

  // Calculate sentiment
  const positive = ['great', 'perfect', 'excellent', 'love', 'fantastic'];
  const negative = ['concern', 'worry', 'expensive', 'too much', 'but'];
  let posCount = 0, negCount = 0;

  for (const word of positive) {
    if (text.includes(word)) posCount++;
  }
  for (const word of negative) {
    if (text.includes(word)) negCount++;
  }

  results.sentiment = posCount > negCount ? 'positive' : posCount < negCount ? 'negative' : 'neutral';

  // Detect objections
  if (results.tones.objection > 0) {
    results.objections.push('Price objection detected');
  }
  if (results.tones.objection > 2) {
    results.objections.push('Multiple objections - may need escalation');
  }

  // Detect opportunities
  if (results.tones.qualification > 2) {
    results.opportunities.push('Lead is qualified');
  }
  if (results.tones.closing > 0) {
    results.opportunities.push('Closing signals detected');
  }

  // Engagement score
  results.engagement = Math.min(1, conversation.split(/\s+/).length / 100);

  return results;
}

// Generate coaching tips
function generateTips(toneAnalysis) {
  const tips = [];

  if (toneAnalysis.objections.length > 0) {
    tips.push('Address objections empathetically before continuing');
  }
  if (toneAnalysis.tones.opening < 1) {
    tips.push('Build more rapport at the opening');
  }
  if (toneAnalysis.tones.qualification < 2) {
    tips.push('Ask more qualifying questions');
  }
  if (toneAnalysis.sentiment === 'negative') {
    tips.push('Focus on value proposition');
  }
  if (toneAnalysis.tones.closing === 0 && toneAnalysis.tones.qualification > 3) {
    tips.push('Look for closing signals');
  }

  return tips;
}

app.post('/analyze', (req, res) => {
  const { conversation } = req.body;

  if (!conversation) {
    return res.status(400).json({ error: 'Conversation required' });
  }

  const toneAnalysis = analyzeTone(conversation);
  const tips = generateTips(toneAnalysis);

  res.json({
    conversation: conversation.substring(0, 100) + '...',
    analysis: toneAnalysis,
    coachingTips: tips
  });
});

app.get('/tones', (req, res) => {
  res.json({
    tones: Object.keys(SALES_TONES),
    keywords: SALES_TONES
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tone-analysis', port: PORT });
});

app.listen(PORT, () => console.log(`Tone Analysis running on port ${PORT}`));
export default app;
