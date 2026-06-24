/**
 * SUTAR Agent Router — dispatches classified messages to the right SUTAR agent.
 *
 * In production, this would call out to merchant-agents, agent-orchestration,
 * etc. For the MVP, we generate contextual replies locally so the widget
 * works end-to-end without requiring all SUTAR services to be running.
 *
 * The replies are crafted to feel natural and demonstrate intent handling.
 * Once SUTAR agents are wired, this module becomes the dispatcher.
 */

const SUTAR_AGENT_URL = process.env.SUTAR_AGENT_URL || 'http://localhost:4737';
const SUTAR_ROUTER_ENABLED = process.env.SUTAR_ROUTER_ENABLED === 'true';
const SUTAR_TIMEOUT = parseInt(process.env.SUTAR_TIMEOUT_MS || '5000');

async function callSutarAgent(endpoint, body) {
  if (!SUTAR_ROUTER_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUTAR_TIMEOUT);
    const res = await fetch(`${SUTAR_AGENT_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : json;
  } catch {
    return null;
  }
}

// Local reply generators (used when SUTAR agents are not available)
const REPLY_BUILDERS = {
  product_search: ({ message, context }) => {
    const enriched = context.enriched;
    const products = enriched?.products || enriched?.recommendations || [];
    let reply = `I can help you find products. `;
    if (products.length > 0) {
      reply += `I found ${products.length} item${products.length > 1 ? 's' : ''} that might match what you're looking for:`;
      return {
        reply,
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
      reply: reply + `Could you tell me more about what you're looking for? For example, the category, price range, or specific features.`,
      rich: null
    };
  },

  place_order: ({ message }) => ({
    reply: `I'd love to help you place an order. Could you confirm what you'd like to buy and the quantity? I can also check availability and find the best deal for you.`,
    rich: { type: 'cart_prompt' }
  }),

  book_appointment: ({ message, context }) => {
    const enriched = context.enriched;
    if (enriched?.slots) {
      return {
        reply: `Great, I'd be happy to book that for you. I have these times available:`,
        rich: {
          type: 'time_slots',
          slots: enriched.slots.slice(0, 6)
        }
      };
    }
    return {
      reply: `I can help you book that. What date and time work best for you?`,
      rich: { type: 'booking_prompt' }
    };
  },

  track_order: ({ message }) => ({
    reply: `Let me check on that for you. Could you share your order number? It usually starts with letters like "ORD" or "REZ".`,
    rich: { type: 'order_lookup' }
  }),

  get_support: ({ message, context }) => {
    const enriched = context.enriched;
    if (enriched?.previousTickets?.length) {
      return {
        reply: `I see you have previous tickets with us. Let me pull those up.`,
        rich: {
          type: 'tickets',
          items: enriched.previousTickets.slice(0, 3)
        }
      };
    }
    return {
      reply: `I'm sorry you're having trouble. I can help you with that. Could you describe what's going on in a bit more detail? If you'd prefer to speak with a human, just say "speak to a human" and I'll connect you.`,
      rich: null
    };
  },

  ask_question: ({ message, context }) => {
    const enriched = context.enriched;
    if (enriched?.faqMatch) {
      return {
        reply: enriched.faqMatch.answer,
        rich: { type: 'faq', source: enriched.faqMatch.source }
      };
    }
    return {
      reply: `That's a great question. Based on what I know, here's what I can tell you — but if you need more detail, I'm happy to connect you with someone who can help.`,
      rich: null
    };
  },

  negotiate_price: ({ message }) => ({
    reply: `Let me check what I can do for you. For bulk orders or repeat customers, we often have flexible pricing. What's your use case, and what quantity are you looking at?`,
    rich: { type: 'pricing_prompt' }
  }),

  request_quote: ({ message }) => ({
    reply: `I can prepare a custom quote for you. To give you the best price, could you tell me: the quantity you need, your preferred delivery date, and whether you have specific requirements?`,
    rich: { type: 'quote_form' }
  }),

  subscribe: ({ message }) => ({
    reply: `I can help you manage your subscription. Would you like to upgrade, downgrade, pause, or cancel?`,
    rich: { type: 'subscription_actions' }
  }),

  greeting: ({ message, context, user }) => {
    const userName = user?.name || context.user?.name;
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

async function route({ agentRole, intent, companyId, visitorId, message, context, user }) {
  // Try SUTAR agent first
  const agentResult = await callSutarAgent('/api/agents/run', {
    agentRole,
    intent,
    companyId,
    visitorId,
    message,
    context,
    user
  });

  if (agentResult && agentResult.reply) {
    return {
      reply: agentResult.reply,
      rich: agentResult.rich || null,
      source: 'sutar-agent'
    };
  }

  // Fallback to local reply builder
  const builder = REPLY_BUILDERS[intent] || REPLY_BUILDERS.ask_question;
  const result = builder({ message, context, user, agentRole });
  return {
    ...result,
    source: 'local-builder'
  };
}

module.exports = { route, REPLY_BUILDERS };
