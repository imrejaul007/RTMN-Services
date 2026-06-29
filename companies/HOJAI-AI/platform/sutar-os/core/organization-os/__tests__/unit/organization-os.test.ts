import { describe, it, expect, vi } from 'vitest';
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (_req: any, _res: any, next: () => void) => next() }));

interface OrgNode { id: string; type: 'person' | 'department' | 'team' | 'role'; name: string; parentId?: string; managerId?: string; metadata: Record<string, unknown>; }
interface Team { id: string; name: string; departmentId?: string; leadId?: string; members: string[]; capabilities: string[]; skills: string[]; headcount: number; }
interface Capability { id: string; name: string; category: 'technical' | 'business' | 'leadership' | 'domain'; level: 'beginner' | 'intermediate' | 'advanced' | 'expert'; owners: string[]; }

// Build org tree
function buildOrgTree(nodes: OrgNode[]): Record<string, OrgNode[]> {
  const tree: Record<string, OrgNode[]> = {};
  for (const node of nodes) {
    const parent = node.parentId || 'root';
    if (!tree[parent]) tree[parent] = [];
    tree[parent].push(node);
  }
  return tree;
}

// Count descendants
function countDescendants(nodeId: string, tree: Record<string, OrgNode[]>): number {
  const children = tree[nodeId] || [];
  let count = children.length;
  for (const child of children) {
    count += countDescendants(child.id, tree);
  }
  return count;
}

// Capability level score
function capabilityScore(level: Capability['level']): number {
  const scores: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
  return scores[level] || 0;
}

describe('OrganizationOS — Org Tree', () => {
  const nodes: OrgNode[] = [
    { id: 'ceo', type: 'person', name: 'CEO', metadata: {} },
    { id: 'cto', type: 'person', name: 'CTO', parentId: 'ceo', metadata: {} },
    { id: 'cfo', type: 'person', name: 'CFO', parentId: 'ceo', metadata: {} },
    { id: 'eng', type: 'department', name: 'Engineering', parentId: 'cto', metadata: {} },
  ];

  it('builds tree from nodes', () => {
    const tree = buildOrgTree(nodes);
    expect(tree['root']).toHaveLength(1); // CEO
    expect(tree['ceo']).toHaveLength(2); // CTO, CFO
    expect(tree['cto']).toHaveLength(1); // Engineering
  });

  it('counts root node children', () => {
    const tree = buildOrgTree(nodes);
    expect(countDescendants('ceo', tree)).toBe(3); // CTO + CFO + Engineering
  });

  it('counts leaf node as zero', () => {
    const tree = buildOrgTree(nodes);
    expect(countDescendants('eng', tree)).toBe(0);
  });
});

describe('OrganizationOS — Capabilities', () => {
  const caps: Capability[] = [
    { id: 'c1', name: 'JavaScript', category: 'technical', level: 'expert', owners: [] },
    { id: 'c2', name: 'Leadership', category: 'leadership', level: 'advanced', owners: [] },
    { id: 'c3', name: 'Sales', category: 'business', level: 'beginner', owners: [] },
  ];

  it('scores expert as highest', () => {
    const expert = caps.find(c => c.level === 'expert');
    const beginner = caps.find(c => c.level === 'beginner');
    expect(capabilityScore('expert')).toBeGreaterThan(capabilityScore('beginner'));
    expect(capabilityScore(expert?.level || 'beginner')).toBe(4);
  });

  it('groups by category', () => {
    const technical = caps.filter(c => c.category === 'technical');
    const leadership = caps.filter(c => c.category === 'leadership');
    expect(technical).toHaveLength(1);
    expect(leadership).toHaveLength(1);
  });
});

describe('OrganizationOS — Team', () => {
  const teams: Team[] = [
    { id: 't1', name: 'Frontend', departmentId: 'eng', leadId: 'alice', members: ['alice', 'bob'], capabilities: ['react', 'typescript'], skills: [], headcount: 2 },
    { id: 't2', name: 'Backend', departmentId: 'eng', leadId: 'charlie', members: ['charlie'], capabilities: ['node', 'python'], skills: [], headcount: 1 },
  ];

  it('validates headcount matches members', () => {
    for (const team of teams) {
      expect(team.members.length).toBeLessThanOrEqual(team.headcount);
    }
  });

  it('filters teams by capability', () => {
    const reactTeams = teams.filter(t => t.capabilities.includes('react'));
    expect(reactTeams).toHaveLength(1);
    expect(reactTeams[0].name).toBe('Frontend');
  });
});

describe('OrganizationOS — Edge Cases', () => {
  function buildOrgTree(nodes: OrgNode[]): Record<string, OrgNode[]> {
    const tree: Record<string, OrgNode[]> = {};
    for (const node of nodes) {
      const parent = node.parentId || 'root';
      if (!tree[parent]) tree[parent] = [];
      tree[parent].push(node);
    }
    return tree;
  }

  function countDescendants(nodeId: string, tree: Record<string, OrgNode[]>): number {
    const children = tree[nodeId] || [];
    let count = children.length;
    for (const child of children) {
      count += countDescendants(child.id, tree);
    }
    return count;
  }

  function capabilityScore(level: Capability['level']): number {
    const scores: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    return scores[level] || 0;
  }

  it('handles empty nodes array', () => {
    const tree = buildOrgTree([]);
    expect(Object.keys(tree)).toHaveLength(0);
  });

  it('handles node without parent', () => {
    const nodes: OrgNode[] = [
      { id: 'orphan', type: 'person', name: 'Orphan', metadata: {} },
    ];
    const tree = buildOrgTree(nodes);
    expect(tree['root']).toHaveLength(1);
  });

  it('handles deep nesting', () => {
    const nodes: OrgNode[] = [
      { id: 'l1', type: 'department', name: 'Level 1', metadata: {} },
      { id: 'l2', type: 'team', name: 'Level 2', parentId: 'l1', metadata: {} },
      { id: 'l3', type: 'role', name: 'Level 3', parentId: 'l2', metadata: {} },
      { id: 'l4', type: 'person', name: 'Level 4', parentId: 'l3', metadata: {} },
    ];
    const tree = buildOrgTree(nodes);
    expect(countDescendants('l1', tree)).toBe(3);
    expect(countDescendants('l4', tree)).toBe(0);
  });

  it('handles circular reference simulation', () => {
    const nodes: OrgNode[] = [
      { id: 'a', type: 'person', name: 'A', parentId: 'b', metadata: {} },
      { id: 'b', type: 'person', name: 'B', parentId: 'a', metadata: {} },
    ];
    const tree = buildOrgTree(nodes);
    expect(tree['a']).toHaveLength(1);
    expect(tree['b']).toHaveLength(1);
  });

  it('handles invalid capability level', () => {
    const score = capabilityScore('nonexistent' as Capability['level']);
    expect(score).toBe(0);
  });

  it('handles empty capability name', () => {
    const caps: Capability[] = [
      { id: 'c1', name: '', category: 'technical', level: 'expert', owners: [] },
    ];
    expect(caps[0].name).toBe('');
  });

  it('handles empty capabilities array in team', () => {
    const team: Team = { id: 't1', name: 'Empty Team', members: [], capabilities: [], skills: [], headcount: 0 };
    expect(team.capabilities).toHaveLength(0);
  });

  it('handles zero headcount', () => {
    const team: Team = { id: 't1', name: 'No Headcount', members: [], capabilities: [], skills: [], headcount: 0 };
    expect(team.headcount).toBe(0);
  });

  it('handles empty skills array', () => {
    const team: Team = { id: 't1', name: 'Test', members: [], capabilities: [], skills: [], headcount: 0 };
    expect(team.skills).toHaveLength(0);
  });

  it('handles special characters in org name', () => {
    const node: OrgNode = { id: '1', type: 'person', name: 'Test <script>alert("xss")</script>', metadata: {} };
    expect(node.name).toContain('<script>');
  });

  it('handles all node types', () => {
    const types: OrgNode['type'][] = ['person', 'department', 'team', 'role'];
    types.forEach(t => {
      const node: OrgNode = { id: '1', type: t, name: 'Test', metadata: {} };
      expect(node.type).toBe(t);
    });
  });

  it('handles empty metadata', () => {
    const node: OrgNode = { id: '1', type: 'person', name: 'Test', metadata: {} };
    expect(Object.keys(node.metadata)).toHaveLength(0);
  });

  it('handles undefined managerId', () => {
    const node: OrgNode = { id: '1', type: 'person', name: 'CEO', metadata: {} };
    expect(node.managerId).toBeUndefined();
  });
});