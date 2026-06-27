import { describe, it, expect } from 'vitest';

// Agent Builder Constants
const DEFAULT_MODEL = 'hojai-base';
const AGENT_STATES = ['active', 'inactive', 'training', 'error'];
const AGENT_TYPES = ['conversational', 'task', 'autonomous', 'analytical'];

describe('Agent Builder', () => {
  describe('Agent States', () => {
    it('should have all agent states', () => {
      expect(AGENT_STATES).toContain('active');
      expect(AGENT_STATES).toContain('inactive');
      expect(AGENT_STATES).toContain('training');
      expect(AGENT_STATES).toContain('error');
    });
  });

  describe('Agent Types', () => {
    it('should have all agent types', () => {
      expect(AGENT_TYPES).toContain('conversational');
      expect(AGENT_TYPES).toContain('task');
      expect(AGENT_TYPES).toContain('autonomous');
      expect(AGENT_TYPES).toContain('analytical');
    });
  });

  describe('Blueprint Validation', () => {
    const validateBlueprint = (bp: { name?: string; systemPrompt?: string; tools?: string[]; model?: string }) => {
      const errors: string[] = [];
      if (!bp.name) errors.push('name required');
      if (!bp.systemPrompt) errors.push('systemPrompt required');
      if (bp.name && bp.name.length > 200) errors.push('name too long');
      if (bp.tools && !Array.isArray(bp.tools)) errors.push('tools must be array');
      return { valid: errors.length === 0, errors };
    };

    it('should validate correct blueprint', () => {
      const result = validateBlueprint({
        name: 'Customer Support Agent',
        systemPrompt: 'You are a helpful customer support agent',
        tools: ['search', 'lookup'],
        model: 'hojai-base'
      });
      expect(result.valid).toBe(true);
    });

    it('should require name and systemPrompt', () => {
      const result = validateBlueprint({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name required');
      expect(result.errors).toContain('systemPrompt required');
    });
  });

  describe('Agent Creation', () => {
    const createAgent = (bp: { id: string; name: string; model: string }, config: { name?: string; type?: string }) => {
      return {
        id: `agent-${Date.now()}`,
        blueprintId: bp.id,
        name: config.name || bp.name,
        type: config.type || 'conversational',
        model: bp.model,
        state: 'active' as const,
        createdAt: new Date().toISOString()
      };
    };

    it('should create agent from blueprint', () => {
      const blueprint = { id: 'bp-123', name: 'Support Bot', model: 'hojai-base' };
      const agent = createAgent(blueprint, { type: 'conversational' });
      expect(agent.blueprintId).toBe('bp-123');
      expect(agent.type).toBe('conversational');
      expect(agent.state).toBe('active');
    });

    it('should use blueprint name if not provided', () => {
      const blueprint = { id: 'bp-1', name: 'My Bot', model: 'hojai-base' };
      const agent = createAgent(blueprint, {});
      expect(agent.name).toBe('My Bot');
    });
  });

  describe('Tool Validation', () => {
    const AVAILABLE_TOOLS = ['search', 'lookup', 'calculate', 'send_email', 'create_task', 'update_record'];

    const validateTools = (tools: string[]): { valid: boolean; invalid: string[] } => {
      const invalid = tools.filter(t => !AVAILABLE_TOOLS.includes(t));
      return { valid: invalid.length === 0, invalid };
    };

    it('should accept valid tools', () => {
      const result = validateTools(['search', 'calculate']);
      expect(result.valid).toBe(true);
      expect(result.invalid).toHaveLength(0);
    });

    it('should reject invalid tools', () => {
      const result = validateTools(['search', 'invalid_tool', 'fake']);
      expect(result.valid).toBe(false);
      expect(result.invalid).toContain('invalid_tool');
      expect(result.invalid).toContain('fake');
    });
  });

  describe('Version Tracking', () => {
    const incrementVersion = (currentVersion: number): number => currentVersion + 1;

    it('should increment version on update', () => {
      expect(incrementVersion(1)).toBe(2);
      expect(incrementVersion(5)).toBe(6);
    });
  });

  describe('Agent Configuration', () => {
    const mergeConfig = (blueprint: Record<string, any>, overrides: Record<string, any>) => {
      return { ...blueprint, ...overrides };
    };

    it('should merge overrides with blueprint', () => {
      const bp = { name: 'Base', model: 'v1', tools: ['a'] };
      const overrides = { name: 'Custom', tools: ['a', 'b'] };
      const merged = mergeConfig(bp, overrides);
      expect(merged.name).toBe('Custom');
      expect(merged.tools).toEqual(['a', 'b']);
      expect(merged.model).toBe('v1');
    });
  });

  describe('State Transitions', () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      'active': ['inactive', 'training', 'error'],
      'inactive': ['active', 'training'],
      'training': ['active', 'error'],
      'error': ['inactive', 'training']
    };

    const canTransition = (from: string, to: string): boolean => {
      return VALID_TRANSITIONS[from]?.includes(to) || false;
    };

    it('should allow valid transitions', () => {
      expect(canTransition('active', 'inactive')).toBe(true);
      expect(canTransition('inactive', 'active')).toBe(true);
      expect(canTransition('training', 'active')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(canTransition('active', 'active')).toBe(false);
      expect(canTransition('error', 'active')).toBe(false);
    });
  });

  describe('Blueprint Search', () => {
    const searchBlueprints = (
      blueprints: Array<{ name: string; systemPrompt: string; tags: string[] }>,
      query: string
    ) => {
      const q = query.toLowerCase();
      return blueprints.filter(bp =>
        bp.name.toLowerCase().includes(q) ||
        bp.systemPrompt.toLowerCase().includes(q) ||
        bp.tags.some(t => t.toLowerCase().includes(q))
      );
    };

    it('should search by name', () => {
      const blueprints = [
        { name: 'Customer Support', systemPrompt: '...', tags: ['support'] },
        { name: 'Sales Bot', systemPrompt: '...', tags: ['sales'] }
      ];
      const results = searchBlueprints(blueprints, 'Customer');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Customer Support');
    });

    it('should search by tag', () => {
      const blueprints = [
        { name: 'Support Agent', systemPrompt: '...', tags: ['support', 'helpdesk'] },
        { name: 'Sales Agent', systemPrompt: '...', tags: ['sales'] }
      ];
      const results = searchBlueprints(blueprints, 'helpdesk');
      expect(results).toHaveLength(1);
    });
  });
});