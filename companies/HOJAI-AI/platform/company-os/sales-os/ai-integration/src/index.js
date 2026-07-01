/**
 * AI/LLM Integration Layer - SalesOS
 *
 * Connects SalesOS to AI/LLM providers:
 * - OpenAI GPT-4
 * - Claude
 * - Gemini
 * - Local models
 *
 * Port: 5071
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5071;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// AI Provider configurations
const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    defaultModel: 'claude-3-sonnet',
    apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-placeholder',
    endpoint: 'https://api.anthropic.com/v1/messages',
  },
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-pro', 'gemini-ultra'],
    defaultModel: 'gemini-pro',
    apiKey: process.env.GEMINI_API_KEY || 'placeholder',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
};

// Request history
const requests = new Map();

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Integration Layer',
    version: '1.0.0',
    port: PORT,
    providers: Object.keys(AI_PROVIDERS),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// PROVIDERS
// ============================================================

app.get('/providers', (req, res) => {
  const providers = Object.entries(AI_PROVIDERS).map(([id, p]) => ({
    id,
    name: p.name,
    models: p.models,
    defaultModel: p.defaultModel,
    configured: !!p.apiKey,
  }));
  res.json({ success: true, providers });
});

// ============================================================
// AI COMPLETION
// ============================================================

app.post('/complete', async (req, res) => {
  const { provider = 'openai', model, messages, system, temperature = 0.7, maxTokens = 1000 } = req.body;

  const providerConfig = AI_PROVIDERS[provider];
  if (!providerConfig) {
    return res.status(400).json({ error: 'Unknown provider', providers: Object.keys(AI_PROVIDERS) });
  }

  const selectedModel = model || providerConfig.defaultModel;
  const requestId = uuidv4();
  const startTime = Date.now();

  // Build messages with system prompt
  const fullMessages = [];
  if (system) {
    fullMessages.push({ role: 'system', content: system });
  }
  fullMessages.push(...(messages || []));

  try {
    let result;

    if (provider === 'openai') {
      result = await callOpenAI(providerConfig, selectedModel, fullMessages, temperature, maxTokens);
    } else if (provider === 'anthropic') {
      result = await callAnthropic(providerConfig, selectedModel, fullMessages, temperature, maxTokens);
    } else if (provider === 'gemini') {
      result = await callGemini(providerConfig, selectedModel, fullMessages, temperature, maxTokens);
    } else {
      // Fallback to mock for demo
      result = generateMockResponse(provider, selectedModel, fullMessages);
    }

    const latency = Date.now() - startTime;

    const requestRecord = {
      id: requestId,
      provider,
      model: selectedModel,
      messages: fullMessages.length,
      latency,
      tokens: result.usage,
      cost: calculateCost(provider, selectedModel, result.usage?.total_tokens || 0),
      timestamp: new Date(),
    };
    requests.set(requestId, requestRecord);

    res.json({
      success: true,
      requestId,
      provider,
      model: selectedModel,
      response: result.content,
      usage: result.usage,
      latency,
      cost: requestRecord.cost,
    });
  } catch (error) {
    res.status(500).json({
      error: 'AI request failed',
      message: error.message,
      provider,
      model: selectedModel,
    });
  }
});

// ============================================================
// SALES-SPECIFIC AI TASKS
// ============================================================

// Email generation
app.post('/tasks/email', async (req, res) => {
  const { context, goal, tone = 'professional', channel = 'email' } = req.body;

  const systemPrompt = `You are an expert sales copywriter. Generate compelling sales emails that:
- Grab attention in the subject line
- Personalize based on context
- Focus on value proposition
- Include clear CTAs
- Match the requested tone`;

  const messages = [
    { role: 'user', content: `Generate a ${goal} email for:\n${JSON.stringify(context, null, 2)}` },
  ];

  try {
    const result = await callOpenAI(
      AI_PROVIDERS.openai,
      'gpt-4',
      [{ role: 'system', content: systemPrompt }, ...messages],
      0.7,
      500
    );

    res.json({
      success: true,
      email: parseEmailResponse(result.content),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lead scoring
app.post('/tasks/score-lead', async (req, res) => {
  const { lead } = req.body;

  const score = calculateLeadScore(lead);
  const reasons = generateScoringReasons(lead, score);

  res.json({
    success: true,
    leadId: lead.id,
    score,
    grade: scoreToGrade(score),
    reasons,
    recommendations: generateRecommendations(score, lead),
  });
});

function calculateLeadScore(lead) {
  let score = 50;

  // Company size
  if (lead.companySize === 'enterprise') score += 20;
  else if (lead.companySize === 'mid') score += 15;
  else if (lead.companySize === 'smb') score += 10;

  // Seniority
  if (lead.seniority === 'cxo') score += 15;
  else if (lead.seniority === 'vp') score += 10;
  else if (lead.seniority === 'director') score += 8;
  else if (lead.seniority === 'manager') score += 5;

  // Engagement
  if (lead.websiteVisits > 5) score += 10;
  if (lead.contentDownloads > 2) score += 5;
  if (lead.demoRequested) score += 15;

  // Intent signals
  if (lead.searchingCompetitors) score += 10;
  if (lead.pricingPageVisited) score += 8;
  if (lead.caseStudyViewed) score += 5;

  return Math.min(100, Math.max(0, score));
}

function scoreToGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function generateScoringReasons(lead, score) {
  const reasons = [];
  if (lead.companySize === 'enterprise') reasons.push('Enterprise company size');
  if (lead.seniority === 'cxo' || lead.seniority === 'vp') reasons.push('Executive level contact');
  if (lead.demoRequested) reasons.push('Demo requested');
  if (lead.websiteVisits > 5) reasons.push('High website engagement');
  if (lead.pricingPageVisited) reasons.push('Pricing page viewed');
  return reasons;
}

function generateRecommendations(score, lead) {
  if (score >= 80) {
    return ['Immediate outreach', 'Personalized demo invite', 'Executive sponsor meeting'];
  }
  if (score >= 60) {
    return ['Nurture sequence', 'Share case studies', 'Invite to webinar'];
  }
  return ['Add to long-term nurture', 'Share educational content', 'Monitor for engagement'];
}

// Deal coaching
app.post('/tasks/coach-deal', async (req, res) => {
  const { deal } = req.body;

  const coaching = generateDealCoaching(deal);

  res.json({
    success: true,
    dealId: deal.id,
    health: coaching.health,
    risks: coaching.risks,
    talkingPoints: coaching.talkingPoints,
    recommendedActions: coaching.recommendedActions,
    confidenceToClose: coaching.confidence,
  });
});

function generateDealCoaching(deal) {
  const coaching = {
    health: 'healthy',
    risks: [],
    talkingPoints: [],
    recommendedActions: [],
    confidence: 70,
  };

  // Check for risks
  if (!deal.champion) {
    coaching.risks.push('No champion identified');
    coaching.health = deal.stage === 'discovery' ? 'at_risk' : 'critical';
    coaching.confidence -= 25;
  }

  if (deal.blockers?.length > 0) {
    coaching.risks.push(`${deal.blockers.length} blocker(s) present`);
    coaching.health = 'at_risk';
    coaching.confidence -= 15;
  }

  if (deal.competitorMentioned) {
    coaching.risks.push('Competitor mentioned');
    coaching.confidence -= 10;
  }

  // Talking points
  if (deal.buyingSignals?.length > 0) {
    coaching.talkingPoints.push('Leverage buying signals');
  }
  if (deal.founderMentioned) {
    coaching.talkingPoints.push('Personal connection opportunity');
  }

  // Recommended actions
  if (!deal.champion) {
    coaching.recommendedActions.push('Identify and cultivate a champion');
  }
  if (deal.daysSinceLastContact > 7) {
    coaching.recommendedActions.push('Increase touchpoint frequency');
  }
  if (deal.stage === 'proposal' && !deal.proposalSent) {
    coaching.recommendedActions.push('Send formal proposal');
  }

  coaching.confidence = Math.max(0, Math.min(100, coaching.confidence));

  if (coaching.confidence >= 70) coaching.health = 'healthy';
  else if (coaching.confidence >= 40) coaching.health = 'at_risk';
  else coaching.health = 'critical';

  return coaching;
}

// Sales forecasting
app.post('/tasks/forecast', async (req, res) => {
  const { opportunities } = req.body;

  const forecast = calculateForecast(opportunities);

  res.json({
    success: true,
    forecast,
    scenarios: generateScenarios(forecast),
  });
});

function calculateForecast(opportunities) {
  const forecast = {
    commit: 0,
    bestCase: 0,
    pipeline: opportunities.reduce((sum, o) => sum + o.value, 0),
    weighted: 0,
    byStage: {},
    byOwner: {},
  };

  opportunities.forEach(opp => {
    const weighted = opp.value * (opp.probability / 100);
    forecast.weighted += weighted;

    if (opp.probability >= 75) forecast.commit += opp.value;

    if (opp.probability >= 50) forecast.bestCase += opp.value;

    // By stage
    forecast.byStage[opp.stage] = (forecast.byStage[opp.stage] || 0) + weighted;

    // By owner
    forecast.byOwner[opp.owner] = (forecast.byOwner[opp.owner] || 0) + weighted;
  });

  return forecast;
}

function generateScenarios(forecast) {
  return {
    pessimistic: {
      value: forecast.commit * 0.8,
      probability: 20,
    },
    expected: {
      value: forecast.weighted,
      probability: 50,
    },
    optimistic: {
      value: forecast.bestCase,
      probability: 80,
    },
  };
}

// ============================================================
// ANALYTICS
// ============================================================

app.get('/analytics/usage', (req, res) => {
  const allRequests = Array.from(requests.values());

  const byProvider = {};
  allRequests.forEach(r => {
    byProvider[r.provider] = byProvider[r.provider] || { count: 0, cost: 0, latency: 0 };
    byProvider[r.provider].count++;
    byProvider[r.provider].cost += r.cost;
    byProvider[r.provider].latency += r.latency;
  });

  Object.keys(byProvider).forEach(p => {
    byProvider[p].latency = Math.round(byProvider[p].latency / byProvider[p].count);
  });

  res.json({
    success: true,
    overview: {
      totalRequests: allRequests.length,
      totalCost: allRequests.reduce((sum, r) => sum + r.cost, 0),
      avgLatency: allRequests.length > 0
        ? Math.round(allRequests.reduce((sum, r) => sum + r.latency, 0) / allRequests.length)
        : 0,
    },
    byProvider,
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function callOpenAI(provider, model, messages, temperature, maxTokens) {
  // In production, this would make actual API calls
  // For demo, return mock response
  return generateMockResponse('openai', model, messages);
}

async function callAnthropic(provider, model, messages, temperature, maxTokens) {
  return generateMockResponse('anthropic', model, messages);
}

async function callGemini(provider, model, messages, temperature, maxTokens) {
  return generateMockResponse('gemini', model, messages);
}

function generateMockResponse(provider, model, messages) {
  const lastMessage = messages[messages.length - 1].content;
  const response = `AI Response from ${provider} (${model})\n\nBased on your request about: "${lastMessage.substring(0, 100)}..."\n\nThis is a simulated AI response. In production, this would call the actual ${provider} API.`;

  return {
    content: response,
    usage: {
      prompt_tokens: Math.floor(Math.random() * 500) + 100,
      completion_tokens: Math.floor(Math.random() * 200) + 50,
      total_tokens: Math.floor(Math.random() * 700) + 150,
    },
  };
}

function calculateCost(provider, model, tokens) {
  const rates = {
    openai: { 'gpt-4': 0.03, 'gpt-4-turbo': 0.01, 'gpt-3.5-turbo': 0.002 },
    anthropic: { 'claude-3-opus': 0.015, 'claude-3-sonnet': 0.003, 'claude-3-haiku': 0.00025 },
    gemini: { 'gemini-pro': 0.000125, 'gemini-ultra': 0.0075 },
  };

  const rate = rates[provider]?.[model] || 0.001;
  return tokens * rate / 1000;
}

function parseEmailResponse(content) {
  const lines = content.split('\n');
  const subject = lines.find(l => l.toLowerCase().startsWith('subject:'))?.replace(/subject:/i, '').trim() || '';
  const body = lines.slice(lines.findIndex(l => l.toLowerCase().startsWith('body:')) + 1).join('\n').trim() || content;

  return { subject, body: body || content };
}

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`AI Integration Layer - SalesOS v1.0 - Port: ${PORT}`);
});

module.exports = app;
