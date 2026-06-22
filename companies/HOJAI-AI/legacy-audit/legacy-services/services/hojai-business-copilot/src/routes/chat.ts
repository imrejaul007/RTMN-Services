import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const logger = createLogger('hojai-business-copilot:chat');
const router = Router();

// Service URLs
const CORE_COPILOT_URL = process.env.CORE_COPILOT_URL || 'http://localhost:4002';
const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const TWIN_SERVICE_URL = process.env.TWIN_SERVICE_URL || 'http://localhost:4860';
const GRAPH_SERVICE_URL = process.env.GRAPH_SERVICE_URL || 'http://localhost:4810';
const INTELLIGENCE_SERVICE_URL = process.env.INTELLIGENCE_SERVICE_URL || 'http://localhost:4530';
const EXPERT_OS_URL = process.env.EXPERT_OS_URL || 'http://localhost:4550';
const REVENUE_SERVICE_URL = process.env.REVENUE_SERVICE_URL || 'http://localhost:4757';
const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:4752';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:4755';
const COMPETITIVE_SERVICE_URL = process.env.COMPETITIVE_SERVICE_URL || 'http://localhost:4756';
const GOAL_SERVICE_URL = process.env.GOAL_SERVICE_URL || 'http://localhost:4242';
const MEETING_SERVICE_URL = process.env.MEETING_SERVICE_URL || 'http://localhost:4700';
const FLOW_SERVICE_URL = process.env.FLOW_SERVICE_URL || 'http://localhost:4244';
const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || 'http://localhost:4708';

// Industry to service mapping
const INDUSTRY_SERVICES: Record<string, { twin?: string; customer?: string; revenue?: string; product?: string }> = {
  hotel: { twin: 'guest', customer: 'guest', revenue: 'booking' },
  restaurant: { twin: 'customer', customer: 'diner', revenue: 'order' },
  healthcare: { twin: 'patient', customer: 'patient', revenue: 'billing' },
  finance: { twin: 'client', customer: 'client', revenue: 'portfolio' },
  retail: { twin: 'shopper', customer: 'customer', revenue: 'sale' },
  legal: { twin: 'client', customer: 'client', revenue: 'billing' },
  education: { twin: 'student', customer: 'student', revenue: 'tuition' },
  realestate: { twin: 'property', customer: 'buyer', revenue: 'sale' },
  construction: { twin: 'project', customer: 'client', revenue: 'contract' },
  automotive: { twin: 'vehicle', customer: 'owner', revenue: 'service' },
  travel: { twin: 'traveler', customer: 'traveler', revenue: 'booking' },
  fitness: { twin: 'member', customer: 'member', revenue: 'membership' },
  beauty: { twin: 'client', customer: 'client', revenue: 'service' },
  gaming: { twin: 'player', customer: 'gamer', revenue: 'purchase' },
  sports: { twin: 'fan', customer: 'fan', revenue: 'ticket' },
};

// 24 Industries
const INDUSTRIES = [
  'legal', 'healthcare', 'finance', 'retail', 'education',
  'manufacturing', 'realestate', 'travel', 'restaurant', 'fitness',
  'automotive', 'entertainment', 'gaming', 'agriculture', 'construction',
  'beauty', 'fashion', 'sports', 'government', 'homeservices',
  'professional', 'nonprofit', 'media', 'energy', 'hospitality'
];

/**
 * POST /api/chat
 * Chat with Business Copilot - integrates with core/business-copilot
 */
router.post('/', async (req, res) => {
  const { message, industry, context, sessionId } = req.body;

  if (!message) {
    return res.status(400).json(createErrorResponse('MESSAGE_REQUIRED', 'Message is required'));
  }

  try {
    // Call core/business-copilot for chat processing
    const [copilotRes, memoryRes, twinRes] = await Promise.allSettled([
      // Core Business Copilot chat
      axios.post(`${CORE_COPILOT_URL}/chat`, {
        message,
        industry: industry || 'general',
        context,
        sessionId
      }, {
        timeout: 30000,
        headers: {
          'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
          'X-User-Id': req.headers['x-user-id'] as string || ''
        }
      }),

      // Get relevant memory context
      axios.get(`${MEMORY_SERVICE_URL}/api/memories/context`, {
        params: {
          userId: req.headers['x-user-id'],
          entityType: industry,
          maxItemsPerTier: 3
        },
        headers: { 'X-Tenant-Id': req.headers['x-tenant-id'] as string || '' },
        timeout: 5000
      }).catch(() => null),

      // Get twin data if industry specified
      industry && INDUSTRY_SERVICES[industry.toLowerCase()]
        ? axios.get(`${TWIN_SERVICE_URL}/api/analytics`, {
            headers: { 'Authorization': req.headers.authorization as string || '' },
            timeout: 5000
          }).catch(() => null)
        : Promise.resolve(null)
    ]);

    // Extract results
    const copilotResult = copilotRes.status === 'fulfilled' ? copilotRes.value.data : null;
    const memoryContext = memoryRes.status === 'fulfilled' ? memoryRes.value?.data : null;
    const twinData = twinRes.status === 'fulfilled' ? twinRes.value?.data : null;

    // Build enriched response
    const response = copilotResult || {};
    if (memoryContext) response.memory = memoryContext;
    if (twinData) response.twin = twinData;
    response.industry = industry || 'general';

    logger.info('chat_processed', {
      industry,
      messageLength: message.length,
      hasMemory: !!memoryContext,
      hasTwin: !!twinData
    });

    res.json(createResponse(response));

  } catch (error: any) {
    logger.error('chat_error', { error: error.message, industry });

    // If core copilot fails, try to provide a fallback response
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json(createErrorResponse(
        'SERVICE_UNAVAILABLE',
        'Business Copilot service is currently unavailable. Please try again later.'
      ));
    }

    res.status(500).json(createErrorResponse('CHAT_ERROR', error.message || 'Failed to process chat'));
  }
});

/**
 * GET /api/chat/skills
 * Get available skills for an industry
 */
router.get('/skills', async (req, res) => {
  const { industry } = req.query;

  try {
    // Get skills from core/business-copilot
    const response = await axios.get(`${CORE_COPILOT_URL}/skills`, {
      params: { industry },
      timeout: 5000
    });

    res.json(createResponse(response.data));

  } catch (error: any) {
    logger.error('skills_fetch_error', { error: error.message, industry });

    // Return local skills if core copilot unavailable
    if (error.code === 'ECONNREFUSED') {
      return res.json(createResponse({
        industries: INDUSTRIES,
        skills: getLocalSkills(industry as string)
      }));
    }

    res.status(500).json(createErrorResponse('SKILLS_ERROR', error.message));
  }
});

/**
 * GET /api/chat/industries
 * Get all supported industries
 */
router.get('/industries', (req, res) => {
  res.json(createResponse({
    industries: INDUSTRIES,
    count: INDUSTRIES.length,
    mapping: INDUSTRY_SERVICES
  }));
});

/**
 * POST /api/chat/industry/:industry/query
 * Query specific industry intelligence
 */
router.post('/industry/:industry/query', async (req, res) => {
  const { industry } = req.params;
  const { query, data } = req.body;

  if (!query) {
    return res.status(400).json(createErrorResponse('QUERY_REQUIRED', 'Query is required'));
  }

  const lowerIndustry = industry.toLowerCase();
  const services = INDUSTRY_SERVICES[lowerIndustry] || {};

  try {
    const results: Record<string, any> = {
      industry: lowerIndustry,
      query
    };

    // Parallel queries to relevant services
    const queries = [];

    // Revenue data
    if (services.revenue || industry === 'finance' || industry === 'retail') {
      queries.push(
        axios.get(`${REVENUE_SERVICE_URL}/api/dashboard`, {
          headers: { 'X-Tenant-Id': req.headers['x-tenant-id'] as string || '' },
          timeout: 5000
        }).then(r => ({ key: 'revenue', data: r.data })).catch(() => null)
      );
    }

    // Customer data
    if (services.customer || industry === 'healthcare' || industry === 'hotel') {
      queries.push(
        axios.get(`${CUSTOMER_SERVICE_URL}/api/customers/analytics`, {
          headers: { 'X-Tenant-Id': req.headers['x-tenant-id'] as string || '' },
          timeout: 5000
        }).then(r => ({ key: 'customers', data: r.data })).catch(() => null)
      );
    }

    // Product data
    if (services.product || industry === 'retail' || industry === 'restaurant') {
      queries.push(
        axios.get(`${PRODUCT_SERVICE_URL}/api/analytics`, {
          headers: { 'X-Tenant-Id': req.headers['x-tenant-id'] as string || '' },
          timeout: 5000
        }).then(r => ({ key: 'products', data: r.data })).catch(() => null)
      );
    }

    // Goals data
    queries.push(
      axios.get(`${GOAL_SERVICE_URL}/api/dashboard`, {
        headers: { 'X-Tenant-Id': req.headers['x-tenant-id'] as string || '' },
        timeout: 5000
      }).then(r => ({ key: 'goals', data: r.data })).catch(() => null)
    );

    // Twin data
    queries.push(
      axios.get(`${TWIN_SERVICE_URL}/api/analytics`, {
        headers: { 'Authorization': req.headers.authorization as string || '' },
        timeout: 5000
      }).then(r => ({ key: 'twin', data: r.data })).catch(() => null)
    );

    // Execute all queries
    const queryResults = await Promise.all(queries);

    // Add results
    for (const result of queryResults) {
      if (result) {
        results[result.key] = result.data;
      }
    }

    // Generate AI summary using core copilot
    try {
      const summary = await axios.post(`${CORE_COPILOT_URL}/chat`, {
        message: `Summarize: ${query} for ${industry} industry based on: ${JSON.stringify(results)}`,
        industry: lowerIndustry,
        context: { data: results }
      }, {
        timeout: 10000,
        headers: { 'X-Tenant-Id': req.headers['x-tenant-id'] as string || '' }
      });
      results.summary = summary.data;
    } catch {
      results.summary = 'AI summary unavailable';
    }

    logger.info('industry_query_processed', { industry, query });
    res.json(createResponse(results));

  } catch (error: any) {
    logger.error('industry_query_error', { error: error.message, industry });
    res.status(500).json(createErrorResponse('QUERY_ERROR', error.message));
  }
});

/**
 * GET /api/chat/health
 * Health check for chat service
 */
router.get('/health', async (req, res) => {
  const checks: Record<string, string> = {};

  try {
    // Check core copilot
    await axios.get(`${CORE_COPILOT_URL}/health`, { timeout: 3000 });
    checks.coreCopilot = 'healthy';
  } catch {
    checks.coreCopilot = 'unavailable';
  }

  const healthy = Object.values(checks).some(s => s === 'healthy');

  res.status(healthy ? 200 : 503).json({
    ...createResponse({ checks }),
    status: healthy ? 'ok' : 'degraded'
  });
});

// Local fallback skills
function getLocalSkills(industry?: string): Record<string, any> {
  const allSkills: Record<string, any[]> = {
    legal: [
      { name: 'Case Research', category: 'research' },
      { name: 'Document Drafting', category: 'drafting' },
      { name: 'Compliance Check', category: 'compliance' },
      { name: 'Contract Review', category: 'review' },
      { name: 'Due Diligence', category: 'analysis' }
    ],
    healthcare: [
      { name: 'Patient Records', category: 'records' },
      { name: 'Medical Billing', category: 'billing' },
      { name: 'Appointment Scheduling', category: 'scheduling' },
      { name: 'Insurance Verification', category: 'insurance' },
      { name: 'Prescription Lookup', category: 'clinical' }
    ],
    finance: [
      { name: 'Bookkeeping', category: 'accounting' },
      { name: 'Tax Preparation', category: 'tax' },
      { name: 'Investment Analysis', category: 'investment' },
      { name: 'Budget Planning', category: 'planning' },
      { name: 'Fraud Detection', category: 'security' }
    ],
    retail: [
      { name: 'Inventory Management', category: 'inventory' },
      { name: 'POS Transactions', category: 'transactions' },
      { name: 'Customer Loyalty', category: 'crm' },
      { name: 'Sales Analytics', category: 'analytics' },
      { name: 'Vendor Management', category: 'procurement' }
    ],
    general: [
      { name: 'Business Analysis', category: 'analytics' },
      { name: 'Goal Tracking', category: 'goals' },
      { name: 'Meeting Management', category: 'meetings' },
      { name: 'Team Coordination', category: 'team' },
      { name: 'Performance Review', category: 'hr' }
    ]
  };

  if (industry && allSkills[industry.toLowerCase()]) {
    return { skills: allSkills[industry.toLowerCase()] };
  }

  return { skills: allSkills.general };
}

export default router;
