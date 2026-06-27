/**
 * Jira Connector Tests - Port 4793
 */
import { describe, it, expect } from 'vitest';

// Constants
const ISSUE_TYPES = ['bug', 'story', 'task', 'epic'];
const ISSUE_STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

describe('Jira Connector - Constants', () => {
  describe('Issue Types', () => {
    it('should have all issue types', () => {
      expect(ISSUE_TYPES).toContain('bug');
      expect(ISSUE_TYPES).toContain('story');
      expect(ISSUE_TYPES).toContain('task');
      expect(ISSUE_TYPES).toContain('epic');
    });
  });

  describe('Issue Statuses', () => {
    it('should have all statuses', () => {
      expect(ISSUE_STATUSES).toContain('todo');
      expect(ISSUE_STATUSES).toContain('in_progress');
      expect(ISSUE_STATUSES).toContain('done');
    });
  });

  describe('Priorities', () => {
    it('should have all priorities', () => {
      expect(PRIORITIES).toContain('low');
      expect(PRIORITIES).toContain('medium');
      expect(PRIORITIES).toContain('high');
      expect(PRIORITIES).toContain('critical');
    });
  });
});

describe('Jira Connector - Issue Validation', () => {
  const validateIssue = (issue: {
    summary?: string;
    type?: string;
    status?: string;
    priority?: string;
    assignee?: string;
  }): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!issue.summary) errors.push('summary is required');
    if (issue.summary && issue.summary.length > 255) errors.push('summary too long');
    if (issue.type && !ISSUE_TYPES.includes(issue.type)) {
      errors.push(`Invalid type: ${issue.type}`);
    }
    if (issue.status && !ISSUE_STATUSES.includes(issue.status)) {
      errors.push(`Invalid status: ${issue.status}`);
    }
    if (issue.priority && !PRIORITIES.includes(issue.priority)) {
      errors.push(`Invalid priority: ${issue.priority}`);
    }

    return { valid: errors.length === 0, errors };
  };

  it('should validate a correct issue', () => {
    const result = validateIssue({
      summary: 'Fix login bug',
      type: 'bug',
      status: 'todo',
      priority: 'high'
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require summary', () => {
    const result = validateIssue({ type: 'bug' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('summary is required');
  });

  it('should reject invalid type', () => {
    const result = validateIssue({ summary: 'Test', type: 'invalid' });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid status', () => {
    const result = validateIssue({ summary: 'Test', status: 'invalid' });
    expect(result.valid).toBe(false);
  });

  it('should reject summary over 255 chars', () => {
    const result = validateIssue({ summary: 'x'.repeat(256) });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('summary too long');
  });
});

describe('Jira Connector - Sprint Planning', () => {
  const calculateSprintCapacity = (
    issues: Array<{ storyPoints: number; assignee: string }>,
    teamCapacity: Record<string, number>
  ): { totalPoints: number; capacity: number; utilization: number; overAllocated: string[] } => {
    const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    const capacity = Object.values(teamCapacity).reduce((sum, c) => sum + c, 0);
    const utilization = capacity > 0 ? (totalPoints / capacity) * 100 : 0;

    const overAllocated: string[] = [];
    const assignedPoints: Record<string, number> = {};
    issues.forEach(i => {
      assignedPoints[i.assignee] = (assignedPoints[i.assignee] || 0) + (i.storyPoints || 0);
    });

    Object.entries(assignedPoints).forEach(([assignee, points]) => {
      if (teamCapacity[assignee] && points > teamCapacity[assignee]) {
        overAllocated.push(assignee);
      }
    });

    return { totalPoints, capacity, utilization: Math.round(utilization), overAllocated };
  };

  it('should calculate sprint metrics', () => {
    const issues = [
      { storyPoints: 5, assignee: 'alice' },
      { storyPoints: 3, assignee: 'alice' },
      { storyPoints: 8, assignee: 'bob' }
    ];
    const teamCapacity = { alice: 10, bob: 10 };

    const result = calculateSprintCapacity(issues, teamCapacity);
    expect(result.totalPoints).toBe(16);
    expect(result.capacity).toBe(20);
    expect(result.utilization).toBe(80);
  });

  it('should identify over-allocated members', () => {
    const issues = [
      { storyPoints: 8, assignee: 'alice' },
      { storyPoints: 8, assignee: 'alice' }
    ];
    const teamCapacity = { alice: 10 };

    const result = calculateSprintCapacity(issues, teamCapacity);
    expect(result.overAllocated).toContain('alice');
  });

  it('should handle empty sprint', () => {
    const result = calculateSprintCapacity([], { alice: 10 });
    expect(result.totalPoints).toBe(0);
    expect(result.utilization).toBe(0);
  });
});

describe('Jira Connector - Burndown Calculation', () => {
  const calculateBurndown = (
    totalPoints: number,
    dailyCompleted: number[],
    daysRemaining: number
  ): { projectedCompletion: number; atRisk: boolean; remainingPerDay: number } => {
    const totalCompleted = dailyCompleted.reduce((sum, d) => sum + d, 0);
    const remaining = totalPoints - totalCompleted;
    const avgDaily = dailyCompleted.length > 0
      ? totalCompleted / dailyCompleted.length
      : 0;

    const projectedCompletion = avgDaily > 0
      ? Math.ceil(remaining / avgDaily)
      : Infinity;

    const atRisk = projectedCompletion > daysRemaining;

    return {
      projectedCompletion,
      atRisk,
      remainingPerDay: daysRemaining > 0 ? Math.ceil(remaining / daysRemaining) : remaining
    };
  };

  it('should calculate burndown correctly', () => {
    const result = calculateBurndown(50, [5, 8, 6, 7], 10);
    expect(result.projectedCompletion).toBe(5);
    expect(result.atRisk).toBe(false);
  });

  it('should flag at-risk sprints', () => {
    const result = calculateBurndown(100, [3, 2, 4], 5);
    expect(result.atRisk).toBe(true);
  });

  it('should handle zero velocity', () => {
    const result = calculateBurndown(50, [0, 0], 10);
    expect(result.projectedCompletion).toBe(Infinity);
    expect(result.atRisk).toBe(true);
  });
});

describe('Jira Connector - Issue Prioritization', () => {
  const prioritizeIssues = (
    issues: Array<{ priority: string; storyPoints: number; dependencies: number; due?: string }>
  ): Array<{ index: number; score: number }> => {
    const priorityWeight: Record<string, number> = { critical: 100, high: 75, medium: 50, low: 25 };

    return issues.map((issue, index) => {
      let score = priorityWeight[issue.priority] || 50;
      score -= (issue.storyPoints || 0) * 2; // Larger items are harder
      score += issue.dependencies * 5; // Dependencies increase priority
      if (issue.due) {
        const daysUntilDue = Math.ceil((new Date(issue.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 3) score += 30;
        else if (daysUntilDue < 7) score += 15;
      }
      return { index, score };
    }).sort((a, b) => b.score - a.score);
  };

  it('should prioritize critical issues', () => {
    const issues = [
      { priority: 'low', storyPoints: 2, dependencies: 0 },
      { priority: 'critical', storyPoints: 5, dependencies: 0 }
    ];
    const result = prioritizeIssues(issues);
    expect(result[0].index).toBe(1); // Critical should be first
  });

  it('should deprioritize large issues', () => {
    const issues = [
      { priority: 'high', storyPoints: 13, dependencies: 0 },
      { priority: 'high', storyPoints: 3, dependencies: 0 }
    ];
    const result = prioritizeIssues(issues);
    expect(result[0].index).toBe(1); // Smaller item should be first
  });
});

describe('Jira Connector - Velocity Calculation', () => {
  const calculateVelocity = (
    sprints: Array<{ completedPoints: number; plannedPoints: number }>
  ): { avgVelocity: number; trend: 'improving' | 'stable' | 'declining'; predictability: number } => {
    const velocities = sprints.map(s => s.completedPoints);
    const avgVelocity = velocities.length > 0
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length
      : 0;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (velocities.length >= 3) {
      const recent = velocities.slice(-3);
      if (recent[2] > recent[0] * 1.1) trend = 'improving';
      else if (recent[2] < recent[0] * 0.9) trend = 'declining';
    }

    const predictability = sprints.length > 0
      ? sprints.reduce((sum, s) => {
          const ratio = s.plannedPoints > 0 ? s.completedPoints / s.plannedPoints : 0;
          return sum + Math.min(1, ratio);
        }, 0) / sprints.length * 100
      : 0;

    return { avgVelocity: Math.round(avgVelocity), trend, predictability: Math.round(predictability) };
  };

  it('should calculate average velocity', () => {
    const sprints = [
      { completedPoints: 30, plannedPoints: 35 },
      { completedPoints: 35, plannedPoints: 40 },
      { completedPoints: 40, plannedPoints: 38 }
    ];
    const result = calculateVelocity(sprints);
    expect(result.avgVelocity).toBe(35);
  });

  it('should detect improving trend', () => {
    const sprints = [
      { completedPoints: 20, plannedPoints: 30 },
      { completedPoints: 25, plannedPoints: 30 },
      { completedPoints: 32, plannedPoints: 30 }
    ];
    const result = calculateVelocity(sprints);
    expect(result.trend).toBe('improving');
  });

  it('should calculate predictability', () => {
    const sprints = [
      { completedPoints: 30, plannedPoints: 30 },
      { completedPoints: 25, plannedPoints: 30 }
    ];
    const result = calculateVelocity(sprints);
    expect(result.predictability).toBeGreaterThan(80);
  });
});

describe('Jira Connector - Dependency Analysis', () => {
  const analyzeDependencies = (
    issues: Array<{ id: string; dependsOn: string[] }>
  ): { criticalPath: string[]; blockers: string[]; independent: string[] } => {
    const blockerSet = new Set<string>();
    const independent: string[] = [];

    issues.forEach(issue => {
      if (issue.dependsOn.length === 0) {
        independent.push(issue.id);
      } else {
        issue.dependsOn.forEach(dep => blockerSet.add(dep));
      }
    });

    const blockers = Array.from(blockerSet).filter(id =>
      !issues.some(i => i.dependsOn.includes(id))
    );

    const criticalPath: string[] = [];
    const visited = new Set<string>();
    const findPath = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const issue = issues.find(i => i.id === id);
      if (issue) {
        issue.dependsOn.forEach(dep => findPath(dep));
        criticalPath.push(id);
      }
    };

    blockers.forEach(id => findPath(id));

    return { criticalPath: criticalPath.reverse(), blockers, independent };
  };

  it('should identify blockers', () => {
    const issues = [
      { id: 'A', dependsOn: [] },
      { id: 'B', dependsOn: ['A'] },
      { id: 'C', dependsOn: ['B'] }
    ];
    const result = analyzeDependencies(issues);
    expect(result.blockers).toContain('A');
    expect(result.independent).toContain('A');
  });

  it('should find critical path', () => {
    const issues = [
      { id: 'A', dependsOn: [] },
      { id: 'B', dependsOn: ['A'] },
      { id: 'C', dependsOn: ['A'] },
      { id: 'D', dependsOn: ['B', 'C'] }
    ];
    const result = analyzeDependencies(issues);
    expect(result.criticalPath).toContain('D');
  });
});
