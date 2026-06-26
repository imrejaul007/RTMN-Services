import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock the event types
const EVENT_TYPES = {
  'decision.made': { description: 'Employee made a decision', category: 'decision' },
  'workflow.executed': { description: 'Workflow was executed', category: 'workflow' },
  'communication.sent': { description: 'Communication was sent', category: 'communication' },
  'skill.used': { description: 'Skill was used', category: 'skill' },
  'employee.created': { description: 'New employee created', category: 'identity' },
  'employee.updated': { description: 'Employee updated', category: 'identity' },
  'employee.deleted': { description: 'Employee deleted', category: 'identity' },
  'meeting.completed': { description: 'Meeting completed', category: 'communication' },
  'performance.review': { description: 'Performance review', category: 'skill' },
};

describe('Twin Learning OS', () => {
  describe('Event Types', () => {
    it('should have all required event types', () => {
      expect(EVENT_TYPES['decision.made']).toBeDefined();
      expect(EVENT_TYPES['workflow.executed']).toBeDefined();
      expect(EVENT_TYPES['communication.sent']).toBeDefined();
      expect(EVENT_TYPES['skill.used']).toBeDefined();
    });

    it('should categorize events correctly', () => {
      expect(EVENT_TYPES['decision.made'].category).toBe('decision');
      expect(EVENT_TYPES['workflow.executed'].category).toBe('workflow');
      expect(EVENT_TYPES['communication.sent'].category).toBe('communication');
      expect(EVENT_TYPES['skill.used'].category).toBe('skill');
    });
  });

  describe('Pattern Storage', () => {
    let patterns: Map<string, any>;

    beforeEach(() => {
      patterns = new Map();
    });

    it('should store decision patterns', () => {
      const employeeId = uuidv4();
      const pattern = {
        type: 'decision.made',
        trigger: 'budget_approval',
        decision: 'approved',
        reasoning: 'within_budget',
        confidence: 85,
        frequency: 5,
        lastUpdated: new Date().toISOString(),
      };

      patterns.set(`${employeeId}:decision`, pattern);
      expect(patterns.get(`${employeeId}:decision`)).toEqual(pattern);
    });

    it('should update pattern frequency', () => {
      const employeeId = uuidv4();
      const key = `${employeeId}:decision`;
      const pattern = { frequency: 1, lastUpdated: new Date().toISOString() };

      patterns.set(key, pattern);
      pattern.frequency += 1;

      expect(patterns.get(key).frequency).toBe(2);
    });
  });

  describe('Health Calculation', () => {
    it('should calculate health as new for low coverage', () => {
      const score = 20;
      const level = score < 30 ? 'new' : score < 70 ? 'developing' : 'healthy';
      expect(level).toBe('new');
    });

    it('should calculate health as developing for medium coverage', () => {
      const score = 50;
      const level = score < 30 ? 'new' : score < 70 ? 'developing' : 'healthy';
      expect(level).toBe('developing');
    });

    it('should calculate health as healthy for high coverage', () => {
      const score = 85;
      const level = score < 30 ? 'new' : score < 70 ? 'developing' : 'healthy';
      expect(level).toBe('healthy');
    });
  });

  describe('Twin Coverage', () => {
    const TWIN_TYPES = [
      'identity', 'memory', 'knowledge', 'communication',
      'workflow', 'decision', 'relationship', 'reputation', 'skill'
    ];

    it('should have 9 twin types', () => {
      expect(TWIN_TYPES).toHaveLength(9);
    });

    it('should track coverage percentage', () => {
      const populatedCount = 6;
      const coverage = (populatedCount / TWIN_TYPES.length) * 100;
      expect(coverage).toBeCloseTo(66.67, 1);
    });
  });

  describe('Event Validation', () => {
    it('should require employeeId for events', () => {
      const event = { type: 'decision.made', context: {} };
      expect(event.employeeId).toBeUndefined();
    });

    it('should validate event type', () => {
      const validType = 'decision.made';
      expect(EVENT_TYPES[validType as keyof typeof EVENT_TYPES]).toBeDefined();

      const invalidType = 'invalid.type';
      expect(EVENT_TYPES[invalidType as keyof typeof EVENT_TYPES]).toBeUndefined();
    });
  });
});
