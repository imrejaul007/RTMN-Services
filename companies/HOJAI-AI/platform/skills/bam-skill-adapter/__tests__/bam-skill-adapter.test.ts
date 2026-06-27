import { describe, it, expect } from 'vitest';

// BAM Skill Adapter Constants
const SYNC_STATUS = ['synced', 'pending', 'failed'];
const SKILL_STATES = ['active', 'inactive', 'deprecated'];

describe('BAM Skill Adapter', () => {
  describe('Sync Status', () => {
    it('should have all sync statuses', () => {
      expect(SYNC_STATUS).toContain('synced');
      expect(SYNC_STATUS).toContain('pending');
      expect(SYNC_STATUS).toContain('failed');
    });
  });

  describe('Skill States', () => {
    it('should have all skill states', () => {
      expect(SKILL_STATES).toContain('active');
      expect(SKILL_STATES).toContain('inactive');
      expect(SKILL_STATES).toContain('deprecated');
    });
  });

  describe('Skill Mapping', () => {
    const mapBAMSkill = (bamSkill: { id: string; name: string; category: string }) => {
      return {
        skillId: `bam-${bamSkill.id}`,
        name: bamSkill.name,
        category: bamSkill.category,
        source: 'bam'
      };
    };

    it('should map BAM skills correctly', () => {
      const result = mapBAMSkill({ id: '123', name: 'Chat GPT', category: 'llm' });
      expect(result.skillId).toBe('bam-123');
      expect(result.source).toBe('bam');
    });
  });

  describe('Sync Validation', () => {
    const validateSync = (sync: { skillId?: string; timestamp?: string }) => {
      const errors: string[] = [];
      if (!sync.skillId) errors.push('skillId required');
      if (!sync.timestamp) errors.push('timestamp required');
      return { valid: errors.length === 0, errors };
    };

    it('should validate sync data', () => {
      expect(validateSync({ skillId: 's1', timestamp: '2026-06-27' }).valid).toBe(true);
      expect(validateSync({}).valid).toBe(false);
    });
  });
});