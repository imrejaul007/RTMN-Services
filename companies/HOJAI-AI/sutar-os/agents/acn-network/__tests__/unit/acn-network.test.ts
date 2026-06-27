import { describe, it, expect } from 'vitest';

describe('ACN Network — Agent Types & Status', () => {
  const AGENT_TYPES = {
    GENIE: 'genie',
    MERCHANT: 'merchant',
    SYSTEM: 'system',
    PARTNER: 'partner'
  };

  const AGENT_STATUS = {
    ONLINE: 'online',
    OFFLINE: 'offline',
    BUSY: 'busy',
    AWAY: 'away',
    DND: 'do_not_disturb'
  };

  it('should define all 4 agent types', () => {
    expect(Object.values(AGENT_TYPES)).toHaveLength(4);
    expect(Object.values(AGENT_TYPES)).toContain('genie');
    expect(Object.values(AGENT_TYPES)).toContain('merchant');
    expect(Object.values(AGENT_TYPES)).toContain('system');
    expect(Object.values(AGENT_TYPES)).toContain('partner');
  });

  it('should define all 5 agent statuses', () => {
    expect(Object.values(AGENT_STATUS)).toHaveLength(5);
    expect(Object.values(AGENT_STATUS)).toContain('online');
    expect(Object.values(AGENT_STATUS)).toContain('offline');
    expect(Object.values(AGENT_STATUS)).toContain('busy');
  });
});

describe('ACN Network — Agent Registration', () => {
  const agents = new Map();
  const capabilityIndex = new Map();

  function registerAgent(agentData: { id?: string; name: string; type?: string; owner?: string; capabilities?: string[] }) {
    const agent = {
      id: agentData.id || `agent-${Date.now()}`,
      name: agentData.name,
      type: agentData.type || 'merchant',
      owner: agentData.owner,
      capabilities: agentData.capabilities || [],
      status: 'offline',
      rating: { overall: 0, transactions: 0, reliability: 0, responsiveness: 0 },
      tier: 'basic',
      registeredAt: new Date().toISOString(),
    };
    agents.set(agent.id, agent);
    agent.capabilities.forEach((cap: string) => {
      if (!capabilityIndex.has(cap)) capabilityIndex.set(cap, new Set());
      capabilityIndex.get(cap).add(agent.id);
    });
    return agent;
  }

  function createGenieAgent(userId: string) {
    return registerAgent({
      name: `Genie-${userId}`,
      type: 'genie',
      owner: userId,
      capabilities: ['product_search', 'negotiation', 'order_placement', 'notification'],
    });
  }

  function createMerchantAgent(businessId: string, industry: string) {
    return registerAgent({
      name: `${industry}-merchant`,
      type: 'merchant',
      owner: businessId,
      capabilities: ['product_search', 'negotiation', 'order_placement', 'customer_support'],
    });
  }

  it('should register generic agent', () => {
    const agent = registerAgent({ name: 'Test Agent', type: 'system', owner: 'system' });
    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('Test Agent');
    expect(agent.status).toBe('offline');
  });

  it('should register Genie agent with consumer capabilities', () => {
    const agent = createGenieAgent('user-123');
    expect(agent.type).toBe('genie');
    expect(agent.capabilities).toContain('negotiation');
    expect(agent.capabilities).toContain('order_placement');
  });

  it('should register Merchant agent', () => {
    const agent = createMerchantAgent('biz-001', 'restaurant');
    expect(agent.type).toBe('merchant');
    expect(agent.name).toBe('restaurant-merchant');
  });

  it('should index capabilities for search', () => {
    const agent = registerAgent({ name: 'Cap Test', capabilities: ['negotiation', 'order_placement'] });
    expect(capabilityIndex.has('negotiation')).toBe(true);
    expect(capabilityIndex.get('negotiation')?.has(agent.id)).toBe(true);
  });

  it('should update agent status', () => {
    const agent = registerAgent({ name: 'Status Test', capabilities: ['test'] });
    agent.status = 'online';
    agents.set(agent.id, agent);
    expect(agents.get(agent.id)?.status).toBe('online');
  });

  it('should track online agents separately', () => {
    registerAgent({ name: 'Online Agent 1', capabilities: [] });
    registerAgent({ name: 'Online Agent 2', capabilities: [] });
    registerAgent({ name: 'Offline Agent', capabilities: [] });
    // Mark first two as online
    for (const [id, agent] of agents) {
      if (agent.name.startsWith('Online')) {
        agent.status = 'online';
        agents.set(id, agent);
      }
    }
    const online = Array.from(agents.values()).filter(a => a.status === 'online');
    expect(online).toHaveLength(2);
  });
});

describe('ACN Network — Agent Search', () => {
  const agents = [
    { id: 'a1', type: 'genie', status: 'online', verified: true, tier: 'personal', rating: { overall: 4.5 }, capabilities: ['negotiation'] },
    { id: 'a2', type: 'merchant', status: 'online', verified: true, tier: 'pro', rating: { overall: 4.2 }, capabilities: ['negotiation', 'order_placement'] },
    { id: 'a3', type: 'merchant', status: 'offline', verified: false, tier: 'basic', rating: { overall: 3.0 }, capabilities: ['negotiation'] },
    { id: 'a4', type: 'system', status: 'online', verified: true, tier: 'enterprise', rating: { overall: 5.0 }, capabilities: ['customer_support'] },
  ];

  function searchAgents(criteria: { type?: string; status?: string; verified?: boolean; tier?: string; capabilities?: string[]; minRating?: number; sortBy?: string }) {
    let results = [...agents];
    if (criteria.type) results = results.filter(a => a.type === criteria.type);
    if (criteria.status) results = results.filter(a => a.status === criteria.status);
    if (criteria.verified !== undefined) results = results.filter(a => a.verified === criteria.verified);
    if (criteria.tier) results = results.filter(a => a.tier === criteria.tier);
    if (criteria.capabilities?.length) results = results.filter(a => criteria.capabilities!.every(c => a.capabilities.includes(c)));
    if (criteria.minRating) results = results.filter(a => a.rating.overall >= criteria.minRating);
    if (criteria.sortBy === 'rating') results.sort((a, b) => b.rating.overall - a.rating.overall);
    return results;
  }

  it('should filter by type', () => {
    const results = searchAgents({ type: 'merchant' });
    expect(results).toHaveLength(2);
    expect(results.every(a => a.type === 'merchant')).toBe(true);
  });

  it('should filter by status', () => {
    const results = searchAgents({ status: 'online' });
    expect(results).toHaveLength(3);
  });

  it('should filter by verified', () => {
    const results = searchAgents({ verified: true });
    expect(results).toHaveLength(3);
  });

  it('should filter by capabilities (AND logic)', () => {
    const results = searchAgents({ capabilities: ['negotiation', 'order_placement'] });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('a2');
  });

  it('should filter by minimum rating', () => {
    const results = searchAgents({ minRating: 4.0 });
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id)).toContain('a1');
    expect(results.map(r => r.id)).toContain('a2');
  });

  it('should sort by rating', () => {
    const results = searchAgents({ sortBy: 'rating' });
    expect(results[0].id).toBe('a4'); // 5.0 rating
    expect(results[3].id).toBe('a3'); // 3.0 rating
  });

  it('should combine multiple filters', () => {
    const results = searchAgents({ type: 'merchant', status: 'online', verified: true });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('a2');
  });
});

describe('ACN Network — Agent Scoring', () => {
  function calculateAgentScore(agent: { verified: boolean; tier: string; rating: { transactions: number; overall: number } }) {
    let score = agent.rating.overall * 20;
    if (agent.verified) score += 10;
    if (agent.tier === 'enterprise') score += 20;
    else if (agent.tier === 'pro') score += 10;
    if (agent.rating.transactions > 1000) score += 15;
    else if (agent.rating.transactions > 100) score += 5;
    return Math.min(100, score);
  }

  it('should score verified enterprise agent highly', () => {
    const score = calculateAgentScore({ verified: true, tier: 'enterprise', rating: { transactions: 2000, overall: 4.5 } });
    expect(score).toBe(100); // 90 + 10 + 20 + 15 = 135, capped at 100
  });

  it('should score basic agent lower', () => {
    const score = calculateAgentScore({ verified: false, tier: 'basic', rating: { transactions: 10, overall: 3.0 } });
    expect(score).toBe(60); // 60 + 0 + 0 + 0
  });

  it('should cap score at 100', () => {
    const score = calculateAgentScore({ verified: true, tier: 'enterprise', rating: { transactions: 5000, overall: 5.0 } });
    expect(score).toBe(100);
  });
});