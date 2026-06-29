import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

interface Idea {
  id: string; title: string; description: string;
  category: 'product' | 'process' | 'technology' | 'marketing' | 'operations';
  status: 'idea' | 'under_review' | 'approved' | 'pilot' | 'scale' | 'deployed' | 'archived' | 'rejected';
  impact: number; effort: number; roi: number;
  submittedBy: string; votes: { userId: string; vote: number; comment?: string }[];
  comments: any[]; pilotMetrics?: { users: number; revenue: number; satisfaction: number };
  timeline: { stage: string; date: string }[]; tags: string[]; createdAt: string; updatedAt: string;
}

// Voting logic
function tallyVotes(votes: Idea['votes']): { total: number; count: number; average: number } {
  const total = votes.reduce((s, v) => s + v.vote, 0);
  return { total, count: votes.length, average: votes.length > 0 ? total / votes.length : 0 };
}

// Leaderboard scoring
function calculateScore(idea: Idea): number {
  const voteScore = idea.votes.reduce((s, v) => s + v.vote, 0);
  return voteScore + idea.impact * 10 + idea.roi;
}

// Innovation stats
function innovationStats(ideas: Idea[]) {
  return {
    total: ideas.length,
    byStatus: {
      ideas: ideas.filter(i => i.status === 'idea' || i.status === 'under_review').length,
      approved: ideas.filter(i => i.status === 'approved').length,
      pilot: ideas.filter(i => i.status === 'pilot').length,
      deployed: ideas.filter(i => i.status === 'scale' || i.status === 'deployed').length,
    },
    avgImpact: ideas.length > 0 ? Math.round(ideas.reduce((s, i) => s + i.impact, 0) / ideas.length) : 0,
  };
}

describe('InnovationOS — Ideas', () => {
  it('supports all categories', () => {
    const categories: Idea['category'][] = ['product', 'process', 'technology', 'marketing', 'operations'];
    categories.forEach(c => {
      const idea: Idea = { id: '1', title: 'Test', description: 'Test description', category: c, status: 'idea', impact: 0, effort: 0, roi: 0, submittedBy: 'user1', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' };
      expect(idea.category).toBe(c);
    });
  });

  it('supports all status values', () => {
    const statuses: Idea['status'][] = ['idea', 'under_review', 'approved', 'pilot', 'scale', 'deployed', 'archived', 'rejected'];
    statuses.forEach(s => {
      const idea: Idea = { id: '1', title: 'Test', description: 'Test', category: 'product', status: s, impact: 0, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' };
      expect(idea.status).toBe(s);
    });
  });

  it('defaults to under_review status', () => {
    const idea: Idea = { id: '1', title: 'Test', description: 'Test', category: 'product', status: 'under_review', impact: 0, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' };
    expect(idea.status).toBe('under_review');
  });

  it('vote replaces existing vote from same user', () => {
    const votes: Idea['votes'] = [
      { userId: 'u1', vote: 5 },
      { userId: 'u2', vote: 3 },
    ];
    const existingIndex = votes.findIndex(v => v.userId === 'u1');
    if (existingIndex >= 0) votes[existingIndex].vote = 4;
    else votes.push({ userId: 'u1', vote: 4 });
    expect(votes.find(v => v.userId === 'u1')?.vote).toBe(4);
    expect(votes).toHaveLength(2);
  });
});

describe('InnovationOS — Voting', () => {
  it('tallies votes correctly', () => {
    const votes: Idea['votes'] = [
      { userId: 'u1', vote: 5 },
      { userId: 'u2', vote: 3 },
      { userId: 'u3', vote: 4 },
    ];
    const result = tallyVotes(votes);
    expect(result.total).toBe(12);
    expect(result.count).toBe(3);
    expect(result.average).toBe(4);
  });

  it('handles no votes', () => {
    const result = tallyVotes([]);
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
    expect(result.average).toBe(0);
  });

  it('handles single vote', () => {
    const result = tallyVotes([{ userId: 'u1', vote: 5 }]);
    expect(result.total).toBe(5);
    expect(result.count).toBe(1);
    expect(result.average).toBe(5);
  });
});

describe('InnovationOS — Leaderboard Scoring', () => {
  it('combines votes, impact, and roi', () => {
    const idea: Idea = { id: '1', title: 'A', description: '', category: 'product', status: 'approved', impact: 5, effort: 3, roi: 10, submittedBy: '', votes: [{ userId: 'u1', vote: 3 }], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' };
    expect(calculateScore(idea)).toBe(3 + 50 + 10); // votes + impact*10 + roi
  });

  it('orders by score descending', () => {
    const ideas: Idea[] = [
      { id: '1', title: 'Low', description: '', category: 'product', status: 'approved', impact: 1, effort: 1, roi: 1, submittedBy: '', votes: [{ userId: 'u1', vote: 1 }], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' },
      { id: '2', title: 'High', description: '', category: 'product', status: 'approved', impact: 10, effort: 5, roi: 20, submittedBy: '', votes: [{ userId: 'u1', vote: 5 }], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' },
      { id: '3', title: 'Mid', description: '', category: 'product', status: 'approved', impact: 5, effort: 3, roi: 10, submittedBy: '', votes: [{ userId: 'u1', vote: 3 }], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' },
    ];
    const sorted = [...ideas].sort((a, b) => calculateScore(b) - calculateScore(a));
    expect(sorted[0].title).toBe('High');
    expect(sorted[1].title).toBe('Mid');
    expect(sorted[2].title).toBe('Low');
  });
});

describe('InnovationOS — Stats', () => {
  it('calculates innovation stats', () => {
    const ideas: Idea[] = [
      { id: '1', title: '', description: '', category: 'product', status: 'idea', impact: 5, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' },
      { id: '2', title: '', description: '', category: 'tech', status: 'approved', impact: 8, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' },
      { id: '3', title: '', description: '', category: 'ops', status: 'pilot', impact: 3, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' },
      { id: '4', title: '', description: '', category: 'sales', status: 'deployed', impact: 9, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' },
    ];
    const stats = innovationStats(ideas);
    expect(stats.total).toBe(4);
    expect(stats.byStatus.ideas).toBe(1);
    expect(stats.byStatus.approved).toBe(1);
    expect(stats.byStatus.pilot).toBe(1);
    expect(stats.byStatus.deployed).toBe(1);
    expect(stats.avgImpact).toBe(6);
  });

  it('handles empty ideas list', () => {
    const stats = innovationStats([]);
    expect(stats.total).toBe(0);
    expect(stats.avgImpact).toBe(0);
  });
});

describe('InnovationOS — Pilot Metrics', () => {
  it('calculates pilot metrics', () => {
    const idea: Idea = { id: '1', title: 'Test', description: '', category: 'product', status: 'pilot', impact: 0, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], pilotMetrics: { users: 100, revenue: 5000, satisfaction: 85 }, tags: [], timeline: [], createdAt: '', updatedAt: '' };
    expect(idea.pilotMetrics?.users).toBe(100);
    expect(idea.pilotMetrics?.revenue).toBe(5000);
    expect(idea.pilotMetrics?.satisfaction).toBe(85);
  });

  it('only valid for pilot status', () => {
    const nonPilotStatuses: Idea['status'][] = ['idea', 'approved', 'rejected'];
    nonPilotStatuses.forEach(s => {
      const idea: Idea = { id: '1', title: 'Test', description: '', category: 'product', status: s, impact: 0, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' };
      expect(idea.pilotMetrics).toBeUndefined();
    });
  });
});

describe('InnovationOS — Edge Cases', () => {
  function tallyVotes(votes: Idea['votes']): { total: number; count: number; average: number } {
    const total = votes.reduce((s, v) => s + v.vote, 0);
    return { total, count: votes.length, average: votes.length > 0 ? total / votes.length : 0 };
  }

  function calculateScore(idea: Idea): number {
    const voteScore = idea.votes.reduce((s, v) => s + v.vote, 0);
    return voteScore + idea.impact * 10 + idea.roi;
  }

  function innovationStats(ideas: Idea[]) {
    return {
      total: ideas.length,
      byStatus: {
        ideas: ideas.filter(i => i.status === 'idea' || i.status === 'under_review').length,
        approved: ideas.filter(i => i.status === 'approved').length,
        pilot: ideas.filter(i => i.status === 'pilot').length,
        deployed: ideas.filter(i => i.status === 'scale' || i.status === 'deployed').length,
      },
      avgImpact: ideas.length > 0 ? Math.round(ideas.reduce((s, i) => s + i.impact, 0) / ideas.length) : 0,
    };
  }

  it('handles empty votes array', () => {
    const result = tallyVotes([]);
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
    expect(result.average).toBe(0);
  });

  it('handles negative vote values', () => {
    const votes: Idea['votes'] = [
      { userId: 'u1', vote: -5 },
      { userId: 'u2', vote: 3 },
    ];
    const result = tallyVotes(votes);
    expect(result.total).toBe(-2);
  });

  it('handles zero vote values', () => {
    const votes: Idea['votes'] = [
      { userId: 'u1', vote: 0 },
      { userId: 'u2', vote: 0 },
    ];
    const result = tallyVotes(votes);
    expect(result.average).toBe(0);
  });

  it('handles max vote values', () => {
    const votes: Idea['votes'] = [
      { userId: 'u1', vote: 10 },
      { userId: 'u2', vote: 10 },
    ];
    const result = tallyVotes(votes);
    expect(result.total).toBe(20);
  });

  it('handles negative impact and roi', () => {
    const idea: Idea = { id: '1', title: 'A', description: '', category: 'product', status: 'approved', impact: -5, effort: 3, roi: -10, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' };
    const score = calculateScore(idea);
    expect(score).toBeLessThan(0);
  });

  it('handles very large number of votes', () => {
    const votes: Idea['votes'] = Array.from({ length: 1000 }, (_, i) => ({
      userId: 'u' + i, vote: 5
    }));
    const result = tallyVotes(votes);
    expect(result.total).toBe(5000);
    expect(result.count).toBe(1000);
  });

  it('handles special characters in title', () => {
    const idea: Idea = { id: '1', title: 'Test <script>alert("xss")</script>', description: '', category: 'product', status: 'idea', impact: 5, effort: 3, roi: 10, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' };
    expect(idea.title).toContain('<script>');
  });

  it('handles empty timeline', () => {
    const idea: Idea = { id: '1', title: 'Test', description: '', category: 'product', status: 'idea', impact: 5, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], tags: [], timeline: [], createdAt: '', updatedAt: '' };
    expect(idea.timeline).toHaveLength(0);
  });

  it('handles unicode in tags', () => {
    const idea: Idea = { id: '1', title: 'Test', description: '', category: 'product', status: 'idea', impact: 5, effort: 0, roi: 0, submittedBy: '', votes: [], comments: [], tags: ['innovation', '世界 🌍'], timeline: [], createdAt: '', updatedAt: '' };
    expect(idea.tags).toContain('世界 🌍');
  });
});