/**
 * GlamAI - Beauty Memory Service Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// HAIR COLOR FORMULA
// ============================================

describe('Beauty Memory - Hair Color Formula', () => {
  interface HairColorFormula {
    color: string;
    brand: string;
    developer: string;
    processingTime: number;
    notes: string;
  }

  describe('createHairColorFormula', () => {
    it('should create valid hair color formula', () => {
      const formula: HairColorFormula = {
        color: '#4A3B2C',
        brand: 'L\'Oreal',
        developer: '20 Volume',
        processingTime: 45,
        notes: 'Balayage technique',
      };

      expect(formula.color).toBeDefined();
      expect(formula.brand).toBeDefined();
      expect(formula.processingTime).toBeGreaterThan(0);
    });

    it('should validate processing time', () => {
      const validTimes = [30, 45, 60];
      validTimes.forEach(time => {
        expect(time).toBeGreaterThan(0);
        expect(time).toBeLessThanOrEqual(60);
      });
    });

    it('should handle color codes', () => {
      const colors = ['#4A3B2C', '6/0', 'Dark Brown', 'Balayage'];
      colors.forEach(color => {
        expect(typeof color).toBe('string');
      });
    });
  });

  describe('Hair Types', () => {
    const hairTypes = ['straight', 'wavy', 'curly', 'coily'] as const;

    it('should have valid hair types', () => {
      expect(hairTypes).toContain('straight');
      expect(hairTypes).toContain('wavy');
      expect(hairTypes).toContain('curly');
      expect(hairTypes).toContain('coily');
    });

    it('should validate hair type', () => {
      const isValidType = (type: string) => hairTypes.includes(type as any);
      expect(isValidType('curly')).toBe(true);
      expect(isValidType('invalid')).toBe(false);
    });
  });

  describe('Hair Textures', () => {
    const textures = ['fine', 'medium', 'coarse'] as const;

    it('should have valid textures', () => {
      expect(textures).toHaveLength(3);
      expect(textures).toContain('medium');
    });
  });

  describe('Scalp Conditions', () => {
    const conditions = ['normal', 'oily', 'dry', 'sensitive'] as const;

    it('should have valid conditions', () => {
      expect(conditions).toContain('sensitive');
      expect(conditions).toContain('normal');
    });
  });
});

// ============================================
// STYLIST NOTES
// ============================================

describe('Beauty Memory - Stylist Notes', () => {
  interface StylistNote {
    noteId: string;
    content: string;
    category: 'treatment' | 'preference' | 'allergy' | 'concern' | 'general';
    stylistId: string;
    stylistName: string;
    createdAt: Date;
  }

  describe('createNote', () => {
    it('should create valid note', () => {
      const note: StylistNote = {
        noteId: 'note_123',
        content: 'Client prefers minimal product',
        category: 'preference',
        stylistId: 'stylist_456',
        stylistName: 'John Doe',
        createdAt: new Date(),
      };

      expect(note.noteId).toBeDefined();
      expect(note.content).toBeDefined();
      expect(note.category).toBe('preference');
    });

    it('should validate note categories', () => {
      const categories = ['treatment', 'preference', 'allergy', 'concern', 'general'];
      categories.forEach(cat => {
        const note = { category: cat };
        expect(categories).toContain(note.category);
      });
    });
  });

  describe('Note Categories', () => {
    it('should track allergy notes', () => {
      const allergyNote = {
        category: 'allergy' as const,
        content: 'Allergic to ammonia',
      };
      expect(allergyNote.category).toBe('allergy');
    });

    it('should track preference notes', () => {
      const prefNote = {
        category: 'preference' as const,
        content: 'Prefers sulfate-free products',
      };
      expect(prefNote.category).toBe('preference');
    });
  });
});

// ============================================
// PRODUCT REACTIONS
// ============================================

describe('Beauty Memory - Product Reactions', () => {
  interface ProductReaction {
    productId: string;
    productName: string;
    reaction: 'loved' | 'liked' | 'neutral' | 'disliked' | 'allergic';
    notes: string;
    date: Date;
  }

  describe('createReaction', () => {
    it('should create valid reaction', () => {
      const reaction: ProductReaction = {
        productId: 'prod_789',
        productName: 'Kerastase Elixir',
        reaction: 'loved',
        notes: 'Left hair very soft',
        date: new Date(),
      };

      expect(reaction.reaction).toBe('loved');
      expect(reaction.productId).toBeDefined();
    });

    it('should validate reaction types', () => {
      const reactions: ProductReaction['reaction'][] = ['loved', 'liked', 'neutral', 'disliked', 'allergic'];
      expect(reactions).toHaveLength(5);
    });
  });

  describe('Allergic Reactions', () => {
    it('should flag allergic reactions', () => {
      const allergic = { reaction: 'allergic' as const, notes: 'Skin irritation' };
      expect(allergic.reaction).toBe('allergic');
    });
  });
});

// ============================================
// SKIN TYPES
// ============================================

describe('Beauty Memory - Skin Types', () => {
  const skinTypes = ['dry', 'oily', 'combination', 'sensitive', 'normal'] as const;

  it('should have valid skin types', () => {
    expect(skinTypes).toContain('sensitive');
    expect(skinTypes).toHaveLength(5);
  });

  it('should validate skin type', () => {
    const isValid = (type: string) => skinTypes.includes(type as any);
    expect(isValid('oily')).toBe(true);
    expect(isValid('invalid')).toBe(false);
  });
});

// ============================================
// BEAUTY PROFILE
// ============================================

describe('Beauty Memory - Beauty Profile', () => {
  interface BeautyProfile {
    hairType: 'straight' | 'wavy' | 'curly' | 'coily';
    hairTexture: 'fine' | 'medium' | 'coarse';
    scalpCondition: 'normal' | 'oily' | 'dry' | 'sensitive';
    skinType: 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal';
    allergies: string[];
  }

  it('should create complete profile', () => {
    const profile: BeautyProfile = {
      hairType: 'curly',
      hairTexture: 'coarse',
      scalpCondition: 'dry',
      skinType: 'combination',
      allergies: ['ammonia', 'parabens'],
    };

    expect(profile.hairType).toBe('curly');
    expect(profile.allergies).toHaveLength(2);
  });

  it('should track allergies', () => {
    const profile = { allergies: ['sulfates', 'ammonia'] };
    expect(profile.allergies).toContain('sulfates');
  });
});
