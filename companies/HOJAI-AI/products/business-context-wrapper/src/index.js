/**
 * Business Context Wrapper
 * Port: 5451
 * Wraps Genie Gateway for business owner Q&A - natural language answers with revenue impact
 * Reuses: CXO OS (5100), Sales OS (5055), Marketing OS (5500), Genie (4701)
 */

const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.BUSINESS_CONTEXT_PORT || 5451;

// Service URLs
const CXO_OS = process.env.CXO_OS_URL || 'http://localhost:5100';
const SALES_OS = process.env.SALES_OS_URL || 'http://localhost:5055';
const MARKETING_OS = process.env.MARKETING_OS_URL || 'http://localhost:5500';
const GENIE = process.env.GENIE_URL || 'http://localhost:4701';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

app.use(express.json());

// GET /health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'business-context-wrapper', port: PORT });
});

// POST /api/business/ask - Natural language Q&A for business owners
app.post('/api/business/ask', async (req, res) => {
  try {
    const { question, companyId, period } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, error: 'question is required' });
    }

    // Classify the question type
    const questionType = classifyQuestion(question);

    // Fetch relevant data based on question type
    const contextData = await fetchContextData(questionType, companyId, period);

    // Build context prompt for Genie
    const contextPrompt = buildContextPrompt(question, contextData, companyId);

    // Call Genie with business context
    const genieResponse = await callGenie(contextPrompt);

    // Format the response with actionable insights
    const formattedResponse = formatResponse(genieResponse, contextData, questionType, question);

    res.json({ success: true, data: formattedResponse });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/business/insights - Proactive insights dashboard
app.get('/api/business/insights', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    // Fetch all relevant data
    const [revenueData, customerData, marketingData] = await Promise.all([
      fetchRevenueData(companyId),
      fetchCustomerData(companyId),
      fetchMarketingData(companyId)
    ]);

    // Generate insights
    const insights = generateInsights(revenueData, customerData, marketingData);

    res.json({ success: true, data: insights });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/business/dashboard - Quick stats for dashboard
app.get('/api/business/dashboard', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const [revenueData, customerData, marketingData] = await Promise.all([
      fetchRevenueData(companyId),
      fetchCustomerData(companyId),
      fetchMarketingData(companyId)
    ]);

    res.json({
      success: true,
      data: {
        revenue: revenueData,
        customers: customerData,
        marketing: marketingData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/business/recommend - Get AI recommendations
app.post('/api/business/recommend', async (req, res) => {
  try {
    const { companyId, area } = req.body;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const [revenueData, customerData, marketingData] = await Promise.all([
      fetchRevenueData(companyId),
      fetchCustomerData(companyId),
      fetchMarketingData(companyId)
    ]);

    const recommendations = generateRecommendations(area, revenueData, customerData, marketingData);

    res.json({ success: true, data: recommendations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Helper Functions ──────────────────────────────────────────────────────────

function classifyQuestion(question) {
  const q = question.toLowerCase();
  if (q.includes('revenue') || q.includes('sales') || q.includes('income') || q.includes('earn')) return 'revenue';
  if (q.includes('customer') || q.includes('churn') || q.includes('ltv') || q.includes('vip')) return 'customer';
  if (q.includes('cart') || q.includes('abandon') || q.includes('checkout') || q.includes('conversion')) return 'conversion';
  if (q.includes('marketing') || q.includes('campaign') || q.includes('email') || q.includes('whatsapp')) return 'marketing';
  if (q.includes('page') || q.includes('performance') || q.includes('funnel')) return 'performance';
  if (q.includes('competitor') || q.includes('market') || q.includes('pricing')) return 'market';
  if (q.includes('inventory') || q.includes('stock') || q.includes('product')) return 'inventory';
  if (q.includes('support') || q.includes('ticket') || q.includes('complaint')) return 'support';
  return 'general';
}

async function fetchContextData(questionType, companyId, period) {
  const periodParam = period || '7d';
  const data = {};

  // CXO OS for executive metrics
  try {
    const cxoRes = await axios.get(`${CXO_OS}/api/cxo/metrics/${companyId}`, {
      params: { period: periodParam },
      headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
      timeout: 5000
    });
    data.cxo = cxoRes.data?.data || cxoRes.data;
  } catch (e) { data.cxo = null; }

  // Sales OS for revenue data
  try {
    const salesRes = await axios.get(`${SALES_OS}/api/sales/revenue/${companyId}`, {
      params: { period: periodParam },
      headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
      timeout: 5000
    });
    data.sales = salesRes.data?.data || salesRes.data;
  } catch (e) { data.sales = null; }

  // Marketing OS for campaign data
  try {
    const mktRes = await axios.get(`${MARKETING_OS}/api/marketing/overview`, {
      params: { companyId, period: periodParam },
      headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
      timeout: 5000
    });
    data.marketing = mktRes.data?.data || mktRes.data;
  } catch (e) { data.marketing = null; }

  return data;
}

async function fetchRevenueData(companyId) {
  try {
    const res = await axios.get(`${SALES_OS}/api/sales/revenue/${companyId}`, {
      params: { period: '7d' },
      headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
      timeout: 5000
    });
    return res.data?.data || res.data || {};
  } catch (e) { return {}; }
}

async function fetchCustomerData(companyId) {
  try {
    const res = await axios.get(`${CXO_OS}/api/cxo/customer360/${companyId}`, {
      headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
      timeout: 5000
    });
    return res.data?.data || res.data || {};
  } catch (e) { return {}; }
}

async function fetchMarketingData(companyId) {
  try {
    const res = await axios.get(`${MARKETING_OS}/api/marketing/overview`, {
      params: { companyId, period: '7d' },
      headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
      timeout: 5000
    });
    return res.data?.data || res.data || {};
  } catch (e) { return {}; }
}

function buildContextPrompt(question, contextData, companyId) {
  let prompt = `You are a business advisor AI for a business owner.\n\n`;
  prompt += `Question: "${question}"\n\n`;
  prompt += `Relevant business data:\n`;

  if (contextData.cxo) {
    prompt += `\n📊 Executive Metrics:\n`;
    prompt += `• Revenue: Rs ${contextData.cxo.revenue || 'N/A'}\n`;
    prompt += `• Growth: ${contextData.cxo.growth || 0}%\n`;
    prompt += `• Active Customers: ${contextData.cxo.customers || 'N/A'}\n`;
    prompt += `• Orders: ${contextData.cxo.orders || 'N/A'}\n`;
    prompt += `• Average Order Value: Rs ${contextData.cxo.aov || 'N/A'}\n`;
  }

  if (contextData.sales) {
    prompt += `\n💰 Sales Data:\n`;
    prompt += `• Orders: ${contextData.sales.orders || 'N/A'}\n`;
    prompt += `• AOV: Rs ${contextData.sales.aov || 'N/A'}\n`;
    prompt += `• Conversion Rate: ${contextData.sales.conversion || 'N/A'}%\n`;
    prompt += `• Pending Orders: ${contextData.sales.pendingOrders || 'N/A'}\n`;
  }

  if (contextData.marketing) {
    prompt += `\n📣 Marketing Data:\n`;
    prompt += `• Active Campaigns: ${contextData.marketing.activeCampaigns || 'N/A'}\n`;
    prompt += `• Email Open Rate: ${contextData.marketing.emailOpenRate || 'N/A'}%\n`;
    prompt += `• Cart Abandonment: ${contextData.marketing.cartAbandonment || 'N/A'}%\n`;
    prompt += `• Campaign Reach: ${contextData.marketing.reach || 'N/A'}\n`;
  }

  prompt += `\nPlease provide:\n`;
  prompt += `1. A clear, concise answer to the question\n`;
  prompt += `2. Root cause analysis if the news is negative\n`;
  prompt += `3. 3 specific recommended actions with estimated revenue impact in rupees\n`;
  prompt += `4. Priority ranking (1, 2, 3) of actions\n`;

  return prompt;
}

async function callGenie(prompt) {
  try {
    const res = await axios.post(`${GENIE}/api/genie/ask`, {
      question: prompt,
      context: { type: 'business_advisor', companyId: 'unknown' }
    }, {
      headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
      timeout: 15000
    });
    return res.data;
  } catch (err) {
    // Fallback to structured response if Genie unavailable
    console.warn('Genie unavailable, generating fallback response:', err.message);
    return generateFallbackResponse(prompt);
  }
}

function generateFallbackResponse(prompt) {
  return {
    answer: 'Based on your business data, I can see the key metrics. Please check the data section for details.',
    recommendations: [
      { action: 'Review your marketing campaigns for optimization opportunities', impact: 'Rs 50,000+/month' },
      { action: 'Implement abandoned cart recovery if not already active', impact: 'Rs 30,000+/month' },
      { action: 'Consider personalized email campaigns for returning customers', impact: 'Rs 20,000+/month' }
    ],
    confidence: 0.7
  };
}

function formatResponse(genieResponse, contextData, questionType, question) {
  // Extract recommendations if available
  const recommendations = genieResponse.recommendations || [];

  // Calculate overall health score
  let healthScore = 80;
  if (contextData.marketing?.cartAbandonment > 70) healthScore -= 10;
  if (contextData.cxo?.growth < 0) healthScore -= 15;
  if (contextData.marketing?.emailOpenRate < 15) healthScore -= 5;

  return {
    question,
    questionType,
    answer: genieResponse.answer || genieResponse.message || 'Analysis complete.',
    healthScore: Math.max(0, Math.min(100, healthScore)),
    recommendations,
    revenueImpact: recommendations.reduce((sum, r) => {
      const match = r.impact?.match(/Rs?\s*([\d,]+)/);
      return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
    }, 0),
    confidence: genieResponse.confidence || 0.8,
    data: contextData,
    timestamp: new Date().toISOString()
  };
}

function generateInsights(revenueData, customerData, marketingData) {
  const insights = [];

  // Revenue insights
  if (revenueData?.trend === 'declining') {
    insights.push({
      type: 'warning',
      category: 'revenue',
      title: 'Revenue Decline Detected',
      description: `Revenue dropped ${revenueData.change || 0}% this period.`,
      action: 'Review recent marketing campaigns and customer acquisition strategies.',
      priority: 'high',
      estimatedImpact: 'Rs 50,000+'
    });
  }

  // Conversion insights
  const cartAbandonment = marketingData?.cartAbandonment || 0;
  if (cartAbandonment > 65) {
    insights.push({
      type: 'opportunity',
      category: 'conversion',
      title: 'High Cart Abandonment',
      description: `${cartAbandonment}% of carts are abandoned.`,
      action: 'Implement abandoned cart recovery sequence with WhatsApp and email.',
      priority: cartAbandonment > 75 ? 'high' : 'medium',
      estimatedImpact: `Rs ${Math.round((cartAbandonment / 100) * (revenueData?.revenue || 100000) / 4)}+/month`
    });
  }

  // Customer insights
  if (customerData?.churnRisk > 30) {
    insights.push({
      type: 'warning',
      category: 'customer',
      title: 'High Churn Risk',
      description: `${customerData.churnRisk}% of customers show churn risk.`,
      action: 'Launch win-back campaign for at-risk customers.',
      priority: 'high',
      estimatedImpact: 'Rs 25,000+'
    });
  }

  // Marketing insights
  if (marketingData?.emailOpenRate < 15) {
    insights.push({
      type: 'opportunity',
      category: 'marketing',
      title: 'Low Email Engagement',
      description: `Email open rate is ${marketingData.emailOpenRate}%, below industry average of 20%.`,
      action: 'Personalize email subject lines and send at optimal times.',
      priority: 'medium',
      estimatedImpact: 'Rs 15,000+'
    });
  }

  return {
    insights,
    summary: {
      total: insights.length,
      highPriority: insights.filter(i => i.priority === 'high').length,
      opportunities: insights.filter(i => i.type === 'opportunity').length,
      warnings: insights.filter(i => i.type === 'warning').length
    }
  };
}

function generateRecommendations(area, revenueData, customerData, marketingData) {
  const recommendations = [];

  if (!area || area === 'revenue' || area === 'all') {
    if ((revenueData?.revenue || 0) > 0) {
      recommendations.push({
        area: 'revenue',
        action: 'Launch loyalty program for top 20% customers',
        reason: 'Loyalty programs increase LTV by 25-30%',
        impact: 'Rs 50,000+/month',
        priority: 1
      });
    }
    recommendations.push({
      area: 'revenue',
      action: 'Implement upsell recommendations on checkout page',
      reason: 'Upsells increase AOV by 10-15%',
      impact: 'Rs 30,000+/month',
      priority: 2
    });
  }

  if (!area || area === 'conversion' || area === 'all') {
    recommendations.push({
      area: 'conversion',
      action: 'Add express checkout options (UPI, Wallets)',
      reason: 'Reduce checkout friction for mobile users',
      impact: 'Rs 40,000+/month',
      priority: 1
    });
    recommendations.push({
      area: 'conversion',
      action: 'Show shipping costs earlier in the funnel',
      reason: 'Hidden shipping costs cause 30% of abandonments',
      impact: 'Rs 25,000+/month',
      priority: 2
    });
  }

  if (!area || area === 'marketing' || area === 'all') {
    recommendations.push({
      area: 'marketing',
      action: 'Set up abandoned cart WhatsApp automation',
      reason: 'WhatsApp has 5x higher open rate than email',
      impact: 'Rs 35,000+/month',
      priority: 1
    });
    recommendations.push({
      area: 'marketing',
      action: 'Segment email campaigns by customer lifecycle stage',
      reason: 'Segmented campaigns have 760% higher ROI',
      impact: 'Rs 20,000+/month',
      priority: 2
    });
  }

  if (!area || area === 'customer' || area === 'all') {
    recommendations.push({
      area: 'customer',
      action: 'Create VIP tier with exclusive benefits',
      reason: 'Top 1% customers account for 23% of revenue',
      impact: 'Rs 60,000+/month',
      priority: 1
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

app.listen(PORT, () => {
  console.log(`Business Context Wrapper running on port ${PORT}`);
});

module.exports = app;
