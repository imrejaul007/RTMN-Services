/**
 * Conversation Intelligence - SalesOS
 *
 * Gong-like conversation intelligence:
 * - Transcription (placeholder for Whisper/Deepgram)
 * - Sentiment analysis
 * - Competitor detection
 * - Objection detection
 * - Deal coaching
 *
 * Port: 5066
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5066;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================================
// STORAGE
// ============================================================

const transcripts = new Map();
const recordings = new Map();

// Sample transcript
const sampleTranscript = {
  id: uuidv4(),
  meetingId: 'MTG001',
  opportunityId: 'OPP001',
  participants: ['rahul@techcorp.in', 'sales@hojai.ai'],
  title: 'TechCorp Q2 Review',
  duration: 2700,
  content: `Rahul: Hi, thanks for joining. We've had a great quarter with your platform.
Sales: Great to hear! Can you share some specifics?
Rahul: We grew our user base by 40% and improved retention. The analytics dashboard is excellent.
Sales: That's impressive! Any challenges?
Rahul: The integration with our existing systems took longer than expected. But overall, very satisfied.
Sales: Glad to hear the outcome was positive. What about expansion?
Rahul: We're considering adding the GCC package. What's the pricing?
Sales: For GCC, it's typically an additional 30% on top of your current plan.
Rahul: That's more than we expected. We also looked at Salesforce, but they quoted even higher.
Sales: Understood. We can offer a 15% discount if you commit to annual billing.
Rahul: That helps. I'll need to discuss with our CFO. Can you send a formal proposal?
Sales: Absolutely. I'll send that today.
Rahul: Perfect. One more thing - any plans for better mobile support?
Sales: Yes! We're launching mobile v2 next month with offline support.
Rahul: That would be very helpful for our field team.
Sales: Great. I'll follow up next week with the proposal.
Rahul: Sounds good. Thanks!`,
  sentiment: { overall: 'positive', score: 72 },
  competitors: [{ name: 'Salesforce', mentions: 1, context: 'pricing comparison' }],
  objections: [{ text: 'pricing', severity: 'medium', response: 'Offered 15% discount' }],
  buyingSignals: [
    { text: 'GCC expansion', type: 'expansion_interest' },
    { text: 'CFO discussion needed', type: 'decision_progress' },
    { text: 'formal proposal requested', type: 'commitment' },
  ],
  keyMoments: [
    { timestamp: 300, type: 'pricing', description: 'GCC pricing discussed' },
    { timestamp: 600, type: 'competitor', description: 'Salesforce comparison' },
    { timestamp: 900, type: 'commitment', description: 'Discount offered' },
    { timestamp: 1500, type: 'question', description: 'Mobile support inquiry' },
  ],
  actionItems: [
    { id: uuidv4(), task: 'Send formal proposal for GCC expansion', assignedTo: 'sales@hojai.ai', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: 'pending' },
    { id: uuidv4(), task: 'Follow up with TechCorp next week', assignedTo: 'sales@hojai.ai', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'pending' },
  ],
  coaching: {
    dealHealth: 'healthy',
    talkingPoints: ['Highlight mobile v2 launch', 'Prepare GCC ROI analysis', 'Address CFO concerns'],
    objectionResponses: ['Offered annual discount - good response'],
    recommendedNextSteps: ['Send proposal within 24 hours', 'Schedule CFO follow-up'],
  },
  riskScore: 25,
  createdAt: new Date(),
};

transcripts.set(sampleTranscript.id, sampleTranscript);

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Conversation Intelligence',
    version: '1.0.0',
    port: PORT,
    transcriptsCount: transcripts.size,
    recordingsCount: recordings.size,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// TRANSCRIPTION
// ============================================================

/**
 * POST /transcribe
 * Submit audio for transcription (placeholder - would connect to Whisper/Deepgram)
 */
app.post('/transcribe', async (req, res) => {
  const { audioUrl, meetingId, participants, title } = req.body;

  // Placeholder for actual transcription
  const transcript = {
    id: uuidv4(),
    meetingId,
    participants: participants || [],
    title: title || 'Untitled Meeting',
    duration: 0,
    content: '',
    sentiment: { overall: 'neutral', score: 50 },
    competitors: [],
    objections: [],
    buyingSignals: [],
    keyMoments: [],
    actionItems: [],
    coaching: { dealHealth: 'unknown', talkingPoints: [], objectionResponses: [], recommendedNextSteps: [] },
    riskScore: 50,
    status: 'transcribed',
    createdAt: new Date(),
  };

  transcripts.set(transcript.id, transcript);

  res.json({
    success: true,
    transcriptId: transcript.id,
    message: 'Transcription submitted. Use POST /transcripts/:id/analyze to process.',
    transcript,
  });
});

// ============================================================
// ANALYSIS
// ============================================================

/**
 * POST /transcripts/:id/analyze
 * Analyze a transcript for insights
 */
app.post('/transcripts/:id/analyze', async (req, res) => {
  const transcript = transcripts.get(req.params.id);
  if (!transcript) {
    return res.status(404).json({ error: 'Transcript not found' });
  }

  // AI Analysis
  const analysis = analyzeTranscript(transcript);

  Object.assign(transcript, analysis);
  transcript.status = 'analyzed';
  transcripts.set(transcript.id, transcript);

  res.json({ success: true, analysis, transcript });
});

/**
 * Analyze transcript content
 */
function analyzeTranscript(transcript) {
  const content = (transcript.content || '').toLowerCase();

  // Competitor detection
  const competitorKeywords = ['salesforce', 'hubspot', 'oracle', 'sap', 'dynamics', 'zoho', 'pipedrive', 'microsoft'];
  const competitors = [];
  competitorKeywords.forEach(comp => {
    const regex = new RegExp(`\\b${comp}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) {
      competitors.push({
        name: comp.charAt(0).toUpperCase() + comp.slice(1),
        mentions: matches.length,
        context: 'mentioned in conversation',
      });
    }
  });

  // Objection detection
  const objectionKeywords = [
    { pattern: /price|cost|expensive|too much|budget/, text: 'pricing', severity: 'medium' },
    { pattern: /competitor|alternative|also looked|considering/, text: 'competitor_comparison', severity: 'low' },
    { pattern: /need to think|not now|later|maybe/, text: 'timing', severity: 'medium' },
    { pattern: /not sure|uncertain|doubt/, text: 'uncertainty', severity: 'medium' },
    { pattern: /legal|compliance|security|privacy/, text: 'compliance', severity: 'high' },
    { pattern: /different|don\'t need|won\'t work/, text: 'fit_concern', severity: 'high' },
  ];

  const objections = [];
  objectionKeywords.forEach(obj => {
    if (obj.pattern.test(content)) {
      objections.push({
        text: obj.text,
        severity: obj.severity,
        response: getDefaultResponse(obj.text),
      });
    }
  });

  // Buying signals
  const buyingKeywords = [
    { pattern: /expand|add|grow|increase/, type: 'expansion_interest' },
    { pattern: /cfo|budget approved|finance/, type: 'decision_progress' },
    { pattern: /proposal|quote|contract/, type: 'commitment' },
    { pattern: /timeline|when|schedule|deadline/, type: 'urgency' },
    { pattern: /team|everyone|company-wide/, type: 'scope_expansion' },
    { pattern: /thank|great|perfect|excellent/, type: 'positive_sentiment' },
  ];

  const buyingSignals = [];
  buyingKeywords.forEach(sig => {
    if (sig.pattern.test(content)) {
      buyingSignals.push({ text: sig.type.replace(/_/g, ' '), type: sig.type });
    }
  });

  // Sentiment analysis (simplified)
  const positiveWords = ['great', 'excellent', 'love', 'perfect', 'amazing', 'fantastic', 'happy', 'satisfied', 'impressed', 'helpful'];
  const negativeWords = ['bad', 'poor', 'hate', 'terrible', 'disappointed', 'frustrated', 'difficult', 'challenge', 'problem', 'issue'];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) positiveCount += matches.length;
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) negativeCount += matches.length;
  });

  const sentimentScore = 50 + (positiveCount * 5) - (negativeCount * 8);
  const sentiment = sentimentScore > 60 ? 'positive' : sentimentScore < 40 ? 'negative' : 'neutral';

  // Key moments (simplified)
  const keyMoments = [];
  if (competitors.length > 0) {
    keyMoments.push({ timestamp: content.indexOf(competitorKeywords.find(c => content.includes(c))) || 600, type: 'competitor', description: 'Competitor mentioned' });
  }
  if (objections.some(o => o.text === 'pricing')) {
    keyMoments.push({ timestamp: 900, type: 'pricing', description: 'Pricing discussion' });
  }
  if (buyingSignals.some(b => b.type === 'commitment')) {
    keyMoments.push({ timestamp: content.length / 2, type: 'commitment', description: 'Commitment signal' });
  }

  // Risk score
  let riskScore = 30;
  if (competitors.length > 0) riskScore += 15;
  if (objections.some(o => o.severity === 'high')) riskScore += 20;
  if (objections.some(o => o.severity === 'medium')) riskScore += 10;
  if (negativeCount > positiveCount) riskScore += 15;
  if (buyingSignals.length === 0) riskScore += 20;
  if (buyingSignals.some(b => b.type === 'commitment')) riskScore -= 20;
  riskScore = Math.min(100, Math.max(0, riskScore));

  return {
    sentiment: { overall: sentiment, score: Math.min(100, Math.max(0, sentimentScore)) },
    competitors,
    objections,
    buyingSignals,
    keyMoments,
    riskScore,
    coaching: generateCoaching({ sentiment, competitors, objections, buyingSignals, riskScore }),
  };
}

function getDefaultResponse(objectionType) {
  const responses = {
    pricing: 'Offered discount or highlighted ROI',
    competitor_comparison: 'Emphasized unique differentiators',
    timing: 'Created urgency with deadlines or incentives',
    uncertainty: 'Provided case studies and references',
    compliance: 'Shared security certifications and compliance docs',
    fit_concern: 'Demonstrated flexibility and customization',
  };
  return responses[objectionType] || 'Needs personalized response';
}

function generateCoaching(analysis) {
  const { sentiment, competitors, objections, buyingSignals, riskScore } = analysis;

  const coaching = {
    dealHealth: riskScore < 30 ? 'healthy' : riskScore < 60 ? 'at_risk' : 'critical',
    talkingPoints: [],
    objectionResponses: [],
    recommendedNextSteps: [],
  };

  // Talking points
  if (competitors.length > 0) {
    coaching.talkingPoints.push(`Address ${competitors[0].name} comparison - emphasize unique value`);
  }
  if (sentiment === 'positive') {
    coaching.talkingPoints.push('Leverage positive sentiment to advance deal');
  }
  if (buyingSignals.some(b => b.type === 'expansion_interest')) {
    coaching.talkingPoints.push('Explore expansion scope');
  }

  // Objection responses
  objections.forEach(o => {
    coaching.objectionResponses.push(`${o.text}: ${o.response}`);
  });

  // Next steps
  if (buyingSignals.some(b => b.type === 'commitment')) {
    coaching.recommendedNextSteps.push('Send proposal within 24 hours');
    coaching.recommendedNextSteps.push('Schedule follow-up with decision maker');
  }
  if (objections.some(o => o.severity === 'high')) {
    coaching.recommendedNextSteps.push('Address high-severity objections first');
  }
  coaching.recommendedNextSteps.push('Send meeting summary with action items');

  return coaching;
}

// ============================================================
// CRUD
// ============================================================

app.get('/transcripts', (req, res) => {
  const { limit = 50, status, opportunityId } = req.query;
  let all = Array.from(transcripts.values());

  if (status) all = all.filter(t => t.status === status);
  if (opportunityId) all = all.filter(t => t.opportunityId === opportunityId);

  res.json({ success: true, count: all.length, transcripts: all.slice(0, Number(limit)) });
});

app.get('/transcripts/:id', (req, res) => {
  const transcript = transcripts.get(req.params.id);
  if (!transcript) return res.status(404).json({ error: 'Transcript not found' });
  res.json({ success: true, transcript });
});

// ============================================================
// COACHING
// ============================================================

app.post('/transcripts/:id/coach', (req, res) => {
  const transcript = transcripts.get(req.params.id);
  if (!transcript) return res.status(404).json({ error: 'Transcript not found' });

  const coaching = transcript.coaching || generateCoaching(transcript);
  res.json({ success: true, coaching });
});

app.get('/coach/deal/:opportunityId', (req, res) => {
  const dealTranscripts = Array.from(transcripts.values())
    .filter(t => t.opportunityId === req.params.opportunityId);

  if (dealTranscripts.length === 0) {
    return res.json({ success: true, coaching: { dealHealth: 'unknown', message: 'No conversations recorded' } });
  }

  // Aggregate insights
  const avgRisk = dealTranscripts.reduce((sum, t) => sum + (t.riskScore || 50), 0) / dealTranscripts.length;
  const allCompetitors = dealTranscripts.flatMap(t => t.competitors || []).map(c => c.name);
  const allObjections = dealTranscripts.flatMap(t => t.objections || []);
  const allBuyingSignals = dealTranscripts.flatMap(t => t.buyingSignals || []);

  const coaching = {
    dealHealth: avgRisk < 30 ? 'healthy' : avgRisk < 60 ? 'at_risk' : 'critical',
    conversationsAnalyzed: dealTranscripts.length,
    averageRiskScore: avgRisk.toFixed(0),
    competitorsMentioned: [...new Set(allCompetitors)],
    topObjections: allObjections.reduce((acc, o) => {
      acc[o.text] = (acc[o.text] || 0) + 1;
      return acc;
    }, {}),
    buyingSignals: [...new Set(allBuyingSignals.map(b => b.type))],
    talkingPoints: dealTranscripts.flatMap(t => t.coaching?.talkingPoints || []).slice(0, 5),
    recommendedNextSteps: dealTranscripts.flatMap(t => t.coaching?.recommendedNextSteps || []).slice(0, 5),
  };

  res.json({ success: true, coaching });
});

// ============================================================
// RECORDINGS (Metadata)
// ============================================================

app.post('/recordings', (req, res) => {
  const recording = {
    id: uuidv4(),
    url: req.body.url,
    meetingId: req.body.meetingId,
    opportunityId: req.body.opportunityId,
    participants: req.body.participants || [],
    duration: req.body.duration || 0,
    status: 'pending',
    transcriptId: null,
    createdAt: new Date(),
  };

  recordings.set(recording.id, recording);
  res.status(201).json({ success: true, recording });
});

app.get('/recordings', (req, res) => {
  const all = Array.from(recordings.values());
  res.json({ success: true, count: all.length, recordings: all });
});

// ============================================================
// ANALYTICS
// ============================================================

app.get('/analytics/sentiment', (req, res) => {
  const all = Array.from(transcripts.values()).filter(t => t.sentiment);

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  const avgScore = all.reduce((sum, t) => sum + (t.sentiment?.score || 50), 0) / (all.length || 1);

  all.forEach(t => {
    const sentiment = t.sentiment?.overall || 'neutral';
    sentimentCounts[sentiment]++;
  });

  res.json({
    success: true,
    totalConversations: all.length,
    averageSentiment: avgScore.toFixed(0),
    distribution: sentimentCounts,
  });
});

app.get('/analytics/competitors', (req, res) => {
  const all = Array.from(transcripts.values());

  const competitorCounts = {};
  all.forEach(t => {
    (t.competitors || []).forEach(c => {
      competitorCounts[c.name] = (competitorCounts[c.name] || 0) + c.mentions;
    });
  });

  const sorted = Object.entries(competitorCounts)
    .map(([name, count]) => ({ name, mentions: count }))
    .sort((a, b) => b.mentions - a.mentions);

  res.json({ success: true, competitors: sorted });
});

app.get('/analytics/risk', (req, res) => {
  const all = Array.from(transcripts.values());

  const avgRisk = all.length > 0
    ? all.reduce((sum, t) => sum + (t.riskScore || 50), 0) / all.length
    : 50;

  const healthy = all.filter(t => t.riskScore < 30).length;
  const atRisk = all.filter(t => t.riskScore >= 30 && t.riskScore < 60).length;
  const critical = all.filter(t => t.riskScore >= 60).length;

  res.json({
    success: true,
    averageRiskScore: avgRisk.toFixed(0),
    distribution: { healthy, at_risk: atRisk, critical },
  });
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║  Conversation Intelligence - SalesOS v1.0      ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Transcripts: ${transcripts.size}                                   ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
