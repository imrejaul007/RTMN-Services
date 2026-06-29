/**
 * SUTAR OS — Goal OS Tests
 */
import { describe, it, expect } from 'vitest';

describe('Goal OS — Task Generation', () => {
  function generateSubtasks(level, parentTasks, params) {
    const goalText = (params.title || '').toLowerCase();
    const subtasks = [];
    if (level === 1) {
      subtasks.push({ title: 'Research & Discovery', hours: 8, priority: 'high' });
      subtasks.push({ title: 'Planning & Strategy', hours: 4, priority: 'high' });
      subtasks.push({ title: 'Execution', hours: 16, priority: 'high' });
      subtasks.push({ title: 'Review & Delivery', hours: 4, priority: 'medium' });
    } else if (level === 2) {
      if (goalText.includes('negotiation')) {
        subtasks.push({ title: 'Prepare negotiation brief', hours: 2, priority: 'high' });
        subtasks.push({ title: 'Identify BATNA positions', hours: 1, priority: 'medium' });
        subtasks.push({ title: 'Draft initial offer', hours: 1, priority: 'high' });
      } else {
        subtasks.push({ title: 'Gather requirements', hours: 2, priority: 'high' });
        subtasks.push({ title: 'Analyze options', hours: 3, priority: 'medium' });
        subtasks.push({ title: 'Develop recommendations', hours: 3, priority: 'medium' });
      }
    } else {
      subtasks.push({ title: 'Complete research', hours: 1, priority: 'medium' });
      subtasks.push({ title: 'Document findings', hours: 1, priority: 'low' });
    }
    return subtasks;
  }

  it('generates milestone-level tasks', () => {
    const tasks = generateSubtasks(1, [], { title: 'Test goal' });
    expect(tasks.some(t => t.title === 'Research & Discovery')).toBe(true);
    expect(tasks.some(t => t.title === 'Execution')).toBe(true);
    expect(tasks.length).toBeGreaterThanOrEqual(4);
  });

  it('generates negotiation-specific tasks', () => {
    const tasks = generateSubtasks(2, [], { title: 'Contract negotiation' });
    expect(tasks.some(t => t.title.includes('BATNA'))).toBe(true);
    expect(tasks.some(t => t.title.includes('brief'))).toBe(true);
  });

  it('generates atomic action tasks', () => {
    const tasks = generateSubtasks(3, [], { title: 'Test' });
    expect(tasks.some(t => t.title === 'Complete research')).toBe(true);
    expect(tasks.every(t => t.hours <= 2)).toBe(true);
  });

  it('sets priority on tasks', () => {
    const tasks = generateSubtasks(1, [], { title: 'Test' });
    expect(tasks.every(t => t.priority !== undefined)).toBe(true);
  });

  it('sets hours on tasks', () => {
    const tasks = generateSubtasks(1, [], { title: 'Test' });
    expect(tasks.every(t => typeof t.hours === 'number' && t.hours > 0)).toBe(true);
  });
});

describe('Goal OS — Critical Path', () => {
  function buildCriticalPath(tasks) {
    const sorted = [...tasks].sort((a, b) => b.estimatedHours - a.estimatedHours);
    return sorted.slice(0, 5).map(t => ({ id: t.id, title: t.title, hours: t.estimatedHours }));
  }

  it('sorts by hours descending', () => {
    const tasks = [
      { id: 't1', title: 'Short task', estimatedHours: 1 },
      { id: 't2', title: 'Long task', estimatedHours: 10 },
      { id: 't3', title: 'Medium task', estimatedHours: 5 },
    ];
    const path = buildCriticalPath(tasks);
    expect(path[0].hours).toBe(10);
    expect(path[1].hours).toBe(5);
    expect(path[2].hours).toBe(1);
  });

  it('limits to top 5 tasks', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, title: 'Task', estimatedHours: i + 1 }));
    const path = buildCriticalPath(tasks);
    expect(path.length).toBeLessThanOrEqual(5);
  });

  it('returns empty for no tasks', () => {
    const path = buildCriticalPath([]);
    expect(path).toEqual([]);
  });
});

describe('Goal OS — Progress Calculation', () => {
  function getProgress(goal) {
    const totalTasks = goal.tasks.length;
    const completedTasks = goal.tasks.filter(t => t.status === 'completed').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalHours = goal.tasks.reduce((s, t) => s + t.estimatedHours, 0);
    const completedHours = goal.tasks.filter(t => t.status === 'completed').reduce((s, t) => s + t.estimatedHours, 0);
    return { totalTasks, completedTasks, progress, totalHours, completedHours, remainingHours: totalHours - completedHours };
  }

  it('calculates progress percentage', () => {
    const goal = {
      tasks: [
        { status: 'completed', estimatedHours: 4 },
        { status: 'completed', estimatedHours: 4 },
        { status: 'in_progress', estimatedHours: 4 },
        { status: 'pending', estimatedHours: 4 },
      ]
    };
    const p = getProgress(goal);
    expect(p.progress).toBe(50);
    expect(p.completedTasks).toBe(2);
    expect(p.totalTasks).toBe(4);
  });

  it('calculates hours correctly', () => {
    const goal = {
      tasks: [
        { status: 'completed', estimatedHours: 10 },
        { status: 'pending', estimatedHours: 20 },
      ]
    };
    const p = getProgress(goal);
    expect(p.totalHours).toBe(30);
    expect(p.completedHours).toBe(10);
    expect(p.remainingHours).toBe(20);
  });

  it('handles empty task list', () => {
    const p = getProgress({ tasks: [] });
    expect(p.progress).toBe(0);
    expect(p.totalTasks).toBe(0);
    expect(p.totalHours).toBe(0);
  });

  it('handles all completed tasks', () => {
    const goal = {
      tasks: [
        { status: 'completed', estimatedHours: 5 },
        { status: 'completed', estimatedHours: 5 },
      ]
    };
    const p = getProgress(goal);
    expect(p.progress).toBe(100);
    expect(p.completedTasks).toBe(2);
  });
});

describe('Goal OS — Edge Cases', () => {
  function generateSubtasks(level, parentTasks, params) {
    const goalText = (params.title || '').toLowerCase();
    const subtasks = [];
    if (level === 1) {
      subtasks.push({ title: 'Research & Discovery', hours: 8, priority: 'high' });
      subtasks.push({ title: 'Planning & Strategy', hours: 4, priority: 'high' });
      subtasks.push({ title: 'Execution', hours: 16, priority: 'high' });
      subtasks.push({ title: 'Review & Delivery', hours: 4, priority: 'medium' });
    } else if (level === 2) {
      if (goalText.includes('negotiation')) {
        subtasks.push({ title: 'Prepare negotiation brief', hours: 2, priority: 'high' });
        subtasks.push({ title: 'Identify BATNA positions', hours: 1, priority: 'medium' });
        subtasks.push({ title: 'Draft initial offer', hours: 1, priority: 'high' });
      } else {
        subtasks.push({ title: 'Gather requirements', hours: 2, priority: 'high' });
        subtasks.push({ title: 'Analyze options', hours: 3, priority: 'medium' });
        subtasks.push({ title: 'Develop recommendations', hours: 3, priority: 'medium' });
      }
    } else {
      subtasks.push({ title: 'Complete research', hours: 1, priority: 'medium' });
      subtasks.push({ title: 'Document findings', hours: 1, priority: 'low' });
    }
    return subtasks;
  }

  function buildCriticalPath(tasks) {
    const sorted = [...tasks].sort((a, b) => b.estimatedHours - a.estimatedHours);
    return sorted.slice(0, 5).map(t => ({ id: t.id, title: t.title, hours: t.estimatedHours }));
  }

  function getProgress(goal) {
    const totalTasks = goal.tasks.length;
    const completedTasks = goal.tasks.filter(t => t.status === 'completed').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalHours = goal.tasks.reduce((s, t) => s + t.estimatedHours, 0);
    const completedHours = goal.tasks.filter(t => t.status === 'completed').reduce((s, t) => s + t.estimatedHours, 0);
    return { totalTasks, completedTasks, progress, totalHours, completedHours, remainingHours: totalHours - completedHours };
  }

  it('handles empty title', () => {
    const tasks = generateSubtasks(1, [], { title: '' });
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('handles null title', () => {
    const tasks = generateSubtasks(1, [], { title: null });
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('handles undefined title', () => {
    const tasks = generateSubtasks(1, [], {});
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('handles very long task list', () => {
    const tasks = Array.from({ length: 100 }, (_, i) => ({
      id: 't' + i,
      title: 'Task ' + i,
      estimatedHours: i + 1
    }));
    const path = buildCriticalPath(tasks);
    expect(path.length).toBe(5);
    expect(path[0].hours).toBe(100);
  });

  it('handles task with zero hours', () => {
    const goal = {
      tasks: [
        { status: 'pending', estimatedHours: 0 },
        { status: 'completed', estimatedHours: 5 },
      ]
    };
    const p = getProgress(goal);
    expect(p.totalHours).toBe(5);
    expect(p.progress).toBe(50);
  });

  it('handles negative hours gracefully', () => {
    const goal = {
      tasks: [
        { status: 'completed', estimatedHours: -5 },
        { status: 'pending', estimatedHours: 10 },
      ]
    };
    const p = getProgress(goal);
    // Math.round(-100) = -100, but totalHours calculation is -5 + 10 = 5
    expect(p.totalHours).toBe(5);
  });

  it('handles very large hours', () => {
    const goal = {
      tasks: [
        { status: 'completed', estimatedHours: 1000000 },
        { status: 'pending', estimatedHours: 1000000 },
      ]
    };
    const p = getProgress(goal);
    expect(p.totalHours).toBe(2000000);
    expect(p.progress).toBe(50);
  });

  it('handles all task statuses', () => {
    const goal = {
      tasks: [
        { status: 'completed', estimatedHours: 10 },
        { status: 'in_progress', estimatedHours: 10 },
        { status: 'pending', estimatedHours: 10 },
        { status: 'cancelled', estimatedHours: 10 },
      ]
    };
    const p = getProgress(goal);
    expect(p.totalTasks).toBe(4);
    expect(p.completedTasks).toBe(1);
    expect(p.progress).toBe(25);
  });
});
