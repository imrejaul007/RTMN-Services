/**
 * SUTAR Agent Router — dispatches classified messages to the right SUTAR agent.
 *
 * Architecture:
 *   intent → resolve_agent(intent, message) → agent_endpoint
 *   → callSutarAgent(...)  → shape result for widget
 *   → on failure, fall back to local REPLY_BUILDERS
 *
 * Per-intent agent map:
 *   product_search  → merchant-agents POST /api/merchants/:id/message (ACP QUERY)
 *   place_order     → merchant-agents POST /api/merchants/:id/message (ACP ORDER)
 *   negotiate_price → merchant-agents POST /api/merchants/:id/message (ACP COUNTER)
 *   request_quote   → merchant-agents POST /api/merchants/:id/message (ACP QUOTE)
 *   track_order     → merchant-agents GET  /api/merchants/:id/track/:orderId
 *   get_support     → support-copilot POST /api/suggest
 *   ask_question    → acn-hub GET /status (info lookup) or local FAQ
 *   subscribe       → local (no dedicated service yet)
 *   book_appointment → local (no dedicated service yet)
 *   greeting        → local
 *
 * Set SUTAR_ROUTER_ENABLED=true to enable real agent calls.
 * Set SUTAR_MERCHANT_ID=<id> to point at a specific merchant (defaults to first created).
 */

const SUTAR_TIMEOUT = parseInt(process.env.SUTAR_TIMEOUT_MS || '4000');

// Parse an auth header string like "x-internal-token: secret" or "Bearer xyz"
// into { name, value }. Returns null if format is invalid.
function parseAuthHeader(raw) {
  if (!raw) return null;
  const idx = raw.indexOf(':');
  if (idx < 0) {
    // Default to Authorization: Bearer
    return { name: 'authorization', value: `Bearer ${raw.trim()}` };
  }
  const name = raw.slice(0, idx).trim().toLowerCase();
  const value = raw.slice(idx + 1).trim();
  return { name, value };
}

// Per-agent endpoint config
const AGENT_ENDPOINTS = {
  merchantAgents: {
    baseUrl: process.env.SUTAR_MERCHANT_AGENTS_URL || 'http://localhost:4737',
    enabled: process.env.SUTAR_MERCHANT_AGENTS_ENABLED !== 'false', // on by default
    auth: parseAuthHeader(process.env.SUTAR_MERCHANT_AGENTS_AUTH)
  },
  supportCopilot: {
    baseUrl: process.env.SUTAR_SUPPORT_COPILOT_URL || 'http://localhost:4453',
    enabled: process.env.SUTAR_SUPPORT_COPILOT_ENABLED !== 'false',
    auth: parseAuthHeader(process.env.SUTAR_SUPPORT_COPILOT_AUTH)
  },
  salesCopilot: {
    baseUrl: process.env.SUTAR_SALES_COPILOT_URL || 'http://localhost:4928',
    enabled: process.env.SUTAR_SALES_COPILOT_ENABLED !== 'false',
    auth: parseAuthHeader(process.env.SUTAR_SALES_COPILOT_AUTH)
  },
  acnHub: {
    baseUrl: process.env.SUTAR_ACN_HUB_URL || 'http://localhost:4852',
    enabled: process.env.SUTAR_ACN_HUB_ENABLED !== 'false',
    auth: parseAuthHeader(process.env.SUTAR_ACN_HUB_AUTH)
  }
};

// Per-intent → which agent handles it + how to shape the call
const INTENT_AGENT_MAP = {
  product_search: 'merchantAgents',
  place_order: 'merchantAgents',
  negotiate_price: 'merchantAgents',
  request_quote: 'merchantAgents',
  track_order: 'merchantAgents',
  get_support: 'supportCopilot',
  ask_question: 'salesCopilot',
  subscribe: null, // local only
  book_appointment: null, // local only
  greeting: null // local only
};

/**
 * Generic HTTP call to a SUTAR agent.
 * Returns null on any failure (graceful degradation).
 */
async function callAgent(agentKey, method, path, body) {
  const cfg = AGENT_ENDPOINTS[agentKey];
  if (!cfg || !cfg.enabled) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUTAR_TIMEOUT);
    const headers = { 'Content-Type': 'application/json' };
    if (cfg.auth) headers[cfg.auth.name] = cfg.auth.value;
    const url = `${cfg.baseUrl}${path}`;
    const fetchOpts = {
      method,
      headers,
      signal: controller.signal
    };
    if (body !== undefined) fetchOpts.body = JSON.stringify(body);
    const res = await fetch(url, fetchOpts);
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch {
    return null;
  }
}

/**
 * Pick the merchant ID for a given company.
 * Try GET /api/merchants?companyId=X first; if not present, use first merchant
 * from /api/merchants listing. If none exist, return null (fallback to local).
 */
async function resolveMerchantId(companyId) {
  // First try: explicit company filter
  const explicit = await callAgent('merchantAgents', 'GET', `/api/merchants?companyId=${encodeURIComponent(companyId)}`);
  if (explicit && Array.isArray(explicit.merchants) && explicit.merchants.length > 0) {
    return explicit.merchants[0].id;
  }
  // Second: list all merchants, pick the first one
  const list = await callAgent('merchantAgents', 'GET', '/api/merchants');
  if (list && Array.isArray(list.merchants) && list.merchants.length > 0) {
    // If a companyId was provided, prefer matching ones
    if (companyId) {
      const match = list.merchants.find((m) =>
        m.id === companyId || m.companyId === companyId || m.businessId === companyId
      );
      if (match) return match.id;
    }
    return list.merchants[0].id;
  }
  return null;
}

/**
 * Build an ACP message from intent + raw visitor message.
 *
 * merchant-agents expects `query.intent` to be the visitor's natural-language
 * message (it calls .toLowerCase().split(' ') on it for product keyword
 * matching). We pass the message in BOTH `intent` and `query` fields so
 * matching works regardless of which field the agent reads.
 *
 * The original widget intent (product_search, place_order, etc.) is preserved
 * in `context.widgetIntent` for downstream logic that needs to know what
 * the visitor was trying to do.
 */
function buildAcpMessage(intent, message, user, context) {
  const baseMsg = {
    text: message,
    intent: message, // merchant-agents expects the visitor's text here for keyword matching
    query: message,
    sender: user?.id || 'visitor',
    from: user?.id || 'visitor',
    customerId: user?.id,
    context: { widgetIntent: intent, ...(context || {}) }
  };

  switch (intent) {
    case 'product_search':
      return { ...baseMsg, type: 'QUERY' };
    case 'place_order':
      return {
        ...baseMsg,
        type: 'ORDER',
        order: { items: [], notes: message }
      };
    case 'negotiate_price':
      return {
        ...baseMsg,
        type: 'COUNTER',
        offer: { notes: message }
      };
    case 'request_quote':
      return {
        ...baseMsg,
        type: 'QUERY',
        subtype: 'QUOTE'
      };
    case 'track_order':
      // track_order is handled separately by callMerchantAgentForTracking,
      // not via ACP message dispatch.
      return { ...baseMsg, type: 'QUERY' };
    default:
      return { ...baseMsg, type: 'QUERY' };
  }
}

/**
 * Shape merchant-agents response into widget reply format.
 */
function shapeMerchantAgentResponse(acpResponse, intent) {
  if (!acpResponse) return null;

  let reply = '';
  let rich = null;

  switch (acpResponse.type) {
    case 'OFFER':
      if (acpResponse.offer) {
        const product = acpResponse.offer.product || 'this item';
        const price = acpResponse.offer.price;
        const currency = acpResponse.offer.currency || '';
        reply = `I can offer ${product}`;
        if (price) reply += ` at ${currency} ${price}`;
        reply += '.';
        rich = {
          type: 'products',
          items: [{
            id: acpResponse.offer.productId,
            name: product,
            price,
            currency,
            originalPrice: acpResponse.offer.originalPrice,
            negotiableFields: acpResponse.negotiableFields
          }]
        };
      } else {
        reply = acpResponse.message || `Here's what I can offer.`;
      }
      break;

    case 'QUOTE':
      if (acpResponse.offer) {
        const product = acpResponse.offer.product || 'your selection';
        const price = acpResponse.offer.price;
        const currency = acpResponse.offer.currency || '';
        const quantity = acpResponse.offer.quantity || 1;
        const deliveryDate = acpResponse.terms?.deliveryDate
          ? new Date(acpResponse.terms.deliveryDate).toLocaleDateString()
          : null;
        reply = `Here's a quote for ${product}: ${currency} ${price} per unit${quantity > 1 ? ` × ${quantity}` : ''}.`;
        if (deliveryDate) reply += ` Delivery by ${deliveryDate}.`;
        if (acpResponse.offer.originalPrice && acpResponse.offer.originalPrice > price) {
          reply += ` (List price ${currency} ${acpResponse.offer.originalPrice}.)`;
        }
        rich = {
          type: 'quote',
          offer: acpResponse.offer,
          terms: acpResponse.terms,
          validUntil: acpResponse.validUntil,
          negotiableFields: acpResponse.negotiableFields
        };
      } else {
        reply = acpResponse.message || `Here's a quote for your request.`;
      }
      break;

    case 'ACCEPT':
      reply = acpResponse.message || 'Great, your order has been accepted!';
      rich = { type: 'order_confirmation', order: acpResponse.order };
      break;

    case 'REJECT':
      reply = acpResponse.message || `I'm sorry, I can't accept that offer. ${acpResponse.reason || ''}`;
      break;

    case 'COUNTER':
      reply = acpResponse.message || `Let me suggest a different approach.`;
      if (acpResponse.offer) {
        rich = {
          type: 'counter_offer',
          offer: acpResponse.offer
        };
      }
      break;

    case 'QUERY_RECEIVED':
      // merchant-agents acknowledged the query but didn't generate a quote yet.
      // Fall through to default — return the action hint if present.
      reply = acpResponse.action === 'generate_quote'
        ? `I'm preparing a quote for you. One moment.`
        : (acpResponse.message || `Let me look into that for you.`);
      break;

    default:
      reply = acpResponse.message || acpResponse.text || acpResponse.reply || 'Got it — let me look into that for you.';
  }

  // Attach products / recommendations as rich content if no rich set yet
  if (!rich) {
    if (Array.isArray(acpResponse.recommendations) && acpResponse.recommendations.length > 0) {
      rich = {
        type: 'products',
        items: acpResponse.recommendations.slice(0, 5).map((p) => ({
          id: p.id || p.productId,
          name: p.name || p.title,
          price: p.price,
          image: p.image,
          url: p.url
        }))
      };
    } else if (Array.isArray(acpResponse.products) && acpResponse.products.length > 0) {
      rich = {
        type: 'products',
        items: acpResponse.products.slice(0, 5).map((p) => ({
          id: p.id || p.productId,
          name: p.name || p.title,
          price: p.price,
          image: p.image,
          url: p.url
        }))
      };
    }
  }

  return { reply, rich };
}

// ─── Per-intent agent handlers ─────────────────────────────────────────

async function callMerchantAgent({ intent, message, context, user, companyId }) {
  const merchantId = await resolveMerchantId(companyId);
  if (!merchantId) return null;

  const acpMessage = buildAcpMessage(intent, message, user, context);
  const response = await callAgent('merchantAgents', 'POST', `/api/merchants/${merchantId}/message`, {
    message: acpMessage
  });
  if (!response) return null;
  return shapeMerchantAgentResponse(response, intent);
}

async function callMerchantAgentForTracking({ message, companyId }) {
  const merchantId = await resolveMerchantId(companyId);
  if (!merchantId) return null;

  // Try to extract an order ID from the message
  const orderIdMatch = message.match(/(?:ORD|REZ|order)[-:#]?\s*([A-Za-z0-9-]{4,})/i);
  if (!orderIdMatch) return null;

  const response = await callAgent('merchantAgents', 'GET', `/api/merchants/${merchantId}/track/${encodeURIComponent(orderIdMatch[1])}`);
  if (!response || !response.order) return null;

  return {
    reply: `Order ${response.order.id}: ${response.order.status || 'in progress'}. ${response.order.lastUpdate || ''}`,
    rich: { type: 'order_status', order: response.order }
  };
}

async function callSupportCopilot({ message, user, context }) {
  const response = await callAgent('supportCopilot', 'POST', '/api/suggest', {
    message,
    customer: user,
    context
  });
  if (!response || !response.suggestion) return null;

  return {
    reply: response.suggestion.reply || response.suggestion.message || 'Here is a suggested response...',
    rich: null
  };
}

async function callSalesCopilot({ message, user, context }) {
  const response = await callAgent('salesCopilot', 'POST', '/api/recommend', {
    query: message,
    customer: user,
    context
  });
  if (!response || !response.recommendation) return null;

  return {
    reply: response.recommendation.text || response.recommendation.message || 'Here is what I recommend...',
    rich: null
  };
}

// ─── Local reply builders (fallback) ────────────────────────────────────

const REPLY_BUILDERS = {
  product_search: ({ message, context }) => {
    const enriched = context.enriched;
    const products = enriched?.products || enriched?.recommendations || [];
    if (products.length > 0) {
      return {
        reply: `I found ${products.length} item${products.length > 1 ? 's' : ''} that might match what you're looking for:`,
        rich: {
          type: 'products',
          items: products.slice(0, 5).map((p) => ({
            id: p.id || p.productId,
            name: p.name || p.title,
            price: p.price,
            image: p.image,
            url: p.url
          }))
        }
      };
    }
    return {
      reply: `I can help you find products. Could you tell me more about what you're looking for? For example, the category, price range, or specific features.`,
      rich: null
    };
  },

  place_order: () => ({
    reply: `I'd love to help you place an order. Could you confirm what you'd like to buy and the quantity? I can also check availability and find the best deal for you.`,
    rich: { type: 'cart_prompt' }
  }),

  book_appointment: ({ context }) => {
    if (context.enriched?.slots) {
      return {
        reply: `Great, I'd be happy to book that for you. I have these times available:`,
        rich: {
          type: 'time_slots',
          slots: context.enriched.slots.slice(0, 6)
        }
      };
    }
    return {
      reply: `I can help you book that. What date and time work best for you?`,
      rich: { type: 'booking_prompt' }
    };
  },

  track_order: () => ({
    reply: `Let me check on that for you. Could you share your order number? It usually starts with letters like "ORD" or "REZ".`,
    rich: { type: 'order_lookup' }
  }),

  get_support: ({ context }) => {
    if (context.enriched?.previousTickets?.length) {
      return {
        reply: `I see you have previous tickets with us. Let me pull those up.`,
        rich: {
          type: 'tickets',
          items: context.enriched.previousTickets.slice(0, 3)
        }
      };
    }
    return {
      reply: `I'm sorry you're having trouble. I can help you with that. Could you describe what's going on in a bit more detail? If you'd prefer to speak with a human, just say "speak to a human" and I'll connect you.`,
      rich: null
    };
  },

  ask_question: ({ context }) => {
    if (context.enriched?.faqMatch) {
      return {
        reply: context.enriched.faqMatch.answer,
        rich: { type: 'faq', source: context.enriched.faqMatch.source }
      };
    }
    return {
      reply: `That's a great question. Based on what I know, here's what I can tell you — but if you need more detail, I'm happy to connect you with someone who can help.`,
      rich: null
    };
  },

  negotiate_price: () => ({
    reply: `Let me check what I can do for you. For bulk orders or repeat customers, we often have flexible pricing. What's your use case, and what quantity are you looking at?`,
    rich: { type: 'pricing_prompt' }
  }),

  request_quote: () => ({
    reply: `I can prepare a custom quote for you. To give you the best price, could you tell me: the quantity you need, your preferred delivery date, and whether you have specific requirements?`,
    rich: { type: 'quote_form' }
  }),

  subscribe: () => ({
    reply: `I can help you manage your subscription. Would you like to upgrade, downgrade, pause, or cancel?`,
    rich: { type: 'subscription_actions' }
  }),

  greeting: ({ user }) => {
    const userName = user?.name;
    if (userName) {
      return {
        reply: `Hi ${userName}! Great to see you again. What can I help you with today?`,
        rich: null
      };
    }
    return {
      reply: `Hi there! 👋 How can I help you today? I can help you find products, place orders, book appointments, track orders, or answer questions about our services.`,
      rich: null
    };
  }
};

// ─── Main routing ───────────────────────────────────────────────────────

async function route({ agentRole, intent, companyId, visitorId, message, context, user }) {
  const agentKey = INTENT_AGENT_MAP[intent];

  // Try real agent first (if mapped)
  if (agentKey && AGENT_ENDPOINTS[agentKey]?.enabled) {
    let agentResult = null;

    if (intent === 'track_order') {
      agentResult = await callMerchantAgentForTracking({ message, companyId });
    } else if (['product_search', 'place_order', 'negotiate_price', 'request_quote'].includes(intent)) {
      agentResult = await callMerchantAgent({ intent, message, context, user, companyId });
    } else if (intent === 'get_support') {
      agentResult = await callSupportCopilot({ message, user, context });
    } else if (intent === 'ask_question') {
      agentResult = await callSalesCopilot({ message, user, context });
    }

    if (agentResult && agentResult.reply) {
      return {
        reply: agentResult.reply,
        rich: agentResult.rich || null,
        source: `sutar-${agentKey}`
      };
    }
  }

  // Fallback to local builder
  const builder = REPLY_BUILDERS[intent] || REPLY_BUILDERS.ask_question;
  const result = builder({ message, context, user, agentRole });
  return {
    ...result,
    source: 'local-builder'
  };
}

// ─── Status / diagnostics ──────────────────────────────────────────────

async function checkAgentHealth() {
  const results = {};
  for (const [key, cfg] of Object.entries(AGENT_ENDPOINTS)) {
    if (!cfg.enabled) {
      results[key] = { enabled: false };
      continue;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${cfg.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      results[key] = { enabled: true, baseUrl: cfg.baseUrl, healthy: res.ok };
    } catch {
      results[key] = { enabled: true, baseUrl: cfg.baseUrl, healthy: false };
    }
  }
  return results;
}

module.exports = {
  route,
  REPLY_BUILDERS,
  AGENT_ENDPOINTS,
  INTENT_AGENT_MAP,
  checkAgentHealth,
  // Internal helpers (exported for testing)
  _internal: {
    callAgent,
    callMerchantAgent,
    callMerchantAgentForTracking,
    callSupportCopilot,
    callSalesCopilot,
    buildAcpMessage,
    shapeMerchantAgentResponse,
    resolveMerchantId
  }
};