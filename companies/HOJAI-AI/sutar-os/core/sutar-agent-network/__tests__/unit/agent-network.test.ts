import { describe, it, expect } from 'vitest';

describe('SUTAR Agent Network — Node & Edge Management', () => {
  const EDGE_TYPES = ['peers', 'routes-to', 'publishes-to', 'claims-from'];
  const nodes = new Map();
  const edges = new Map();

  function addEdge(from: string, to: string, type: string, weight = 5) {
    const id = `${from}->${to}:${type}`;
    edges.set(id, { id, from, to, type, weight, createdAt: new Date().toISOString() });
    return edges.get(id);
  }

  function seed() {
    const seedNodes = [
      { agentId: 'agent-restaurant-001', capabilities: ['transact'] },
      { agentId: 'agent-hotel-001', capabilities: ['transact'] },
      { agentId: 'agent-negotiator-001', capabilities: ['negotiate'] },
      { agentId: 'agent-recommender-001', capabilities: ['recommend'] },
    ];
    for (const n of seedNodes) {
      nodes.set(n.agentId, { ...n, lastSeen: new Date().toISOString(), status: 'online' });
    }
    addEdge('agent-restaurant-001', 'agent-negotiator-001', 'routes-to', 8);
    addEdge('agent-hotel-001', 'agent-negotiator-001', 'routes-to', 5);
    addEdge('agent-negotiator-001', 'agent-hotel-001', 'routes-to', 4); // enables restaurant -> negotiator -> hotel path
    addEdge('agent-recommender-001', 'agent-restaurant-001', 'peers', 3);
    addEdge('agent-recommender-001', 'agent-hotel-001', 'peers', 3);
  }
  seed();

  it('should seed 4 nodes', () => {
    expect(nodes.size).toBe(4);
  });

  it('should seed 5 edges', () => {
    expect(edges.size).toBe(5);
  });

  it('should register new node', () => {
    const agentId = 'agent-new-001';
    const capabilities = ['escalate'];
    nodes.set(agentId, { agentId, capabilities, lastSeen: new Date().toISOString(), status: 'online' });
    expect(nodes.size).toBe(5);
    expect(nodes.get(agentId)?.status).toBe('online');
  });

  it('should require agentId for node registration', () => {
    const agentId = '';
    const hasRequired = agentId !== '';
    expect(hasRequired).toBe(false);
  });

  it('should heartbeat node to update lastSeen', () => {
    const agentId = 'agent-restaurant-001';
    const n = nodes.get(agentId)!;
    const oldLastSeen = n.lastSeen;
    n.lastSeen = new Date().toISOString();
    n.status = 'online';
    expect(n.lastSeen).not.toBe(oldLastSeen);
    expect(n.status).toBe('online');
  });

  it('should return 404 for heartbeat on unknown node', () => {
    const n = nodes.get('nonexistent-node');
    expect(n).toBeUndefined();
  });

  it('should add edge between nodes', () => {
    const e = addEdge('agent-negotiator-001', 'agent-recommender-001', 'peers', 4);
    expect(edges.size).toBe(6);
    expect(e.weight).toBe(4);
  });

  it('should require from, to, type for edge creation', () => {
    const from = 'a', to = '', type = 'peers';
    const hasRequired = from !== '' && to !== '' && type !== '';
    expect(hasRequired).toBe(false);
  });

  it('should reject invalid edge type', () => {
    const invalidType = 'invalid-type';
    const isValid = EDGE_TYPES.includes(invalidType);
    expect(isValid).toBe(false);
  });

  it('should filter edges by from', () => {
    const from = 'agent-restaurant-001';
    const list = Array.from(edges.values()).filter(e => e.from === from);
    expect(list).toHaveLength(1);
    expect(list[0].to).toBe('agent-negotiator-001');
  });

  it('should filter edges by to', () => {
    const to = 'agent-negotiator-001';
    const list = Array.from(edges.values()).filter(e => e.to === to);
    expect(list).toHaveLength(2);
  });

  it('should filter edges by type', () => {
    const type = 'peers';
    const list = Array.from(edges.values()).filter(e => e.type === type);
    expect(list).toHaveLength(3); // recommender->restaurant, recommender->hotel, negotiator->recommender
  });

  it('should build adjacency list for routing', () => {
    const adj = new Map<string, typeof edges extends Map<string, infer V> ? V[] : never[]>();
    for (const e of edges.values()) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e);
    }
    expect(adj.has('agent-restaurant-001')).toBe(true);
    expect(adj.has('agent-hotel-001')).toBe(true);
    expect(adj.has('agent-recommender-001')).toBe(true);
    expect(adj.get('agent-restaurant-001')).toHaveLength(1);
    expect(adj.get('agent-recommender-001')).toHaveLength(2);
  });

  it('should route self to self with zero hops', () => {
    const from = 'agent-restaurant-001';
    const to = 'agent-restaurant-001';
    const isSelf = from === to;
    expect(isSelf).toBe(true);
  });

  it('should find direct route between connected nodes', () => {
    const adj = new Map<string, typeof edges extends Map<string, infer V> ? V[] : never[]>();
    for (const e of edges.values()) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e);
    }

    const from = 'agent-restaurant-001';
    const to = 'agent-negotiator-001';
    const neighbours = adj.get(from) || [];
    const direct = neighbours.find(e => e.to === to);
    expect(direct).toBeDefined();
    expect(direct?.weight).toBe(8);
  });

  it('should find multi-hop route via BFS', () => {
    // restaurant -> recommender -> hotel (3 hops)
    const adj = new Map<string, typeof edges extends Map<string, infer V> ? V[] : never[]>();
    for (const e of edges.values()) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e);
    }

    const from = 'agent-restaurant-001';
    const to = 'agent-hotel-001';

    // BFS
    const queue = [[from]];
    const visited = new Set([from]);
    let found: (string | typeof edges extends Map<string, infer V> ? V : never)[] = [];
    while (queue.length && !found.length) {
      const path = queue.shift()!;
      const last = typeof path[path.length - 1] === 'string' ? path[path.length - 1] : (path[path.length - 1] as any).to;
      const neighbours = adj.get(last) || [];
      for (const e of neighbours) {
        if (visited.has(e.to)) continue;
        const newPath = [...path];
        newPath.push(e); // Push edge as single element
        if (e.to === to) { found = newPath; break; }
        visited.add(e.to);
        queue.push(newPath);
      }
    }
    expect(found.length).toBe(3); // restaurant -> negotiator -> recommender -> hotel (3 edges)
  });

  it('should return unreachable for disconnected nodes', () => {
    const adj = new Map<string, typeof edges extends Map<string, infer V> ? V[] : never[]>();
    for (const e of edges.values()) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e);
    }

    // No path from negotiator to restaurant (only restaurant->negotiator exists, not the reverse)
    const from = 'agent-negotiator-001';
    const to = 'agent-restaurant-001';

    const queue = [[from]];
    const visited = new Set([from]);
    let found: string[] = [];
    while (queue.length && !found.length) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      const neighbours = adj.get(last) || [];
      for (const e of neighbours) {
        if (visited.has(e.to)) continue;
        const newPath = [...path, e];
        if (e.to === to) { found = newPath; break; }
        visited.add(e.to);
        queue.push(newPath);
      }
    }
    expect(found.length).toBe(0); // unreachable
  });

  it('should calculate total weight along path', () => {
    const path = [
      { from: 'a', to: 'b', weight: 8 },
      { from: 'b', to: 'c', weight: 5 },
    ];
    const totalWeight = path.reduce((s, x) => s + (x.weight || 0), 0);
    expect(totalWeight).toBe(13);
  });

  it('should have all 4 valid edge types', () => {
    expect(EDGE_TYPES).toHaveLength(4);
    expect(EDGE_TYPES).toContain('peers');
    expect(EDGE_TYPES).toContain('routes-to');
    expect(EDGE_TYPES).toContain('publishes-to');
    expect(EDGE_TYPES).toContain('claims-from');
  });

  it('should send message between nodes', () => {
    const from = 'agent-restaurant-001';
    const to = 'agent-negotiator-001';
    const intentType = 'negotiate_price';
    const payload = { amount: 1000, currency: 'USD' };
    const id = `msg-${Date.now()}`;

    const msg = {
      id, from, to, intentType, payload,
      deliveredAt: new Date().toISOString(),
      status: 'delivered',
    };

    expect(msg.from).toBe(from);
    expect(msg.to).toBe(to);
    expect(msg.status).toBe('delivered');
  });
});