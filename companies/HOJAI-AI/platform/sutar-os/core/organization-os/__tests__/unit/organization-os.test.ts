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