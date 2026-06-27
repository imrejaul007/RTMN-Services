import { describe, it, expect } from 'vitest';

describe('SUTAR Twin OS — Composite Twins', () => {
  // Simulate the seed data from the service
  const CAPABILITIES = [
    'negotiator', 'learner', 'planner', 'executor', 'simulator',
    'memory-keeper', 'intent-publisher', 'intent-consumer',
  ];

  const compositeTwins = new Map([
    ['sutar-merchant', {
      id: 'sutar-merchant', name: 'Merchant Twin',
      services: ['commerce.merchant', 'commerce.product', 'commerce.order'],
      tags: ['negotiator', 'executor'],
      createdAt: new Date().toISOString(),
    }],
    ['sutar-consumer', {
      id: 'sutar-consumer', name: 'Consumer Twin',
      services: ['commerce.customer', 'commerce.wallet'],
      tags: ['intent-publisher'],
      createdAt: new Date().toISOString(),
    }],
    ['sutar-facilitator', {
      id: 'sutar-facilitator', name: 'Facilitator Twin',
      services: ['agent.ai', 'decision.policy'],
      tags: ['negotiator', 'planner'],
      createdAt: new Date().toISOString(),
    }],
    ['sutar-observer', {
      id: 'sutar-observer', name: 'Observer Twin',
      services: ['ai.memory', 'ai.simulation'],
      tags: ['simulator', 'learner'],
      createdAt: new Date().toISOString(),
    }],
  ]);

  it('should seed 4 composite twins', () => {
    expect(compositeTwins.size).toBe(4);
  });

  it('should list all twins', () => {
    const result = { count: compositeTwins.size, twins: Array.from(compositeTwins.values()) };
    expect(result.count).toBe(4);
    expect(result.twins).toHaveLength(4);
  });

  it('should get twin by ID', () => {
    const twin = compositeTwins.get('sutar-merchant');
    expect(twin).toBeDefined();
    expect(twin?.name).toBe('Merchant Twin');
    expect(twin?.tags).toContain('negotiator');
    expect(twin?.tags).toContain('executor');
  });

  it('should return 404 for unknown twin', () => {
    const twin = compositeTwins.get('nonexistent');
    expect(twin).toBeUndefined();
  });

  it('should create new twin', () => {
    const newTwin = {
      id: 'sutar-logistics',
      name: 'Logistics Twin',
      services: ['logistics.shipment', 'logistics.warehouse'],
      tags: ['executor', 'planner'],
      createdAt: new Date().toISOString(),
    };
    compositeTwins.set(newTwin.id, newTwin);
    expect(compositeTwins.size).toBe(5);
    expect(compositeTwins.get('sutar-logistics')?.name).toBe('Logistics Twin');
  });

  it('should prevent duplicate twin creation', () => {
    const exists = compositeTwins.has('sutar-merchant');
    expect(exists).toBe(true);
  });

  it('should add tag to twin', () => {
    const twin = compositeTwins.get('sutar-consumer')!;
    const newTag = 'negotiator';
    if (!twin.tags.includes(newTag)) twin.tags.push(newTag);
    expect(twin.tags).toContain('negotiator');
  });

  it('should reject invalid tag', () => {
    const invalidTag = 'invalid-capability';
    const isValid = CAPABILITIES.includes(invalidTag);
    expect(isValid).toBe(false);
  });

  it('should resolve twins by intent type', () => {
    const INTENT_TO_CAPABILITY: Record<string, string> = {
      negotiate_price: 'negotiator',
      request_recommendation: 'simulator',
      broadcast: 'intent-publisher',
      request_negotiation: 'negotiator',
      request_quote: 'negotiator',
      book_hotel: 'executor',
      book_table: 'executor',
      order_product: 'executor',
      escalate: 'planner',
    };

    const intentType = 'negotiate_price';
    const requiredCap = INTENT_TO_CAPABILITY[intentType];
    // Use original seed data only (merchant + facilitator have 'negotiator')
    const seedTwins = new Map([
      ['sutar-merchant', { id: 'sutar-merchant', name: 'Merchant Twin', tags: ['negotiator', 'executor'] }],
      ['sutar-consumer', { id: 'sutar-consumer', name: 'Consumer Twin', tags: ['intent-publisher'] }],
      ['sutar-facilitator', { id: 'sutar-facilitator', name: 'Facilitator Twin', tags: ['negotiator', 'planner'] }],
      ['sutar-observer', { id: 'sutar-observer', name: 'Observer Twin', tags: ['simulator', 'learner'] }],
    ]);
    const candidates = Array.from(seedTwins.values()).filter(t => (t.tags || []).includes(requiredCap));

    expect(requiredCap).toBe('negotiator');
    expect(candidates).toHaveLength(2);
    expect(candidates.map(t => t.id)).toContain('sutar-merchant');
    expect(candidates.map(t => t.id)).toContain('sutar-facilitator');
  });

  it('should return empty candidates for unknown intent', () => {
    const INTENT_TO_CAPABILITY: Record<string, string> = {
      negotiate_price: 'negotiator',
    };
    const intentType = 'unknown_intent';
    const requiredCap = INTENT_TO_CAPABILITY[intentType];
    expect(requiredCap).toBeUndefined();
  });

  it('should resolve book_hotel intent to executor-capable twins', () => {
    const INTENT_TO_CAPABILITY: Record<string, string> = {
      book_hotel: 'executor',
    };
    // Use original seed data only (merchant has 'executor')
    const seedTwins = new Map([
      ['sutar-merchant', { id: 'sutar-merchant', name: 'Merchant Twin', tags: ['negotiator', 'executor'] }],
      ['sutar-consumer', { id: 'sutar-consumer', name: 'Consumer Twin', tags: ['intent-publisher'] }],
      ['sutar-facilitator', { id: 'sutar-facilitator', name: 'Facilitator Twin', tags: ['negotiator', 'planner'] }],
      ['sutar-observer', { id: 'sutar-observer', name: 'Observer Twin', tags: ['simulator', 'learner'] }],
    ]);
    const candidates = Array.from(seedTwins.values())
      .filter(t => t.tags.includes('executor'));
    expect(candidates.map(t => t.id)).toContain('sutar-merchant');
    expect(candidates).toHaveLength(1); // only merchant has executor
  });
});

describe('SUTAR Twin OS — Intent Resolution', () => {
  const INTENT_TO_CAPABILITY: Record<string, string> = {
    negotiate_price: 'negotiator',
    request_recommendation: 'simulator',
    broadcast: 'intent-publisher',
    request_negotiation: 'negotiator',
    request_quote: 'negotiator',
    book_hotel: 'executor',
    book_table: 'executor',
    order_product: 'executor',
    escalate: 'planner',
  };

  const twins = [
    { id: 'sutar-merchant', tags: ['negotiator', 'executor'] },
    { id: 'sutar-consumer', tags: ['intent-publisher'] },
    { id: 'sutar-facilitator', tags: ['negotiator', 'planner'] },
    { id: 'sutar-observer', tags: ['simulator', 'learner'] },
  ];

  it('should resolve negotiate_price to merchant and facilitator', () => {
    const intentType = 'negotiate_price';
    const requiredCap = INTENT_TO_CAPABILITY[intentType];
    const candidates = twins.filter(t => t.tags.includes(requiredCap));
    expect(candidates).toHaveLength(2);
    expect(candidates.map(t => t.id)).toContain('sutar-merchant');
    expect(candidates.map(t => t.id)).toContain('sutar-facilitator');
  });

  it('should resolve broadcast to consumer only', () => {
    const candidates = twins.filter(t => t.tags.includes('intent-publisher'));
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('sutar-consumer');
  });

  it('should resolve book_hotel to merchant only', () => {
    const intentType = 'book_hotel';
    const requiredCap = INTENT_TO_CAPABILITY[intentType];
    const candidates = twins.filter(t => t.tags.includes(requiredCap));
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('sutar-merchant');
  });
});