/**
 * RTMN Sales Copilot Service
 *
 * Port: 4928
 * Purpose: AI-powered sales assistance for sales teams
 *
 * Features:
 * - Lead Prioritization
 * - Talking Points Generation
 * - Recommendations
 * - Email Generation
 * - Meeting Preparation
 * - Competitive Intelligence
 * - Sales Forecasting
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.SALES_COPILOT_PORT || 4928;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// DATA STORES
// ============================================================

const suggestions = new Map();
const templates = new Map();
const competitors = new Map();

// Sample data
const sampleCompetitors = [
  { id: 'comp-001', name: 'Zendesk', strengths: ['Brand recognition', 'Market presence'], weaknesses: ['Expensive', 'Complex setup'] },
  { id: 'comp-002', name: 'Salesforce', strengths: ['CRM integration', 'Enterprise features'], weaknesses: ['Steep learning curve', 'High TCO'] },
  { id: 'comp-003', name: 'Freshdesk', strengths: ['Affordable', 'Easy to use'], weaknesses: ['Limited customization', 'Basic features'] }
];
sampleCompetitors.forEach(c => competitors.set(c.id, c));

// Sample templates
templates.set('discovery', {
  id: 'discovery',
  name: 'Discovery Questions',
  category: 'meeting',
  content: [
    'What are your current pain points?',
    'How are you solving this problem today?',
    'What would success look like?',
    'Who else is involved in this decision?',
    'What is your timeline?'
  ]
});

templates.set('objection-handling', {
  id: 'objection-handling',
  name: 'Objection Handling',
  category: 'objection',
  content: {
    price: 'I understand budget is important. Let me show you how our ROI can offset this cost within 6 months...',
    timing: 'I hear you on timing. What if we started with a pilot that shows value first?',
    competitor: 'We understand you are evaluating options. What would make you choose us over them?'
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Sales Copilot',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      suggestions: suggestions.size,
      templates: templates.size,
      competitors: competitors.size
    }
  });
});

// ============================================================
// LEAD PRIORITIZATION
// ============================================================

app.post('/api/prioritize', (req, res) => {
  const { leads } = req.body;

  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ success: false, error: 'Leads array required' });
  }

  // Score leads
  const scored = leads.map(lead => {
    let score = 50; // Base score

    // Company size
    if (lead.employees > 1000) score += 20;
    else if (lead.employees > 500) score += 15;
    else if (lead.employees > 100) score += 10;

    // Budget indicators
    if (lead.budget) score += 15;
    if (lead.expressedNeed) score += 20;

    // Engagement
    if (lead.websiteVisits > 5) score += 10;
    if (lead.emailOpens > 3) score += 5;
    if (lead.demoRequested) score += 15;

    // Industry fit
    if (lead.industry === 'Technology' || lead.industry === 'Finance') score += 10;

    // Decision maker
    if (lead.title?.match(/director|vp|cto|cfo|ceo/i)) score += 15;

    return {
      ...lead,
      score: Math.min(100, score),
      priority: score >= 80 ? 'hot' : score >= 60 ? 'warm' : 'cold',
      reasons: getScoreReasons(lead, score)
    };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  res.json({
    success: true,
    prioritizedLeads: scored,
    summary: {
      hot: scored.filter(l => l.priority === 'hot').length,
      warm: scored.filter(l => l.priority === 'warm').length,
      cold: scored.filter(l => l.priority === 'cold').length
    }
  });
});

// ============================================================
// TALKING POINTS
// ============================================================

app.post('/api/talking-points', (req, res) => {
  const { lead, context } = req.body;

  if (!lead) {
    return res.status(400).json({ success: false, error: 'Lead required' });
  }

  const talkingPoints = [];

  // Industry-specific points
  if (lead.industry) {
    talkingPoints.push({
      type: 'industry',
      title: `${lead.industry} Trends`,
      points: [
        `The ${lead.industry} sector is seeing 23% YoY growth`,
        `Companies in ${lead.industry} are prioritizing digital transformation`
      ]
    });
  }

  // Pain point suggestions
  talkingPoints.push({
    type: 'pain',
    title: 'Common Pain Points',
    points: [
      'Manual processes taking too much time?',
      'Data scattered across multiple tools?',
      'Team struggling with coordination?'
    ]
  });

  // Value props
  talkingPoints.push({
    type: 'value',
    title: 'Key Value Propositions',
    points: [
      'Reduce operational costs by 40%',
      'Increase team productivity by 60%',
      'Real-time visibility into operations'
    ]
  });

  // Questions to ask
  talkingPoints.push({
    type: 'question',
    title: 'Discovery Questions',
    points: templates.get('discovery')?.content || []
  });

  res.json({
    success: true,
    talkingPoints,
    suggestedApproach: lead.priority === 'hot' ? 'Close quickly' : lead.priority === 'warm' ? 'Nurture with value' : 'Educate and engage'
  });
});

// ============================================================
// RECOMMENDATIONS
// ============================================================

app.post('/api/recommend', (req, res) => {
  const { customerId, opportunityId, context } = req.body;

  const recommendations = [];

  // Based on deal stage
  if (context?.stage === 'discovery') {
    recommendations.push({
      type: 'action',
      priority: 'high',
      title: 'Schedule Discovery Call',
      description: 'Book a 30-minute discovery call to understand needs',
      nextStep: 'Send calendar invite'
    });
    recommendations.push({
      type: 'content',
      priority: 'medium',
      title: 'Send Case Study',
      description: 'Share relevant case study from same industry',
      content: 'Case_Study_Retail.pdf'
    });
  }

  if (context?.stage === 'proposal') {
    recommendations.push({
      type: 'action',
      priority: 'high',
      title: 'Send Custom Proposal',
      description: 'Personalize proposal with specific pain points',
      nextStep: 'Include ROI calculator'
    });
    recommendations.push({
      type: 'action',
      priority: 'medium',
      title: 'Arrange Executive Sponsor',
      description: 'Get executive involved to accelerate',
      nextStep: 'Request intro call'
    });
  }

  if (context?.stage === 'negotiation') {
    recommendations.push({
      type: 'action',
      priority: 'high',
      title: 'Prepare Negotiation Points',
      description: 'Know your walk-away price and key concessions',
      nextStep: 'Create negotiation brief'
    });
    recommendations.push({
      type: 'alert',
      priority: 'medium',
      title: 'Competitor Mentioned',
      description: 'Customer mentioned competitor. Prepare battle cards.',
      nextStep: 'Review competitor intel'
    });
  }

  // General recommendations
  recommendations.push({
    type: 'insight',
    priority: 'low',
    title: 'Best Time to Follow Up',
    description: 'Tuesday-Thursday, 10AM-12PM has 35% higher response rate'
  });

  res.json({
    success: true,
    recommendations
  });
});

// ============================================================
// EMAIL GENERATION
// ============================================================

app.post('/api/email/generate', (req, res) => {
  const { type, recipient, context } = req.body;

  if (!type || !recipient) {
    return res.status(400).json({ success: false, error: 'Type and recipient required' });
  }

  let subject, body;

  // Email templates
  switch (type) {
    case 'intro':
      subject = `Quick ${context?.product || 'Solution'} Question`;
      body = `Hi ${recipient.name},

I noticed ${recipient.company} is ${context?.observation || 'growing rapidly'} and wanted to share how we've helped similar ${recipient.industry || 'companies'} achieve:

✓ 40% reduction in operational costs
✓ 60% faster team collaboration
✓ Real-time visibility into performance

Would you be open to a quick 15-minute call this week?

Best,
${context?.repName || '[Your Name]'}`;
      break;

    case 'followup':
      subject = `Following Up - ${context?.topic || 'Our Conversation'}`;
      body = `Hi ${recipient.name},

I wanted to follow up on our recent conversation about ${context?.topic || 'how we can help'} ${recipient.company}.

Have you had a chance to review the materials I sent? I'm happy to address any questions or schedule a deeper dive.

What does your calendar look like this week?

Best,
${context?.repName || '[Your Name]'}`;
      break;

    case 'proposal':
      subject = `Proposal for ${recipient.company} - Next Steps`;
      body = `Hi ${recipient.name},

Attached is the custom proposal for ${recipient.company} based on our discussions.

Key highlights:
• Solution tailored to your ${context?.useCase || 'specific needs'}
• ${context?.pricing || 'Competitive pricing'} with flexible terms
• Implementation plan with clear milestones

Let's schedule a call to walk through this and answer any questions.

Best,
${context?.repName || '[Your Name]'}`;
      break;

    case 'meeting':
      subject = `Meeting Confirmed - ${recipient.company}`;
      body = `Hi ${recipient.name},

Great speaking with you today! Here's a summary:

📅 Date: ${context?.date || '[Date]'}
⏰ Time: ${context?.time || '[Time]'}
📍 Topic: ${context?.topic || 'Discovery Call'}

I'll send a calendar invite shortly.

Looking forward to it!

Best,
${context?.repName || '[Your Name]'}`;
      break;

    default:
      subject = `Quick Question`;
      body = `Hi ${recipient.name},

${context?.message || 'I hope this finds you well.'}

Best,
${context?.repName || '[Your Name]'}`;
  }

  res.json({
    success: true,
    email: { subject, body }
  });
});

// ============================================================
// COMPETITIVE INTELLIGENCE
// ============================================================

app.get('/api/competitors', (req, res) => {
  res.json({
    success: true,
    competitors: Array.from(competitors.values())
  });
});

app.get('/api/competitors/:id', (req, res) => {
  const competitor = competitors.get(req.params.id);
  if (!competitor) {
    return res.status(404).json({ success: false, error: 'Competitor not found' });
  }

  // Generate battle card
  const battleCard = {
    competitor: competitor.name,
    ourStrengths: [
      '40% faster implementation',
      '24/7 customer support',
      'Lower total cost of ownership'
    ],
    theirWeaknesses: competitor.weaknesses,
    objectionResponses: {
      'They are cheaper': 'Our ROI shows we pay for ourselves in 6 months. Their hidden costs include implementation and training.',
      'They have more features': 'We focus on the 20% of features that drive 80% of results. Less complexity = faster adoption.',
      'We are happy with them': 'That is great to hear. Many of our customers said the same before switching. Can I show you why?'
    },
    talk track: `When customer mentions ${competitor.name}: I understand they are a solid option. What I hear from companies that switch to us is...`
  };

  res.json({
    success: true,
    competitor,
    battleCard
  });
});

// ============================================================
// MEETING PREPARATION
// ============================================================

app.post('/api/meeting/prepare', (req, res) => {
  const { lead, opportunity } = req.body;

  const prep = {
    agenda: [
      'Introductions (5 min)',
      'Understand current state (15 min)',
      'Discuss challenges (15 min)',
      'Demo relevant features (10 min)',
      'Next steps (5 min)'
    ],
    talkingPoints: templates.get('discovery')?.content || [],
    questionsToAsk: [
      'What does success look like in 6 months?',
      'What is blocking you from achieving this today?',
      'Who will be using this daily?',
      'What is your decision timeline?'
    ],
    objectionPrep: Object.entries(templates.get('objection-handling')?.content || {}).map(([topic, response]) => ({
      topic,
      response
    })),
    nextSteps: [
      'Send follow-up email within 24 hours',
      'Send case study if appropriate',
      'Schedule next call'
    ],
    tips: [
      'Listen more than you talk',
      'Take notes on specific pain points',
      'Ask about budget and timeline early'
    ]
  };

  res.json({
    success: true,
    preparation: prep
  });
});

// ============================================================
// FORECASTING
// ============================================================

app.post('/api/forecast', (req, res) => {
  const { opportunities } = req.body;

  if (!opportunities || !Array.isArray(opportunities)) {
    return res.status(400).json({ success: false, error: 'Opportunities array required' });
  }

  const forecast = {
    total: opportunities.length,
    pipeline: {
      value: opportunities.reduce((sum, o) => sum + (o.value || 0), 0),
      weighted: opportunities.reduce((sum, o) => sum + (o.value || 0) * (o.probability || 0.5), 0)
    },
    byStage: {},
    byMonth: {},
    riskAdjustment: 0.85,
    recommendedForecast: opportunities.reduce((sum, o) => sum + (o.value || 0) * (o.probability || 0.5) * 0.85, 0)
  };

  // By stage
  opportunities.forEach(o => {
    const stage = o.stage || 'unknown';
    if (!forecast.byStage[stage]) forecast.byStage[stage] = { count: 0, value: 0 };
    forecast.byStage[stage].count++;
    forecast.byStage[stage].value += o.value || 0;
  });

  // By month
  opportunities.forEach(o => {
    if (o.expectedClose) {
      const month = new Date(o.expectedClose).toISOString().slice(0, 7);
      if (!forecast.byMonth[month]) forecast.byMonth[month] = { count: 0, value: 0 };
      forecast.byMonth[month].count++;
      forecast.byMonth[month].value += (o.value || 0) * (o.probability || 0.5);
    }
  });

  res.json({
    success: true,
    forecast
  });
});

// ============================================================
// SALES PLAYBOOK
// ============================================================

app.get('/api/playbook/:topic', (req, res) => {
  const topic = req.params.topic;

  const playbooks = {
    cold_outreach: {
      title: 'Cold Outreach Playbook',
      steps: [
        'Research prospect on LinkedIn',
        'Find mutual connections',
        'Craft personalized message',
        'Send via email or LinkedIn',
        'Follow up 3 times over 2 weeks'
      ],
      templates: ['Email', 'LinkedIn', 'Phone script']
    },
    discovery: {
      title: 'Discovery Call Playbook',
      steps: [
        'Build rapport (2 min)',
        'Confirm agenda (1 min)',
        'Ask open-ended questions',
        'Take detailed notes',
        'Summarize understanding',
        'Propose next steps'
      ],
      questions: templates.get('discovery')?.content || []
    },
    demo: {
      title: 'Demo Playbook',
      steps: [
        'Confirm their goals',
        'Tailor demo to their use case',
        'Show ROI early',
        'Handle objections gracefully',
        'Offer trial or pilot',
        'Summarize value delivered'
      ],
      tips: ['Keep it under 30 minutes', 'Focus on their pain points', 'Have a backup plan']
    },
    objection_handling: {
      title: 'Objection Handling Playbook',
      objections: templates.get('objection-handling')?.content || {}
    },
    closing: {
      title: 'Closing Techniques',
      techniques: [
        { name: 'Assumptive Close', description: 'Assume the deal is done and move to next steps' },
        { name: 'Urgency Close', description: 'Create time-based urgency' },
        { name: 'Alternative Close', description: 'Offer two options, both leading to yes' },
        { name: 'Summary Close', description: 'Recap all value delivered' }
      ]
    }
  };

  const playbook = playbooks[topic];
  if (!playbook) {
    return res.status(404).json({ success: false, error: 'Playbook not found' });
  }

  res.json({
    success: true,
    playbook
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getScoreReasons(lead, score) {
  const reasons = [];

  if (lead.employees > 500) reasons.push('Large company size');
  if (lead.budget) reasons.push('Has budget');
  if (lead.expressedNeed) reasons.push('Expressed need');
  if (lead.demoRequested) reasons.push('Requested demo');
  if (lead.title?.match(/director|vp|cto|cfo|ceo/i)) reasons.push('Decision maker level');
  if (lead.websiteVisits > 5) reasons.push('High engagement');

  return reasons;
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
  console.log(`[Sales Copilot] Service started on port ${PORT}`);
  console.log(`[Sales Copilot] ${templates.size} templates loaded`);
  console.log(`[Sales Copilot] ${competitors.size} competitors available`);
});

module.exports = app;
