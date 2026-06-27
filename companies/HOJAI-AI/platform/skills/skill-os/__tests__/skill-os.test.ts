/**
 * SkillOS Tests - Port 4743
 * The Universal AI Capability Marketplace
 */
import { describe, it, expect } from 'vitest';

// Constants
const ASSET_TYPES = [
  'skill', 'agent-template', 'workflow-template', 'prompt-pack',
  'knowledge-pack', 'tool-connector', 'model-adapter', 'automation-pack',
  'industry-pack', 'enterprise-pack'
];

const VISIBILITY = ['public', 'private', 'organization'];
const OWNER_TYPES = ['user', 'organization'];
const CERT_LEVELS = ['none', 'basic', 'silver', 'gold', 'platinum'];
const ASSET_STATUSES = ['draft', 'published', 'deprecated', 'archived'];
const TX_KINDS = ['install', 'subscription', 'one-time', 'refund', 'payout'];
const VALID_RATINGS = [1, 2, 3, 4, 5];

const PLAN_INTERVALS = ['monthly', 'quarterly', 'annual'];
const PLAN_MODELS = ['free', 'per-seat', 'flat', 'consumption'];
const SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'past_due', 'trialing'];
const PAYOUT_STATUSES = ['pending', 'processing', 'completed', 'failed'];
const PAYOUT_METHODS = ['bank_transfer', 'paypal', 'crypto', 'store_credit'];

const BADGES = ['early_adopter', 'top_seller', 'verified', 'premium', 'power_user', 'mentor'];
const CATEGORIES = ['ai', 'commerce', 'business', 'productivity', 'communication', 'industry'];

describe('SkillOS - Constants', () => {
  describe('Asset Types', () => {
    it('should have all major asset types', () => {
      expect(ASSET_TYPES).toContain('skill');
      expect(ASSET_TYPES).toContain('agent-template');
      expect(ASSET_TYPES).toContain('workflow-template');
      expect(ASSET_TYPES).toContain('prompt-pack');
      expect(ASSET_TYPES).toContain('knowledge-pack');
      expect(ASSET_TYPES).toContain('tool-connector');
      expect(ASSET_TYPES).toContain('model-adapter');
      expect(ASSET_TYPES).toContain('automation-pack');
      expect(ASSET_TYPES).toContain('industry-pack');
      expect(ASSET_TYPES).toContain('enterprise-pack');
    });

    it('should have 10 asset types', () => {
      expect(ASSET_TYPES).toHaveLength(10);
    });
  });

  describe('Visibility Levels', () => {
    it('should have all visibility levels', () => {
      expect(VISIBILITY).toContain('public');
      expect(VISIBILITY).toContain('private');
      expect(VISIBILITY).toContain('organization');
    });
  });

  describe('Certification Levels', () => {
    it('should have all certification levels', () => {
      expect(CERT_LEVELS).toContain('none');
      expect(CERT_LEVELS).toContain('basic');
      expect(CERT_LEVELS).toContain('silver');
      expect(CERT_LEVELS).toContain('gold');
      expect(CERT_LEVELS).toContain('platinum');
    });

    it('should have 5 certification levels', () => {
      expect(CERT_LEVELS).toHaveLength(5);
    });
  });

  describe('Asset Statuses', () => {
    it('should have all lifecycle statuses', () => {
      expect(ASSET_STATUSES).toContain('draft');
      expect(ASSET_STATUSES).toContain('published');
      expect(ASSET_STATUSES).toContain('deprecated');
      expect(ASSET_STATUSES).toContain('archived');
    });
  });

  describe('Categories', () => {
    it('should have all major categories', () => {
      expect(CATEGORIES).toContain('ai');
      expect(CATEGORIES).toContain('commerce');
      expect(CATEGORIES).toContain('business');
      expect(CATEGORIES).toContain('productivity');
      expect(CATEGORIES).toContain('communication');
      expect(CATEGORIES).toContain('industry');
    });
  });

  describe('Rating Range', () => {
    it('should have valid rating range', () => {
      expect(VALID_RATINGS).toHaveLength(5);
      expect(VALID_RATINGS).toEqual([1, 2, 3, 4, 5]);
    });
  });
});

describe('SkillOS - Metadata Validation', () => {
  const validateMetadata = (metadata: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    visibility?: string;
    ownerType?: string;
  }): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!metadata.name || metadata.name.trim().length < 3) {
      errors.push('name must be at least 3 characters');
    }
    if (!metadata.description || metadata.description.trim().length < 10) {
      errors.push('description must be at least 10 characters');
    }
    if (!CATEGORIES.includes(metadata.category)) {
      errors.push(`category must be one of: ${CATEGORIES.join(', ')}`);
    }
    if (!VISIBILITY.includes(metadata.visibility)) {
      errors.push(`visibility must be one of: ${VISIBILITY.join(', ')}`);
    }
    if (!OWNER_TYPES.includes(metadata.ownerType)) {
      errors.push(`ownerType must be one of: ${OWNER_TYPES.join(', ')}`);
    }
    if (metadata.tags && metadata.tags.length > 20) {
      errors.push('maximum 20 tags allowed');
    }

    return { valid: errors.length === 0, errors };
  };

  it('should validate correct metadata', () => {
    const result = validateMetadata({
      name: 'My Awesome Skill',
      description: 'This is a great skill that does amazing things',
      category: 'ai',
      tags: ['machine-learning', 'nlp'],
      visibility: 'public',
      ownerType: 'user'
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require name', () => {
    const result = validateMetadata({
      description: 'A description of the skill',
      category: 'ai'
    });
    expect(result.valid).toBe(false);
  });

  it('should reject short name', () => {
    const result = validateMetadata({
      name: 'AI',
      description: 'A description of the skill',
      category: 'ai'
    });
    expect(result.valid).toBe(false);
  });

  it('should require description', () => {
    const result = validateMetadata({
      name: 'My Awesome Skill',
      category: 'ai'
    });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid category', () => {
    const result = validateMetadata({
      name: 'My Skill',
      description: 'A valid description here',
      category: 'invalid'
    });
    expect(result.valid).toBe(false);
  });

  it('should reject too many tags', () => {
    const result = validateMetadata({
      name: 'My Skill',
      description: 'A valid description here',
      category: 'ai',
      tags: Array(21).fill('tag')
    });
    expect(result.valid).toBe(false);
  });
});

describe('SkillOS - Skill Execution', () => {
  const executeSkill = (
    skill: {
      id: string;
      code: string;
      inputs: Record<string, any>;
      timeoutMs?: number;
    }
  ): { success: boolean; output?: any; error?: string; durationMs: number } => {
    const start = Date.now();

    if (!skill.code) {
      return { success: false, error: 'No skill code provided', durationMs: Date.now() - start };
    }

    // Simple mock execution
    try {
      const output = { result: `Executed ${skill.id}`, inputs: skill.inputs };
      return { success: true, output, durationMs: Date.now() - start };
    } catch (error) {
      return { success: false, error: (error as Error).message, durationMs: Date.now() - start };
    }
  };

  it('should execute a valid skill', () => {
    const result = executeSkill({
      id: 'sk-test',
      code: 'function main() { return true; }',
      inputs: { param1: 'value1' }
    });
    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
  });

  it('should fail for missing code', () => {
    const result = executeSkill({
      id: 'sk-test',
      code: '',
      inputs: {}
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should track execution duration', () => {
    const result = executeSkill({
      id: 'sk-test',
      code: 'function main() { return true; }',
      inputs: {}
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('SkillOS - Pricing & Billing', () => {
  const computePayout = (
    revenue: number,
    planModel: string,
    creatorShare: number = 70
  ): { gross: number; platformFee: number; creatorPayout: number } => {
    const platformFeeRate = planModel === 'free' ? 0 : planModel === 'consumption' ? 0.15 : 0.20;
    const platformFee = Math.round(revenue * platformFeeRate);
    const creatorPayout = revenue - platformFee;

    return {
      gross: revenue,
      platformFee,
      creatorPayout
    };
  };

  it('should calculate correct payout', () => {
    const payout = computePayout(1000, 'flat');
    expect(payout.gross).toBe(1000);
    expect(payout.platformFee).toBe(200); // 20%
    expect(payout.creatorPayout).toBe(800);
  });

  it('should handle free plan', () => {
    const payout = computePayout(0, 'free');
    expect(payout.platformFee).toBe(0);
    expect(payout.creatorPayout).toBe(0);
  });

  it('should apply lower fee for consumption model', () => {
    const flatPayout = computePayout(1000, 'flat');
    const consumptionPayout = computePayout(1000, 'consumption');
    expect(consumptionPayout.platformFee).toBeLessThan(flatPayout.platformFee);
    expect(consumptionPayout.creatorPayout).toBeGreaterThan(flatPayout.creatorPayout);
  });
});

describe('SkillOS - Certification', () => {
  const isValidLevel = (level: string): boolean => {
    return CERT_LEVELS.includes(level);
  };

  const getCertificationBenefits = (level: string): string[] => {
    switch (level) {
      case 'platinum': return ['verified_badge', 'priority_support', 'featured_listing', 'reduced_fees'];
      case 'gold': return ['verified_badge', 'featured_listing', 'reduced_fees'];
      case 'silver': return ['verified_badge', 'reduced_fees'];
      case 'basic': return ['basic_badge'];
      default: return [];
    }
  };

  it('should validate certification levels', () => {
    CERT_LEVELS.forEach(level => {
      expect(isValidLevel(level)).toBe(true);
    });
    expect(isValidLevel('invalid')).toBe(false);
  });

  it('should return correct benefits for platinum', () => {
    const benefits = getCertificationBenefits('platinum');
    expect(benefits).toContain('verified_badge');
    expect(benefits).toContain('priority_support');
    expect(benefits).toContain('featured_listing');
    expect(benefits).toContain('reduced_fees');
  });

  it('should return no benefits for none', () => {
    const benefits = getCertificationBenefits('none');
    expect(benefits).toHaveLength(0);
  });
});

describe('SkillOS - Reviews & Ratings', () => {
  const aggregateReviews = (
    reviews: Array<{ rating: number; helpful: number; status: string }>
  ): {
    avgRating: number;
    totalReviews: number;
    distribution: Record<number, number>;
    avgHelpful: number;
  } => {
    const activeReviews = reviews.filter(r => r.status !== 'flagged');
    const total = activeReviews.length;
    const sum = activeReviews.reduce((acc, r) => acc + r.rating, 0);
    const helpfulSum = activeReviews.reduce((acc, r) => acc + r.helpful, 0);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    activeReviews.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

    return {
      avgRating: total > 0 ? sum / total : 0,
      totalReviews: total,
      distribution,
      avgHelpful: total > 0 ? helpfulSum / total : 0
    };
  };

  it('should aggregate reviews correctly', () => {
    const reviews = [
      { rating: 5, helpful: 10, status: 'published' },
      { rating: 4, helpful: 5, status: 'published' },
      { rating: 3, helpful: 2, status: 'published' },
      { rating: 5, helpful: 8, status: 'flagged' }
    ];
    const result = aggregateReviews(reviews);
    expect(result.totalReviews).toBe(3); // excludes flagged
    expect(result.avgRating).toBe(4);
    expect(result.distribution[5]).toBe(1);
    expect(result.distribution[4]).toBe(1);
    expect(result.distribution[3]).toBe(1);
  });

  it('should handle empty reviews', () => {
    const result = aggregateReviews([]);
    expect(result.avgRating).toBe(0);
    expect(result.totalReviews).toBe(0);
  });
});

describe('SkillOS - Dependencies', () => {
  const resolveDependencies = (
    skills: Array<{ id: string; dependencies: string[] }>,
    targetId: string
  ): { resolved: string[]; missing: string[]; circular: boolean } => {
    const target = skills.find(s => s.id === targetId);
    if (!target) return { resolved: [], missing: [], circular: false };

    const resolved: string[] = [];
    const missing: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const resolve = (id: string): boolean => {
      if (visiting.has(id)) return false; // circular
      if (visited.has(id)) return true;

      const skill = skills.find(s => s.id === id);
      if (!skill) {
        missing.push(id);
        return true;
      }

      visiting.add(id);

      for (const dep of skill.dependencies) {
        if (!resolve(dep)) return false; // circular
      }

      visiting.delete(id);
      visited.add(id);
      resolved.push(id);
      return true;
    };

    resolve(targetId);
    return { resolved, missing, circular: false };
  };

  it('should resolve direct dependencies', () => {
    const skills = [
      { id: 'sk-a', dependencies: [] },
      { id: 'sk-b', dependencies: ['sk-a'] },
      { id: 'sk-c', dependencies: ['sk-b'] }
    ];
    const result = resolveDependencies(skills, 'sk-c');
    expect(result.resolved).toContain('sk-a');
    expect(result.resolved).toContain('sk-b');
    expect(result.resolved).toContain('sk-c');
  });

  it('should identify missing dependencies', () => {
    const skills = [
      { id: 'sk-a', dependencies: ['sk-missing'] }
    ];
    const result = resolveDependencies(skills, 'sk-a');
    expect(result.missing).toContain('sk-missing');
  });
});

describe('SkillOS - Search & Discovery', () => {
  const searchAssets = (
    assets: Array<{
      name: string;
      description: string;
      tags: string[];
      category: string;
      certLevel: string;
      installs: number;
    }>,
    query: string
  ): Array<{ asset: any; score: number }> => {
    const q = query.toLowerCase();
    return assets
      .map(asset => {
        let score = 0;
        if (asset.name.toLowerCase().includes(q)) score += 10;
        if (asset.description.toLowerCase().includes(q)) score += 5;
        if (asset.tags.some(t => t.toLowerCase().includes(q))) score += 3;
        if (asset.category === q) score += 2;
        return { asset, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
  };

  it('should prioritize name matches', () => {
    const assets = [
      { name: 'Calendar Skill', description: 'Manage calendars', tags: ['schedule'], category: 'productivity', certLevel: 'gold', installs: 100 },
      { name: 'Reminder Skill', description: 'Calendar integration', tags: ['schedule'], category: 'productivity', certLevel: 'silver', installs: 50 }
    ];
    const results = searchAssets(assets, 'calendar');
    expect(results[0].asset.name).toBe('Calendar Skill');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('should score tag matches', () => {
    const assets = [
      { name: 'Skill A', description: 'Does things', tags: ['nlp', 'ml'], category: 'ai', certLevel: 'none', installs: 10 },
      { name: 'Skill B', description: 'Does other things', tags: ['web'], category: 'productivity', certLevel: 'none', installs: 5 }
    ];
    const results = searchAssets(assets, 'ml');
    expect(results).toHaveLength(1);
    expect(results[0].asset.name).toBe('Skill A');
  });
});

describe('SkillOS - Version Management', () => {
  const bumpVersion = (current: string, type: 'major' | 'minor' | 'patch'): string => {
    const parts = current.split('.').map(Number);
    if (parts.length !== 3) parts.fill(0, 0, 3 - parts.length);

    switch (type) {
      case 'major': return `${parts[0] + 1}.0.0`;
      case 'minor': return `${parts[0]}.${parts[1] + 1}.0`;
      case 'patch': return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    }
  };

  it('should bump major version', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0');
  });

  it('should bump minor version', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
  });

  it('should bump patch version', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4');
  });
});

describe('SkillOS - Reputation & Badges', () => {
  const buildReputation = (
    reviews: number,
    avgRating: number,
    installs: number,
    payouts: number
  ): { score: number; tier: string; badges: string[] } => {
    const reviewScore = Math.min(30, reviews * 3);
    const ratingScore = avgRating * 14; // 5 * 14 = 70
    const installScore = Math.min(30, Math.log10(Math.max(1, installs)) * 10);
    const payoutScore = Math.min(20, Math.log10(Math.max(1, payouts)) * 5);

    const score = Math.round(reviewScore + ratingScore + installScore + payoutScore);

    let tier: string;
    if (score >= 90) tier = 'legendary';
    else if (score >= 70) tier = 'expert';
    else if (score >= 50) tier = 'intermediate';
    else tier = 'beginner';

    const badges: string[] = [];
    if (avgRating >= 4.5) badges.push('top_seller');
    if (reviews >= 10) badges.push('verified');
    if (payouts >= 1000) badges.push('premium');

    return { score, tier, badges };
  };

  it('should calculate reputation correctly', () => {
    const rep = buildReputation(20, 4.5, 1000, 500);
    expect(rep.score).toBeGreaterThan(50);
  });

  it('should assign correct tier', () => {
    expect(buildReputation(20, 5, 10000, 5000).tier).toBe('legendary');
    expect(buildReputation(10, 4, 500, 100).tier).toBe('expert');
    expect(buildReputation(5, 3, 50, 10).tier).toBe('intermediate');
  });

  it('should award badges', () => {
    const rep = buildReputation(15, 4.8, 2000, 2000);
    expect(rep.badges).toContain('top_seller');
    expect(rep.badges).toContain('verified');
    expect(rep.badges).toContain('premium');
  });
});
