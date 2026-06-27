import { describe, it, expect } from 'vitest';

describe('ACP Protocol — Message Types', () => {
  const MESSAGE_TYPES = {
    QUERY: {
      required: ['sender', 'receiver', 'intent', 'context'],
      optional: ['constraints', 'timeline', 'attachments'],
      nextValid: ['QUOTE', 'REJECT']
    },
    QUOTE: {
      required: ['sender', 'receiver', 'offer', 'terms'],
      optional: ['validUntil', 'alternatives', 'negotiableFields'],
      nextValid: ['COUNTER', 'ACCEPT', 'REJECT', 'ORDER']
    },
    COUNTER: {
      required: ['sender', 'receiver', 'counterOffer', 'reasoning'],
      optional: ['concessions', 'deadline', 'conditions'],
      nextValid: ['COUNTER', 'ACCEPT', 'REJECT', 'ORDER']
    },
    ACCEPT: {
      required: ['sender', 'receiver', 'acceptedTerms', 'contractId'],
      optional: ['signature', 'guarantee'],
      nextValid: ['ORDER', 'TRACK', 'DISPUTE']
    },
    REJECT: {
      required: ['sender', 'receiver', 'reason'],
      optional: ['alternativeOffers', 'redirect'],
      nextValid: ['QUERY', 'NEW_NEGOTIATION']
    },
    ORDER: {
      required: ['sender', 'receiver', 'orderDetails', 'contractId'],
      optional: ['deliveryAddress', 'paymentTerms', 'priority'],
      nextValid: ['TRACK', 'DISPUTE', 'REJECT']
    },
    TRACK: {
      required: ['sender', 'receiver', 'orderId'],
      optional: ['milestones', 'eta', 'proofOfDelivery'],
      nextValid: ['TRACK', 'DISPUTE', 'ACCEPT']
    },
    DISPUTE: {
      required: ['sender', 'receiver', 'orderId', 'reason', 'evidence'],
      optional: ['desiredResolution', 'refundAmount'],
      nextValid: ['RESOLVE', 'ESCALATE', 'ARBITRATE']
    }
  };

  it('should define all 8 message types', () => {
    expect(Object.keys(MESSAGE_TYPES)).toHaveLength(8);
    expect(Object.keys(MESSAGE_TYPES)).toContain('QUERY');
    expect(Object.keys(MESSAGE_TYPES)).toContain('QUOTE');
    expect(Object.keys(MESSAGE_TYPES)).toContain('COUNTER');
    expect(Object.keys(MESSAGE_TYPES)).toContain('ACCEPT');
    expect(Object.keys(MESSAGE_TYPES)).toContain('REJECT');
    expect(Object.keys(MESSAGE_TYPES)).toContain('ORDER');
    expect(Object.keys(MESSAGE_TYPES)).toContain('TRACK');
    expect(Object.keys(MESSAGE_TYPES)).toContain('DISPUTE');
  });

  it('should have required fields for each message type', () => {
    for (const [type, def] of Object.entries(MESSAGE_TYPES)) {
      expect(def.required).toBeDefined();
      expect(Array.isArray(def.required)).toBe(true);
      expect(def.required.length).toBeGreaterThan(0);
    }
  });

  it('should have nextValid transitions for each message type', () => {
    for (const [type, def] of Object.entries(MESSAGE_TYPES)) {
      expect(def.nextValid).toBeDefined();
      expect(Array.isArray(def.nextValid)).toBe(true);
      expect(def.nextValid.length).toBeGreaterThan(0);
    }
  });

  it('QUERY requires sender, receiver, intent, context', () => {
    const required = MESSAGE_TYPES.QUERY.required;
    expect(required).toContain('sender');
    expect(required).toContain('receiver');
    expect(required).toContain('intent');
    expect(required).toContain('context');
  });

  it('QUOTE requires sender, receiver, offer, terms', () => {
    const required = MESSAGE_TYPES.QUOTE.required;
    expect(required).toContain('sender');
    expect(required).toContain('receiver');
    expect(required).toContain('offer');
    expect(required).toContain('terms');
  });

  it('ACCEPT requires contractId (leads to order)', () => {
    const required = MESSAGE_TYPES.ACCEPT.required;
    expect(required).toContain('contractId');
    expect(MESSAGE_TYPES.ACCEPT.nextValid).toContain('ORDER');
  });

  it('ORDER cannot follow QUERY directly (must ACCEPT first)', () => {
    expect(MESSAGE_TYPES.QUERY.nextValid).not.toContain('ORDER');
    expect(MESSAGE_TYPES.ACCEPT.nextValid).toContain('ORDER');
  });

  it('DISPUTE requires orderId and evidence', () => {
    const required = MESSAGE_TYPES.DISPUTE.required;
    expect(required).toContain('orderId');
    expect(required).toContain('evidence');
  });
});

describe('ACP Protocol — Negotiation States', () => {
  const NEGOTIATION_STATES = {
    INITIATED: 'initiated',
    QUERY_SENT: 'query_sent',
    QUOTE_RECEIVED: 'quote_received',
    NEGOTIATING: 'negotiating',
    COUNTERED: 'countered',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    ORDER_PLACED: 'order_placed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    DISPUTED: 'disputed',
    CANCELLED: 'cancelled'
  };

  it('should define all negotiation states', () => {
    expect(Object.keys(NEGOTIATION_STATES)).toHaveLength(12);
  });

  it('should have INITIATED as initial state', () => {
    expect(NEGOTIATION_STATES.INITIATED).toBe('initiated');
  });

  it('should have terminal states', () => {
    expect(NEGOTIATION_STATES.COMPLETED).toBe('completed');
    expect(NEGOTIATION_STATES.REJECTED).toBe('rejected');
    expect(NEGOTIATION_STATES.DISPUTED).toBe('disputed');
    expect(NEGOTIATION_STATES.CANCELLED).toBe('cancelled');
  });

  it('should track negotiation lifecycle', () => {
    const states = [
      NEGOTIATION_STATES.INITIATED,
      NEGOTIATION_STATES.QUERY_SENT,
      NEGOTIATION_STATES.QUOTE_RECEIVED,
      NEGOTIATION_STATES.NEGOTIATING,
      NEGOTIATION_STATES.COUNTERED,
      NEGOTIATION_STATES.ACCEPTED,
      NEGOTIATION_STATES.ORDER_PLACED,
    ];
    expect(states).toHaveLength(7);
    expect(states[0]).toBe('initiated');
    expect(states[6]).toBe('order_placed');
  });
});

describe('ACP Protocol — Message Creation', () => {
  const MESSAGE_TYPES = {
    QUERY: { required: ['sender', 'receiver', 'intent', 'context'], nextValid: ['QUOTE', 'REJECT'] },
    QUOTE: { required: ['sender', 'receiver', 'offer', 'terms'], nextValid: ['COUNTER', 'ACCEPT', 'REJECT', 'ORDER'] },
    ACCEPT: { required: ['sender', 'receiver', 'acceptedTerms', 'contractId'], nextValid: ['ORDER', 'TRACK', 'DISPUTE'] },
  };

  function createMessage(type: string, payload: Record<string, unknown>) {
    const messageType = MESSAGE_TYPES[type as keyof typeof MESSAGE_TYPES];
    if (!messageType) throw new Error(`Invalid message type: ${type}`);
    const missing = messageType.required.filter((field: string) => !payload[field]);
    if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(', ')}`);
    return { id: `msg-${Date.now()}`, type, timestamp: new Date().toISOString(), status: 'pending', ...payload };
  }

  it('should create QUERY message with all required fields', () => {
    const msg = createMessage('QUERY', {
      sender: 'buyer-agent',
      receiver: 'seller-agent',
      intent: 'buy_100_units',
      context: { product: 'widget', quantity: 100 }
    });
    expect(msg.type).toBe('QUERY');
    expect(msg.sender).toBe('buyer-agent');
    expect(msg.receiver).toBe('seller-agent');
    expect(msg.status).toBe('pending');
  });

  it('should create QUOTE message', () => {
    const msg = createMessage('QUOTE', {
      sender: 'seller-agent',
      receiver: 'buyer-agent',
      offer: { price: 500, currency: 'USD' },
      terms: { product: 'widget', delivery: '2_weeks' }
    });
    expect(msg.type).toBe('QUOTE');
    expect(msg.offer.price).toBe(500);
  });

  it('should throw on missing required fields', () => {
    expect(() => createMessage('QUERY', { sender: 'a', receiver: 'b' }))
      .toThrow('Missing required fields');
  });

  it('should throw on invalid message type', () => {
    expect(() => createMessage('INVALID', { sender: 'a', receiver: 'b', intent: 'x', context: {} }))
      .toThrow('Invalid message type');
  });
});

describe('ACP Protocol — Negotiation Lifecycle', () => {
  function createNegotiation(buyerAgent: string, sellerAgent: string) {
    return {
      id: `neg-${Date.now()}`,
      buyerAgent,
      sellerAgent,
      state: 'initiated',
      messages: [],
      currentOffer: null,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function processMessage(negotiation: Record<string, unknown>, message: { type: string; sender: string; offer?: unknown; reason?: string }) {
    const msgType = message.type;
    if (msgType === 'QUERY') negotiation.state = 'query_sent';
    if (msgType === 'QUOTE') {
      negotiation.state = 'quote_received';
      negotiation.currentOffer = message.offer;
    }
    if (msgType === 'COUNTER') negotiation.state = 'countered';
    if (msgType === 'ACCEPT') negotiation.state = 'accepted';
    if (msgType === 'REJECT') negotiation.state = 'rejected';
    if (msgType === 'ORDER') negotiation.state = 'order_placed';
    if (msgType === 'DISPUTE') negotiation.state = 'disputed';
    negotiation.messages.push({ type: msgType, sender: message.sender });
    return negotiation;
  }

  it('should create negotiation in INITIATED state', () => {
    const neg = createNegotiation('buyer', 'seller');
    expect(neg.state).toBe('initiated');
    expect(neg.buyerAgent).toBe('buyer');
    expect(neg.sellerAgent).toBe('seller');
    expect(neg.messages).toHaveLength(0);
  });

  it('should transition to QUERY_SENT on QUERY', () => {
    const neg = createNegotiation('buyer', 'seller');
    processMessage(neg, { type: 'QUERY', sender: 'buyer' });
    expect(neg.state).toBe('query_sent');
    expect(neg.messages).toHaveLength(1);
  });

  it('should transition to QUOTE_RECEIVED on QUOTE', () => {
    const neg = createNegotiation('buyer', 'seller');
    processMessage(neg, { type: 'QUERY', sender: 'buyer' });
    processMessage(neg, { type: 'QUOTE', sender: 'seller', offer: { price: 100 } });
    expect(neg.state).toBe('quote_received');
    expect(neg.currentOffer).toEqual({ price: 100 });
  });

  it('should complete full lifecycle: INITIATED → QUERY → QUOTE → ACCEPT → ORDER', () => {
    const neg = createNegotiation('buyer', 'seller');
    processMessage(neg, { type: 'QUERY', sender: 'buyer' });
    expect(neg.state).toBe('query_sent');

    processMessage(neg, { type: 'QUOTE', sender: 'seller', offer: { price: 500 } });
    expect(neg.state).toBe('quote_received');

    processMessage(neg, { type: 'COUNTER', sender: 'buyer', offer: { price: 450 } });
    expect(neg.state).toBe('countered');

    processMessage(neg, { type: 'ACCEPT', sender: 'buyer' });
    expect(neg.state).toBe('accepted');

    processMessage(neg, { type: 'ORDER', sender: 'buyer' });
    expect(neg.state).toBe('order_placed');
  });

  it('should reach REJECTED state', () => {
    const neg = createNegotiation('buyer', 'seller');
    processMessage(neg, { type: 'QUERY', sender: 'buyer' });
    processMessage(neg, { type: 'QUOTE', sender: 'seller', offer: { price: 1000 } });
    processMessage(neg, { type: 'REJECT', sender: 'buyer', reason: 'Price too high' });
    expect(neg.state).toBe('rejected');
  });

  it('should reach DISPUTED state', () => {
    const neg = createNegotiation('buyer', 'seller');
    neg.state = 'order_placed';
    processMessage(neg, { type: 'DISPUTE', sender: 'buyer' });
    expect(neg.state).toBe('disputed');
  });

  it('should accumulate messages in history', () => {
    const neg = createNegotiation('buyer', 'seller');
    processMessage(neg, { type: 'QUERY', sender: 'buyer' });
    processMessage(neg, { type: 'QUOTE', sender: 'seller', offer: {} });
    processMessage(neg, { type: 'COUNTER', sender: 'buyer', offer: {} });
    expect(neg.messages).toHaveLength(3);
    expect(neg.messages[0].type).toBe('QUERY');
    expect(neg.messages[2].type).toBe('COUNTER');
  });
});

describe('ACP Protocol — Message Summary', () => {
  function getMessageSummary(message: { type: string; intent?: string; offer?: { price?: number }; reason?: string }) {
    switch (message.type) {
      case 'QUERY': return `QUERY: ${message.intent}`;
      case 'QUOTE': return `QUOTE: $${message.offer?.price || 'TBD'}`;
      case 'REJECT': return `REJECTED: ${message.reason}`;
      default: return `${message.type}`;
    }
  }

  it('should summarize QUERY with intent', () => {
    expect(getMessageSummary({ type: 'QUERY', intent: 'buy_widget' })).toBe('QUERY: buy_widget');
  });

  it('should summarize QUOTE with price', () => {
    expect(getMessageSummary({ type: 'QUOTE', offer: { price: 500 } })).toBe('QUOTE: $500');
  });

  it('should summarize QUOTE with TBD when no price', () => {
    expect(getMessageSummary({ type: 'QUOTE' })).toBe('QUOTE: $TBD');
  });

  it('should summarize REJECT with reason', () => {
    expect(getMessageSummary({ type: 'REJECT', reason: 'Price too high' })).toBe('REJECTED: Price too high');
  });
});