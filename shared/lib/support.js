/**
 * RTMN Support Client Library
 *
 * Usage:
 *   import { support, createSupportClient } from '../shared/lib/support';
 *
 *   // Search knowledge base
 *   const articles = await support.knowledge.search('password reset');
 *
 *   // Create ticket
 *   const ticket = await support.tickets.create({ subject: 'Help', description: '...' });
 *
 *   // Get ticket stats
 *   const stats = await support.tickets.stats();
 */

const SUPPORT_CONFIG = {
  KNOWLEDGE_BASE_URL: process.env.KNOWLEDGE_BASE_URL || process.env.SUPPORT_KB_URL || 'http://localhost:4871',
  TICKET_SERVICE_URL: process.env.TICKET_SERVICE_URL || 'http://localhost:4872',
  SLA_SERVICE_URL: process.env.SLA_SERVICE_URL || 'http://localhost:4873',
  ANALYTICS_URL: process.env.ANALYTICS_URL || 'http://localhost:4874',
  UNIFIED_INBOX_URL: process.env.UNIFIED_INBOX_URL || 'http://localhost:4870',
  SUPPORTER_AI_URL: process.env.SUPPORTER_AI_URL || 'http://localhost:4878',
  INTERNAL_TOKEN: process.env.INTERNAL_SERVICE_TOKEN || '',
};

/**
 * Make authenticated request
 */
async function request(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(SUPPORT_CONFIG.INTERNAL_TOKEN && { 'Authorization': `Bearer ${SUPPORT_CONFIG.INTERNAL_TOKEN}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || `Request failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Support Client Error [${path}]:`, error.message);
    throw error;
  }
}

// ============ KNOWLEDGE BASE API ============
const knowledgeBase = {
  /**
   * Search articles
   */
  search: async (query, options = {}) => {
    const params = new URLSearchParams({ q: query, ...options });
    return request(SUPPORT_CONFIG.KNOWLEDGE_BASE_URL, `/api/articles/search?${params}`);
  },

  /**
   * Get article by ID
   */
  get: async (id) => {
    return request(SUPPORT_CONFIG.KNOWLEDGE_BASE_URL, `/api/articles/${id}`);
  },

  /**
   * List articles
   */
  list: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.KNOWLEDGE_BASE_URL, `/api/articles?${params}`);
  },

  /**
   * Get FAQs
   */
  faqs: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.KNOWLEDGE_BASE_URL, `/api/faqs?${params}`);
  },

  /**
   * List categories
   */
  categories: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.KNOWLEDGE_BASE_URL, `/api/categories?${params}`);
  },

  /**
   * Rate article helpfulness
   */
  rateArticle: async (id, helpful) => {
    return request(SUPPORT_CONFIG.KNOWLEDGE_BASE_URL, `/api/articles/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    });
  },
};

// ============ TICKET API ============
const tickets = {
  /**
   * List tickets
   */
  list: async (options = {}) => {
    const params = new URLSearchParams(
      Object.entries(options)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets?${params}`);
  },

  /**
   * Get ticket by ID
   */
  get: async (id) => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/${id}`);
  },

  /**
   * Get ticket by number
   */
  getByNumber: async (ticketNumber) => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/number/${ticketNumber}`);
  },

  /**
   * Create ticket
   */
  create: async (data) => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, '/api/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update ticket
   */
  update: async (id, data) => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Assign ticket
   */
  assign: async (id, assignedTo, assignedToName, performedBy = 'system') => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignedTo, assignedToName, performedBy, performedByName: performedBy }),
    });
  },

  /**
   * Add comment
   */
  comment: async (id, message, performedBy = 'customer', performedByName = 'Customer') => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message, performedBy, performedByName }),
    });
  },

  /**
   * Resolve ticket
   */
  resolve: async (id, resolution, performedBy = 'agent', performedByName = 'Agent') => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, performedBy, performedByName }),
    });
  },

  /**
   * Close ticket
   */
  close: async (id, performedBy = 'agent', performedByName = 'Agent') => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ performedBy, performedByName }),
    });
  },

  /**
   * Reopen ticket
   */
  reopen: async (id, reason, performedBy = 'customer', performedByName = 'Customer') => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason, performedBy, performedByName }),
    });
  },

  /**
   * Rate ticket (CSAT)
   */
  rate: async (id, rating, feedback) => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback }),
    });
  },

  /**
   * Get ticket history
   */
  history: async (id) => {
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/${id}/history`);
  },

  /**
   * Get ticket statistics
   */
  stats: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.TICKET_SERVICE_URL, `/api/tickets/stats?${params}`);
  },
};

// ============ SLA API ============
const sla = {
  /**
   * Get SLA policies
   */
  policies: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.SLA_SERVICE_URL, `/api/sla/policies?${params}`);
  },

  /**
   * Create SLA policy
   */
  createPolicy: async (data) => {
    return request(SUPPORT_CONFIG.SLA_SERVICE_URL, '/api/sla/policies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Start SLA tracking for ticket
   */
  track: async (ticketId, ticketNumber, priority, industry) => {
    return request(SUPPORT_CONFIG.SLA_SERVICE_URL, '/api/sla/track', {
      method: 'POST',
      body: JSON.stringify({ ticketId, ticketNumber, priority, industry }),
    });
  },

  /**
   * Mark first response
   */
  firstResponse: async (ticketId) => {
    return request(SUPPORT_CONFIG.SLA_SERVICE_URL, '/api/sla/first-response', {
      method: 'POST',
      body: JSON.stringify({ ticketId }),
    });
  },

  /**
   * Mark resolved
   */
  resolved: async (ticketId) => {
    return request(SUPPORT_CONFIG.SLA_SERVICE_URL, '/api/sla/resolved', {
      method: 'POST',
      body: JSON.stringify({ ticketId }),
    });
  },

  /**
   * Get warnings
   */
  warnings: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.SLA_SERVICE_URL, `/api/sla/warnings?${params}`);
  },

  /**
   * Get breaches
   */
  breaches: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.SLA_SERVICE_URL, `/api/sla/breaches?${params}`);
  },

  /**
   * Get metrics
   */
  metrics: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.SLA_SERVICE_URL, `/api/sla/metrics?${params}`);
  },
};

// ============ ANALYTICS API ============
const analytics = {
  /**
   * Get overview
   */
  overview: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.ANALYTICS_URL, `/api/analytics/overview?${params}`);
  },

  /**
   * Get trends
   */
  trends: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.ANALYTICS_URL, `/api/analytics/trends?${params}`);
  },

  /**
   * Get agent performance
   */
  agents: async () => {
    return request(SUPPORT_CONFIG.ANALYTICS_URL, '/api/analytics/agents');
  },

  /**
   * Get channel breakdown
   */
  channels: async () => {
    return request(SUPPORT_CONFIG.ANALYTICS_URL, '/api/analytics/channels');
  },

  /**
   * Get industry insights
   */
  industries: async () => {
    return request(SUPPORT_CONFIG.ANALYTICS_URL, '/api/analytics/industries');
  },

  /**
   * Export report
   */
  export: async (format = 'json', options = {}) => {
    const params = new URLSearchParams({ format, ...options });
    return request(SUPPORT_CONFIG.ANALYTICS_URL, `/api/analytics/export?${params}`);
  },
};

// ============ UNIFIED INBOX API ============
const inbox = {
  /**
   * Get conversations
   */
  conversations: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.UNIFIED_INBOX_URL, `/api/conversations?${params}`);
  },

  /**
   * Get agents
   */
  agents: async (options = {}) => {
    const params = new URLSearchParams(options);
    return request(SUPPORT_CONFIG.UNIFIED_INBOX_URL, `/api/agents?${params}`);
  },

  /**
   * Get stats
   */
  stats: async () => {
    return request(SUPPORT_CONFIG.UNIFIED_INBOX_URL, '/api/stats');
  },
};

// ============ SUPPORTER AI API ============
const supporterAI = {
  /**
   * Start conversation
   */
  startConversation: async (customerId, customerName, industry) => {
    return request(SUPPORT_CONFIG.SUPPORTER_AI_URL, '/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ customerId, customerName, industry }),
    });
  },

  /**
   * Send message
   */
  sendMessage: async (conversationId, content) => {
    return request(SUPPORT_CONFIG.SUPPORTER_AI_URL, `/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  /**
   * Search knowledge base
   */
  search: async (query) => {
    return request(SUPPORT_CONFIG.SUPPORTER_AI_URL, `/api/search?q=${encodeURIComponent(query)}`);
  },

  /**
   * Get suggestions
   */
  suggestions: async () => {
    return request(SUPPORT_CONFIG.SUPPORTER_AI_URL, '/api/suggestions');
  },
};

// ============ EXPORTS ============
export const support = {
  knowledge: knowledgeBase,
  tickets,
  sla,
  analytics,
  inbox,
  supporter: supporterAI,
  config: SUPPORT_CONFIG,
};

/**
 * Create industry-specific support client
 */
export function createSupportClient(industry) {
  return {
    knowledge: {
      ...knowledgeBase,
      search: (query, options = {}) => knowledgeBase.search(query, { ...options, industry }),
      list: (options = {}) => knowledgeBase.list({ ...options, industry }),
      faqs: (options = {}) => knowledgeBase.faqs({ ...options, industry }),
    },
    tickets: {
      ...tickets,
      list: (options = {}) => tickets.list({ ...options, industry }),
      create: (data) => tickets.create({ ...data, industry }),
    },
    sla: {
      ...sla,
      track: (ticketId, ticketNumber, priority) =>
        sla.track(ticketId, ticketNumber, priority, industry),
    },
    analytics: {
      ...analytics,
      overview: (options = {}) => analytics.overview({ ...options, industry }),
      trends: (options = {}) => analytics.trends({ ...options, industry }),
    },
    config: SUPPORT_CONFIG,
  };
}

/**
 * Health check all support services
 */
export async function healthCheck() {
  const services = [
    { name: 'knowledge-base', url: SUPPORT_CONFIG.KNOWLEDGE_BASE_URL },
    { name: 'ticket-service', url: SUPPORT_CONFIG.TICKET_SERVICE_URL },
    { name: 'sla-service', url: SUPPORT_CONFIG.SLA_SERVICE_URL },
    { name: 'analytics', url: SUPPORT_CONFIG.ANALYTICS_URL },
    { name: 'unified-inbox', url: SUPPORT_CONFIG.UNIFIED_INBOX_URL },
    { name: 'supporter-ai', url: SUPPORT_CONFIG.SUPPORTER_AI_URL },
  ];

  const results = await Promise.allSettled(
    services.map(async (s) => {
      const response = await fetch(`${s.url}/health`);
      return { name: s.name, status: response.ok ? 'healthy' : 'unhealthy' };
    })
  );

  return results.map((r, i) => ({
    service: services[i].name,
    ...(r.status === 'fulfilled' ? r.value : { status: 'unhealthy', error: r.reason }),
  }));
}

export default {
  support,
  createSupportClient,
  healthCheck,
};
