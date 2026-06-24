/**
 * Intent classification for widget messages.
 *
 * Two strategies:
 *  1. Try REZ Intelligence /api/v1/intent/classify first (most accurate)
 *  2. Fall back to local keyword-based classifier
 *
 * Each intent maps to a SUTAR agent role. The router then dispatches.
 */

const rezIntel = require('./rez-intel-client');

const INTENTS = {
  product_search: {
    description: 'Visitor is looking for products',
    agent: 'sales',
    examples: [
      'show me black hoodies under ₹2500',
      'do you have vegan pizza?',
      'looking for a gift for my mom',
      'what sizes do you have?'
    ]
  },
  place_order: {
    description: 'Visitor wants to place an order',
    agent: 'commerce',
    examples: [
      'order 2 margherita pizzas',
      'I want to buy the blue shirt',
      'add this to cart and checkout'
    ]
  },
  book_appointment: {
    description: 'Visitor wants to book a service or appointment',
    agent: 'booking',
    examples: [
      'book a table for 2 tomorrow at 7pm',
      'schedule a haircut for Friday',
      'reserve a meeting room'
    ]
  },
  track_order: {
    description: 'Visitor wants to check order status',
    agent: 'support',
    examples: ['where is my order?', 'track shipment #12345', 'has my food arrived?']
  },
  get_support: {
    description: 'Visitor needs help with an issue',
    agent: 'support',
    examples: [
      'my order has not arrived',
      'I want a refund',
      'the app is not working',
      'I need to speak to a human'
    ]
  },
  ask_question: {
    description: 'Visitor has a general question',
    agent: 'assistant',
    examples: [
      'what are your hours?',
      'do you deliver?',
      'what is your return policy?'
    ]
  },
  negotiate_price: {
    description: 'Visitor wants to negotiate a price',
    agent: 'sales',
    examples: ['can you do 10% off?', 'is there a bulk discount?']
  },
  request_quote: {
    description: 'Visitor wants a quote for bulk / custom order',
    agent: 'sales',
    examples: ['quote for 500 units', 'how much for 1000 pieces?']
  },
  subscribe: {
    description: 'Visitor wants to manage a subscription',
    agent: 'commerce',
    examples: ['upgrade my plan', 'cancel subscription', 'switch to annual billing']
  },
  greeting: {
    description: 'Visitor is just saying hello',
    agent: 'assistant',
    examples: ['hi', 'hello', 'hey', 'namaste']
  }
};

// Keyword-based fallback classifier
const KEYWORDS = {
  product_search: ['show me', 'find me', 'looking for', 'do you have', 'have you got', 'search for', 'in stock', 'available in', 'sizes', 'colors'],
  place_order: ['place order', 'i want to buy', 'i want to order', 'add to cart', 'checkout now', 'get me a', 'purchase', 'order me', 'order the', 'order a', 'order some'],
  book_appointment: ['book a', 'reserve a', 'schedule a', 'book table', 'reserve table', 'make appointment', 'set up a meeting', 'reservation for'],
  track_order: ['where is my', 'where is the', 'track my', 'tracking number', 'shipment status', 'has my order arrived', 'has my food arrived', 'delivery status', 'order status'],
  get_support: ['i want a refund', 'need a refund', 'i need help', 'having trouble', 'speak to a human', 'talk to a person', 'this is broken', 'issue with my'],
  ask_question: ['what are', 'what is', 'when do', 'when are', 'how do', 'why do', 'your hours', 'are you open', 'return policy', 'do you deliver'],
  negotiate_price: ['can you do', '% off', 'any discount', 'lower price', 'best price', 'negotiate'],
  request_quote: ['quote for', 'bulk order', 'wholesale price', 'price for 100', 'price for 500', 'cost for 1000'],
  subscribe: ['upgrade my plan', 'downgrade my plan', 'cancel subscription', 'manage subscription', 'switch to annual', 'switch to monthly'],
  // Greeting: must match as a whole word, not substring.
  // We use word-boundary regex below — see classifyLocal().
  greeting: ['hello', 'namaste', 'namaskar', 'good morning', 'good evening', 'howdy']
};

function classifyLocal(message) {
  const m = message.toLowerCase().trim();
  let bestIntent = 'ask_question';
  let bestScore = 0;
  for (const [intent, keywords] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      // Use word-boundary regex for single words, plain substring for multi-word phrases.
      if (kw.includes(' ')) {
        if (m.includes(kw)) score += 2;
      } else {
        const re = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (re.test(m)) score += 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Heuristic: "order <number>" or "order <number> <item>" = place_order
  if (/\border\s+\d+\b/i.test(m) && bestIntent !== 'track_order') {
    bestIntent = 'place_order';
    bestScore = Math.max(bestScore, 4);
  }

  // Detect short greetings (hi, hey) with stricter matching — must be the whole message or start with it.
  if (/^(hi|hey|yo|sup)\b/i.test(m) || /\b(hi|hey)\b\s*[!.]?$/i.test(m)) {
    if (bestScore < 2 || bestIntent === 'ask_question') {
      bestIntent = 'greeting';
      bestScore = 2;
    }
  }

  return {
    intent: bestIntent,
    confidence: bestScore === 0 ? 0.5 : Math.min(0.5 + bestScore * 0.15, 0.95),
    source: 'local-keyword'
  };
}

async function classify({ message, companyId, visitorId, user, context, history }) {
  // Try REZ Intel first
  const rez = await rezIntel.classifyIntent({
    message,
    companyId,
    userId: visitorId,
    user,
    context
  }).catch(() => null);

  if (rez && rez.intent && INTENTS[rez.intent]) {
    return {
      intent: rez.intent,
      agent: INTENTS[rez.intent].agent,
      confidence: rez.confidence || 0.8,
      source: 'rez-intel'
    };
  }

  // Fallback to local classifier
  const local = classifyLocal(message);
  return {
    intent: local.intent,
    agent: INTENTS[local.intent].agent,
    confidence: local.confidence,
    source: local.source
  };
}

module.exports = { classify, classifyLocal, INTENTS };
