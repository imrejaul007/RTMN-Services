import { describe, it, expect } from 'vitest';

// Asana Connector Constants
const TASK_STATES = ['Backlog', 'In Progress', 'In Review', 'Done', 'Cancelled'];
const PROJECT_COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal', 'salmon', 'gray', 'random'];
const PRIORITY_LEVELS = [0, 1, 2, 3, 4];

describe('Asana Connector', () => {
  describe('Task States', () => {
    it('should have all required task states', () => {
      expect(TASK_STATES).toContain('Backlog');
      expect(TASK_STATES).toContain('In Progress');
      expect(TASK_STATES).toContain('In Review');
      expect(TASK_STATES).toContain('Done');
      expect(TASK_STATES).toContain('Cancelled');
    });

    it('should have exactly 5 task states', () => {
      expect(TASK_STATES).toHaveLength(5);
    });
  });

  describe('Project Colors', () => {
    it('should have all project colors', () => {
      expect(PROJECT_COLORS).toContain('blue');
      expect(PROJECT_COLORS).toContain('red');
      expect(PROJECT_COLORS).toContain('green');
      expect(PROJECT_COLORS).toContain('gray');
    });
  });

  describe('Priority Levels', () => {
    it('should have 5 priority levels (0-4)', () => {
      expect(PRIORITY_LEVELS).toHaveLength(5);
      expect(PRIORITY_LEVELS).toEqual([0, 1, 2, 3, 4]);
    });

    it('should map priority levels correctly', () => {
      const priorityMap: Record<number, string> = {
        0: 'No priority',
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Urgent'
      };
      expect(priorityMap[0]).toBe('No priority');
      expect(priorityMap[4]).toBe('Urgent');
    });
  });

  describe('Task Validation', () => {
    const validateTask = (task: {
      name?: string;
      completed?: boolean;
      due_on?: string;
      assignee?: string;
      projects?: string[];
      tags?: string[];
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!task.name) errors.push('name is required');
      if (task.name && task.name.length > 2000) errors.push('name exceeds max length');
      if (task.projects && task.projects.length > 100) errors.push('too many projects');
      if (task.due_on && isNaN(Date.parse(task.due_on))) errors.push('invalid due_on date');

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct task', () => {
      const result = validateTask({
        name: 'Implement login feature',
        completed: false,
        due_on: '2026-07-01',
        assignee: 'user123',
        projects: ['proj1'],
        tags: ['feature', 'backend']
      });
      expect(result.valid).toBe(true);
    });

    it('should require name', () => {
      const result = validateTask({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should reject invalid due_on date', () => {
      const result = validateTask({ name: 'Test', due_on: 'not-a-date' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('invalid due_on date');
    });

    it('should reject too many projects', () => {
      const result = validateTask({
        name: 'Test',
        projects: Array(101).fill('proj')
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('too many projects');
    });
  });

  describe('Project Validation', () => {
    const validateProject = (project: {
      name?: string;
      color?: string;
      archived?: boolean;
      due_date?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!project.name) errors.push('name is required');
      if (project.name && project.name.length > 500) errors.push('name exceeds max length');
      if (project.color && !PROJECT_COLORS.includes(project.color)) {
        errors.push(`Invalid color: ${project.color}`);
      }
      if (project.due_date && isNaN(Date.parse(project.due_date))) {
        errors.push('invalid due_date');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct project', () => {
      const result = validateProject({
        name: 'Q3 Sprint',
        color: 'blue',
        archived: false
      });
      expect(result.valid).toBe(true);
    });

    it('should require name', () => {
      const result = validateProject({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should validate color', () => {
      const result = validateProject({ name: 'Test', color: 'red' });
      expect(result.valid).toBe(true);

      const invalid = validateProject({ name: 'Test', color: 'invalid' });
      expect(invalid.valid).toBe(false);
    });
  });

  describe('Task Filtering', () => {
    const filterTasks = (
      tasks: Array<{
        projects: string[];
        assignee?: string;
        completed: boolean;
        due_on?: string;
      }>,
      filters: { project?: string; assignee?: string; completed?: boolean }
    ) => {
      let filtered = [...tasks];

      if (filters.project) {
        filtered = filtered.filter(t => t.projects.includes(filters.project!));
      }
      if (filters.assignee) {
        filtered = filtered.filter(t => t.assignee === filters.assignee);
      }
      if (filters.completed !== undefined) {
        filtered = filtered.filter(t => t.completed === filters.completed);
      }

      return filtered;
    };

    it('should filter by project', () => {
      const tasks = [
        { projects: ['proj1'], assignee: 'u1', completed: false },
        { projects: ['proj2'], assignee: 'u2', completed: false },
        { projects: ['proj1'], assignee: 'u3', completed: true }
      ];
      const result = filterTasks(tasks, { project: 'proj1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by assignee', () => {
      const tasks = [
        { projects: ['proj1'], assignee: 'u1', completed: false },
        { projects: ['proj1'], assignee: 'u2', completed: false }
      ];
      const result = filterTasks(tasks, { assignee: 'u1' });
      expect(result).toHaveLength(1);
      expect(result[0].assignee).toBe('u1');
    });

    it('should filter by completed status', () => {
      const tasks = [
        { projects: ['proj1'], assignee: 'u1', completed: false },
        { projects: ['proj1'], assignee: 'u2', completed: true }
      ];
      const result = filterTasks(tasks, { completed: true });
      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(true);
    });

    it('should combine multiple filters', () => {
      const tasks = [
        { projects: ['proj1'], assignee: 'u1', completed: false },
        { projects: ['proj1'], assignee: 'u1', completed: true },
        { projects: ['proj2'], assignee: 'u1', completed: false }
      ];
      const result = filterTasks(tasks, { project: 'proj1', assignee: 'u1' });
      expect(result).toHaveLength(2);
    });
  });

  describe('Team Validation', () => {
    const validateTeam = (team: {
      name?: string;
      description?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!team.name) errors.push('name is required');
      if (team.name && team.name.length > 200) errors.push('name exceeds max length');

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct team', () => {
      const result = validateTeam({
        name: 'Engineering',
        description: 'The engineering team'
      });
      expect(result.valid).toBe(true);
    });

    it('should require team name', () => {
      const result = validateTeam({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });
  });

  describe('Due Date Analysis', () => {
    const getDueDateStatus = (due_on?: string): 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'none' => {
      if (!due_on) return 'none';

      const now = new Date();
      const due = new Date(due_on);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'overdue';
      if (diffDays === 0) return 'due_today';
      if (diffDays <= 7) return 'due_soon';
      return 'upcoming';
    };

    it('should identify overdue tasks', () => {
      const pastDate = '2026-06-20';
      expect(getDueDateStatus(pastDate)).toBe('overdue');
    });

    it('should identify today tasks', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getDueDateStatus(today)).toBe('due_today');
    });

    it('should identify soon tasks', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 5);
      expect(getDueDateStatus(soon.toISOString().split('T')[0])).toBe('due_soon');
    });

    it('should return none for missing date', () => {
      expect(getDueDateStatus(undefined)).toBe('none');
    });
  });

  describe('Tag Management', () => {
    const normalizeTags = (tags: string[]): string[] => {
      return [...new Set(tags.map(t => t.toLowerCase().trim()))];
    };

    it('should deduplicate tags', () => {
      const result = normalizeTags(['BUG', 'bug', 'Feature', 'feature']);
      expect(result).toHaveLength(2);
      expect(result).toContain('bug');
      expect(result).toContain('feature');
    });

    it('should trim whitespace', () => {
      const result = normalizeTags([' bug ', 'feature ']);
      expect(result).toContain('bug');
      expect(result).toContain('feature');
    });
  });

  describe('Task Statistics', () => {
    const calculateTaskStats = (tasks: Array<{ completed: boolean; due_on?: string }>) => {
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const overdue = tasks.filter(t => {
        if (!t.due_on || t.completed) return false;
        return new Date(t.due_on) < new Date();
      }).length;

      return {
        total,
        completed,
        pending: total - completed,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        overdue
      };
    };

    it('should calculate completion rate', () => {
      const tasks = [
        { completed: true, due_on: '2026-06-20' },
        { completed: false, due_on: '2026-06-20' },
        { completed: true, due_on: '2026-07-01' },
        { completed: false, due_on: '2026-07-01' }
      ];
      const stats = calculateTaskStats(tasks);
      expect(stats.completionRate).toBe(50);
      expect(stats.total).toBe(4);
      expect(stats.completed).toBe(2);
      expect(stats.pending).toBe(2);
    });

    it('should count overdue tasks', () => {
      const pastDate = '2026-06-01';
      const futureDate = '2026-07-01';
      const tasks = [
        { completed: false, due_on: pastDate },
        { completed: true, due_on: pastDate },
        { completed: false, due_on: futureDate }
      ];
      const stats = calculateTaskStats(tasks);
      expect(stats.overdue).toBe(1);
    });
  });
});