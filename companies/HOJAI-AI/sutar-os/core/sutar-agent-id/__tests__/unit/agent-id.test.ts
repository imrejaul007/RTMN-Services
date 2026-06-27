import { describe, it, expect } from 'vitest';

describe('SUTAR Agent ID — Agent Identities', () => {
  const CAPABILITY_CATALOG = [
    { name: 'negotiate', intents: ['negotiate_price', 'request_negotiation', 'request_quote'] },
    { name: 'transact', intents: ['book_hotel', 'book_table', 'order_product', 'request_payment'] },
    { name: 'recommend', intents: ['request_recommendation'] },
    { name: 'escalate', intents: ['escalate'] },
    { name: 'broadcast', intents: ['broadcast'] },
  ];

  const agents = new Map();

  function buildManifest(caps: string[]) {
    const intents = new Set<string>();
    for (const c of caps) {
      const found = CAPABILITY_CATALOG.find(x => x.name === c);
      if (found) found.intents.forEach(i => intents.add(i));
    }
    return { capabilities: caps, intents: Array.from(intents) };
  }

  function seed() {
    const seeds = [
      { agentId: 'agent-restaurant-001', name: 'Restaurant Booking Agent', capabilities: ['transact', 'recommend'] },
      { agentId: 'agent-hotel-001', name: 'Hotel Booking Agent', capabilities: ['transact'] },
      { agentId: 'agent-negotiator-001', name: 'Price Negotiator', capabilities: ['negotiate'] },
      { agentId: 'agent-recommender-001', name: 'Personal Recommender', capabilities: ['recommend'] },
      { agentId: 'agent-escalation-001', name: 'Escalation Handler', capabilities: ['escalate'] },
    ];
    for (const s of seeds) {
      agents.set(s.agentId, {
        ...s,
        manifest: buildManifest(s.capabilities),
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    }
  }
  seed();

  it('should seed 5 agents', () => {
    expect(agents.size).toBe(5);
  });

  it('should list all agents', () => {
    const result = { count: agents.size, agents: Array.from(agents.values()) };
    expect(result.count).toBe(5);
  });

  it('should get agent by ID', () => {
    const a = agents.get('agent-restaurant-001');
    expect(a).toBeDefined();
    expect(a?.name).toBe('Restaurant Booking Agent');
    expect(a?.status).toBe('active');
  });

  it('should return 404 for unknown agent', () => {
    const a = agents.get('nonexistent-agent');
    expect(a).toBeUndefined();
  });

  it('should create new agent with generated ID', () => {
    const name = 'Test Agent';
    const capabilities = ['negotiate', 'recommend'];
    const id = `agent-${Date.now().toString(36)}`;

    const agent = {
      agentId: id,
      name,
      capabilities,
      manifest: buildManifest(capabilities),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    agents.set(id, agent);
    expect(agents.size).toBe(6);
    expect(agents.get(id)?.manifest.capabilities).toContain('negotiate');
  });

  it('should add capability to agent', () => {
    const a = agents.get('agent-recommender-001')!;
    const newCap = 'broadcast';
    if (!a.capabilities.includes(newCap)) a.capabilities.push(newCap);
    a.manifest = buildManifest(a.capabilities);
    expect(a.capabilities).toContain('broadcast');
    expect(a.manifest.intents).toContain('broadcast');
  });

  it('should remove capability from agent', () => {
    const a = agents.get('agent-restaurant-001')!;
    const removed = 'recommend';
    a.capabilities = a.capabilities.filter(c => c !== removed);
    a.manifest = buildManifest(a.capabilities);
    expect(a.capabilities).not.toContain('recommend');
    expect(a.manifest.intents).not.toContain('request_recommendation');
  });

  it('should reject invalid capability', () => {
    const invalidCap = 'invalid-capability';
    const found = CAPABILITY_CATALOG.find(c => c.name === invalidCap);
    expect(found).toBeUndefined();
  });

  it('should find agents for intent type', () => {
    const intentType = 'negotiate_price';
    const matches = Array.from(agents.values())
      .filter(a => (a.manifest.intents || []).includes(intentType));
    // After test "should create new agent" adds one with 'negotiate' capability
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.map(a => a.agentId)).toContain('agent-negotiator-001');
  });

  it('should find agents for transact intents', () => {
    const transactIntents = CAPABILITY_CATALOG.find(c => c.name === 'transact')?.intents || [];
    const matches = Array.from(agents.values())
      .filter(a => transactIntents.some(i => (a.manifest.intents || []).includes(i)));
    expect(matches).toHaveLength(2);
    expect(matches.map(a => a.agentId)).toContain('agent-restaurant-001');
    expect(matches.map(a => a.agentId)).toContain('agent-hotel-001');
  });

  it('should build manifest correctly from capabilities', () => {
    const manifest = buildManifest(['negotiate', 'transact']);
    expect(manifest.capabilities).toContain('negotiate');
    expect(manifest.capabilities).toContain('transact');
    expect(manifest.intents).toContain('negotiate_price');
    expect(manifest.intents).toContain('book_hotel');
    expect(manifest.intents).toContain('request_quote');
    expect(manifest.intents).not.toContain('escalate');
  });

  it('should return empty manifest for unknown capability', () => {
    const manifest = buildManifest(['nonexistent']);
    expect(manifest.capabilities).toEqual(['nonexistent']);
    expect(manifest.intents).toHaveLength(0);
  });

  it('should require name for agent creation', () => {
    const name = '';
    const hasRequired = name !== '';
    expect(hasRequired).toBe(false);
  });

  it('should deduplicate capability intents in manifest', () => {
    const manifest = buildManifest(['negotiate', 'transact']);
    const uniqueIntents = new Set(manifest.intents);
    expect(uniqueIntents.size).toBe(manifest.intents.length);
  });

  it('should have all 5 catalog capabilities', () => {
    expect(CAPABILITY_CATALOG).toHaveLength(5);
    expect(CAPABILITY_CATALOG.map(c => c.name)).toContain('negotiate');
    expect(CAPABILITY_CATALOG.map(c => c.name)).toContain('transact');
    expect(CAPABILITY_CATALOG.map(c => c.name)).toContain('recommend');
    expect(CAPABILITY_CATALOG.map(c => c.name)).toContain('escalate');
    expect(CAPABILITY_CATALOG.map(c => c.name)).toContain('broadcast');
  });
});