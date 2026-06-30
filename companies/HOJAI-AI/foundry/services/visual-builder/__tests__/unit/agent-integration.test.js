/**
 * AI Agent Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeAgent,
  registerAgent,
  unregisterAgent,
  getAgent,
  listAgents,
  getAgentCategories,
} from '../../src/agent-integration.js';

describe('AI Agent Integration', () => {
  describe('getAgent', () => {
    it('should return agent by ID', () => {
      const agent = getAgent('sdr_agent');
      expect(agent).toBeDefined();
      expect(agent.name).toBe('AI SDR');
    });

    it('should return null for unknown agent', () => {
      const agent = getAgent('unknown_agent');
      expect(agent).toBeNull();
    });
  });

  describe('listAgents', () => {
    it('should list all agents', () => {
      const agents = listAgents();
      expect(agents.length).toBeGreaterThan(0);
    });

    it('should filter agents by category', () => {
      const salesAgents = listAgents('sales');
      expect(salesAgents.length).toBeGreaterThan(0);
      salesAgents.forEach(agent => {
        expect(agent.category).toBe('sales');
      });
    });

    it('should return empty array for unknown category', () => {
      const agents = listAgents('unknown_category');
      expect(agents).toEqual([]);
    });
  });

  describe('getAgentCategories', () => {
    it('should return unique categories', () => {
      const categories = getAgentCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(new Set(categories).size).toBe(categories.length);
    });

    it('should include sales category', () => {
      const categories = getAgentCategories();
      expect(categories).toContain('sales');
    });
  });

  describe('registerAgent', () => {
    it('should register a new agent', () => {
      const newAgent = {
        id: 'test_agent',
        name: 'Test Agent',
        category: 'test',
        skills: ['test_skill'],
      };
      const registered = registerAgent(newAgent);
      expect(registered.id).toBe('test_agent');
      expect(registered.builtin).toBe(false);
    });

    it('should overwrite existing agent', () => {
      registerAgent({
        id: 'test_agent',
        name: 'Updated Test Agent',
        category: 'test',
      });
      const agent = getAgent('test_agent');
      expect(agent.name).toBe('Updated Test Agent');
    });
  });

  describe('unregisterAgent', () => {
    it('should unregister custom agent', () => {
      registerAgent({ id: 'temp_agent', name: 'Temp', category: 'temp', skills: ['skill1'] });
      expect(unregisterAgent('temp_agent')).toBe(true);
      expect(getAgent('temp_agent')).toBeNull();
    });

    it('should return false for non-existent agent', () => {
      expect(unregisterAgent('non_existent')).toBe(false);
    });

    it('should not unregister built-in agents', () => {
      // Built-in agents should not be removable
      const result = unregisterAgent('sdr_agent');
      expect(result).toBe(false);
    });
  });

  describe('executeAgent', () => {
    it('should execute SDR agent for lead scoring', async () => {
      const result = await executeAgent('sdr_agent', {
        task: 'qualify_lead',
        data: { name: 'John Doe', company: 'Acme' },
      });

      expect(result).toHaveProperty('action', 'score_lead');
      expect(result).toHaveProperty('score');
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should execute SDR agent for email outreach', async () => {
      const result = await executeAgent('sdr_agent', {
        task: 'send_email',
        data: { name: 'Jane', subject: 'Partnership' },
      });

      expect(result).toHaveProperty('action', 'email_sent');
      expect(result).toHaveProperty('body');
    });

    it('should execute SDR agent for meeting booking', async () => {
      const result = await executeAgent('sdr_agent', {
        task: 'book_meeting',
        data: { duration: 30 },
      });

      expect(result).toHaveProperty('action', 'meeting_booked');
      expect(result).toHaveProperty('slot');
      expect(result).toHaveProperty('duration', 30);
    });

    it('should execute support agent for ticket classification', async () => {
      const result = await executeAgent('support_agent', {
        task: 'classify_ticket',
        data: { message: 'I cannot login' },
      });

      expect(result).toHaveProperty('action', 'ticket_classified');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('priority');
    });

    it('should execute finance agent for invoice validation', async () => {
      const result = await executeAgent('invoice_processor', {
        task: 'validate_invoice',
        data: { amount: 5000, vendor: 'Supplier A' },
      });

      expect(result).toHaveProperty('action', 'invoice_validated');
      expect(result).toHaveProperty('status', 'approved');
    });

    it('should execute recruiter for resume screening', async () => {
      const result = await executeAgent('recruiter', {
        task: 'screen_resume',
        data: { name: 'Candidate X' },
      });

      expect(result).toHaveProperty('action', 'resume_screened');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('recommendation');
    });

    it('should execute real estate agent for property matching', async () => {
      const result = await executeAgent('real_estate_agent', {
        task: 'match_properties',
        data: { budget: 5000000 },
      });

      expect(result).toHaveProperty('action', 'properties_matched');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('topMatches');
    });

    it('should throw error for unknown agent', async () => {
      await expect(
        executeAgent('unknown_agent', { task: 'test' })
      ).rejects.toThrow('Unknown agent: unknown_agent');
    });

    it('should execute with workflow context', async () => {
      const result = await executeAgent(
        'sdr_agent',
        { task: 'lead_score', data: { name: 'Test' } },
        'workflow_123',
        'node_456'
      );

      expect(result).toHaveProperty('score');
    });
  });

  describe('Agent Categories', () => {
    const expectedCategories = [
      'sales', 'marketing', 'hr', 'finance',
      'support', 'procurement', 'restaurant',
      'hotel', 'healthcare', 'real_estate', 'executive', 'general'
    ];

    it('should have multiple categories', () => {
      const categories = getAgentCategories();
      expect(categories.length).toBeGreaterThan(5);
    });

    it('should include key categories', () => {
      const categories = getAgentCategories();
      expect(categories).toContain('sales');
      expect(categories).toContain('marketing');
      expect(categories).toContain('hr');
    });
  });

  describe('Agent Properties', () => {
    it('should have agent with required properties', () => {
      const agent = getAgent('sdr_agent');
      expect(agent).toBeDefined();
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('category');
      expect(agent).toHaveProperty('skills');
      expect(agent).toHaveProperty('config');
      expect(agent).toHaveProperty('memory');
    });

    it('should have agents with skills', () => {
      const agent = getAgent('sdr_agent');
      expect(Array.isArray(agent.skills)).toBe(true);
      expect(agent.skills.length).toBeGreaterThan(0);
    });

    it('should have agents with memory', () => {
      const agent = getAgent('sdr_agent');
      expect(Array.isArray(agent.memory)).toBe(true);
    });
  });
});
