import { describe, it, expect } from 'vitest';

const ISSUE_STATES = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done', 'Cancelled'];
const CYCLE_STATUSES = ['active', 'upcoming', 'completed'];

describe('Linear Connector', () => {
  describe('Issue States', () => {
    it('should have all issue states', () => {
      expect(ISSUE_STATES).toContain('Backlog');
      expect(ISSUE_STATES).toContain('In Progress');
      expect(ISSUE_STATES).toContain('Done');
    });
  });

  describe('Issue Validation', () => {
    const validateIssue = (issue: { title?: string; state?: string; priority?: number }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      if (!issue.title) errors.push('title is required');
      if (issue.priority !== undefined && (issue.priority < 0 || issue.priority > 4)) errors.push('invalid priority');
      return { valid: errors.length === 0, errors };
    };

    it('should validate correct issue', () => {
      expect(validateIssue({ title: 'Fix bug', state: 'In Progress', priority: 3 }).valid).toBe(true);
    });

    it('should require title', () => {
      expect(validateIssue({}).valid).toBe(false);
    });
  });

  describe('Velocity Calculation', () => {
    const calculateVelocity = (cycles: Array<{ completedIssues: number }>) => {
      const velocities = cycles.map(c => c.completedIssues);
      return velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 0;
    };

    it('should calculate average velocity', () => {
      expect(calculateVelocity([{ completedIssues: 10 }, { completedIssues: 12 }, { completedIssues: 8 }])).toBeCloseTo(10, 0);
    });
  });
});