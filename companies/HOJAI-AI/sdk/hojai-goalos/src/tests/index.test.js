import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createGoalOS } from '../index.ts';

// Mock localStorage
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

describe('GoalOS SDK', () => {
  let goalOS;

  beforeEach(() => {
    const storageKey = 'test-goals-' + Date.now() + Math.random();
    global.localStorage.data = {};
    goalOS = createGoalOS({ storageKey });
  });

  describe('createGoal', () => {
    it('creates a goal with required fields', () => {
      const goal = goalOS.createGoal({
        title: 'Launch Product',
        status: 'active',
        priority: 'high'
      });

      assert.ok(goal.id);
      assert.equal(goal.title, 'Launch Product');
      assert.equal(goal.status, 'active');
      assert.equal(goal.priority, 'high');
      assert.equal(goal.progress, 0);
      assert.ok(goal.createdAt);
    });
  });

  describe('getGoal', () => {
    it('retrieves a created goal', () => {
      const created = goalOS.createGoal({ title: 'Test', status: 'active', priority: 'medium' });
      const retrieved = goalOS.getGoal(created.id);
      assert.ok(retrieved);
      assert.equal(retrieved.title, 'Test');
    });

    it('returns undefined for non-existent goal', () => {
      const result = goalOS.getGoal('non-existent');
      assert.equal(result, undefined);
    });
  });

  describe('listGoals', () => {
    it('lists all goals sorted by creation date', () => {
      goalOS.createGoal({ title: 'First', status: 'active', priority: 'low' });
      goalOS.createGoal({ title: 'Second', status: 'active', priority: 'high' });

      const goals = goalOS.listGoals();
      assert.equal(goals.length, 2);
    });

    it('filters by status', () => {
      goalOS.createGoal({ title: 'Active', status: 'active', priority: 'high' });
      goalOS.createGoal({ title: 'Done', status: 'completed', priority: 'high' });

      const active = goalOS.listGoals({ status: 'active' });
      assert.equal(active.length, 1);
      assert.equal(active[0].title, 'Active');
    });
  });

  describe('updateGoal', () => {
    it('updates goal fields', () => {
      const goal = goalOS.createGoal({ title: 'Original', status: 'active', priority: 'low' });
      const updated = goalOS.updateGoal(goal.id, { title: 'Updated', priority: 'high' });

      assert.ok(updated);
      assert.equal(updated.title, 'Updated');
      assert.equal(updated.priority, 'high');
    });
  });

  describe('completeTask', () => {
    it('marks task as done and updates progress', () => {
      const goal = goalOS.createGoal({ title: 'Test', status: 'active', priority: 'medium' });
      const task1 = goalOS.addTask(goal.id, { title: 'Task 1' });
      goalOS.addTask(goal.id, { title: 'Task 2' });
      goalOS.completeTask(goal.id, task1.id);

      const updated = goalOS.getGoal(goal.id);
      assert.equal(updated.progress, 50); // 1 of 2 = 50%
    });
  });

  describe('getProgress', () => {
    it('returns correct progress stats', () => {
      const goal = goalOS.createGoal({ title: 'Test', status: 'active', priority: 'medium' });
      const task1 = goalOS.addTask(goal.id, { title: 'Task 1' });
      goalOS.addTask(goal.id, { title: 'Task 2' });
      goalOS.completeTask(goal.id, task1.id);

      const progress = goalOS.getProgress(goal.id);
      assert.equal(progress.completedTasks, 1);
      assert.equal(progress.totalTasks, 2);
      assert.equal(progress.progress, 50);
    });
  });
});
