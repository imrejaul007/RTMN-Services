/**
 * HOJAI SkillNet Client
 * Connects to SkillNet for AI skills and domain expertise
 */

const SKILLNET_URL = process.env.SKILLNET_URL || 'http://localhost:5130';
const INTELLIGENCE_URL = process.env.INTELLIGENCE_URL || 'http://localhost:5130';
const RUNTIME_URL = process.env.RUNTIME_URL || 'http://localhost:5120';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  complexity: 'basic' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime: string;
  prerequisites?: string[];
  outcomes?: string[];
  rating?: number;
  usageCount?: number;
}

export interface GoalDecomposition {
  goal: string;
  steps: {
    order: number;
    action: string;
    skill?: string;
    estimatedTime: string;
    dependencies?: string[];
  }[];
  context: Record<string, any>;
  confidence: number;
}

export interface SkillExecution {
  skillId: string;
  input: any;
  output?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executionId?: string;
  error?: string;
  duration?: number;
}

export interface SkillRecommendation {
  userId: string;
  skills: Skill[];
  reason: string;
  matchScore: number;
}

export class SkillNetClient {
  private skillnetUrl: string;
  private intelligenceUrl: string;
  private runtimeUrl: string;

  constructor() {
    this.skillnetUrl = SKILLNET_URL;
    this.intelligenceUrl = INTELLIGENCE_URL;
    this.runtimeUrl = RUNTIME_URL;
  }

  /**
   * Get available skills, optionally filtered by category
   */
  async getSkills(category?: string): Promise<{ skills: Skill[]; error?: string }> {
    try {
      const url = category
        ? `${this.skillnetUrl}/api/skills?category=${encodeURIComponent(category)}`
        : `${this.skillnetUrl}/api/skills`;
      const response = await fetch(url);
      return response.json();
    } catch (error) {
      return { skills: [], error: error instanceof Error ? error.message : 'SkillNet unavailable' };
    }
  }

  /**
   * Get skill by ID
   */
  async getSkill(skillId: string): Promise<Skill | { error: string }> {
    try {
      const response = await fetch(`${this.skillnetUrl}/api/skills/${skillId}`);
      if (!response.ok) {
        return { error: `Skill not found: ${response.status}` };
      }
      return response.json();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'SkillNet unavailable' };
    }
  }

  /**
   * Execute goal decomposition
   */
  async executeGoal(goal: string, context: any): Promise<GoalDecomposition | { error: string }> {
    try {
      const response = await fetch(`${this.intelligenceUrl}/api/intelligence/decompose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, context })
      });
      return response.json();
    } catch (error) {
      return {
        goal,
        steps: [],
        context: {},
        confidence: 0,
        error: error instanceof Error ? error.message : 'Intelligence service unavailable'
      };
    }
  }

  /**
   * Run a specific skill
   */
  async runSkill(skillId: string, input: any): Promise<SkillExecution | { error: string }> {
    try {
      const response = await fetch(`${this.runtimeUrl}/api/runtime/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, input })
      });
      return response.json();
    } catch (error) {
      return {
        skillId,
        input,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Runtime service unavailable'
      };
    }
  }

  /**
   * Get skill recommendations for user
   */
  async getRecommendations(userId: string, context?: any): Promise<SkillRecommendation | { error: string }> {
    try {
      const response = await fetch(`${this.skillnetUrl}/api/skills/recommend/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });
      return response.json();
    } catch (error) {
      return {
        userId,
        skills: [],
        reason: 'Service unavailable',
        matchScore: 0,
        error: error instanceof Error ? error.message : 'Recommendation service unavailable'
      };
    }
  }

  /**
   * Get skills by category
   */
  async getSkillsByCategory(category: string): Promise<{ skills: Skill[]; error?: string }> {
    return this.getSkills(category);
  }

  /**
   * Get trending skills
   */
  async getTrendingSkills(limit = 10): Promise<{ skills: Skill[]; error?: string }> {
    try {
      const response = await fetch(`${this.skillnetUrl}/api/skills/trending?limit=${limit}`);
      return response.json();
    } catch (error) {
      return { skills: [], error: error instanceof Error ? error.message : 'SkillNet unavailable' };
    }
  }

  /**
   * Get skill categories
   */
  async getCategories(): Promise<{ categories: string[]; error?: string }> {
    try {
      const response = await fetch(`${this.skillnetUrl}/api/skills/categories`);
      return response.json();
    } catch (error) {
      return { categories: [], error: error instanceof Error ? error.message : 'SkillNet unavailable' };
    }
  }

  /**
   * Track skill usage
   */
  async trackUsage(skillId: string, userId: string, outcome: 'success' | 'failed'): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.skillnetUrl}/api/skills/${skillId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, outcome })
      });
      return response.json();
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; skills: number; error?: string }> {
    try {
      const [skillnet, intelligence, runtime] = await Promise.all([
        fetch(`${this.skillnetUrl}/health`).then(r => r.ok).catch(() => false),
        fetch(`${this.intelligenceUrl}/health`).then(r => r.ok).catch(() => false),
        fetch(`${this.runtimeUrl}/health`).then(r => r.ok).catch(() => false),
      ]);

      return {
        healthy: skillnet && intelligence && runtime,
        skills: skillnet ? 100 : 0,
        error: !skillnet ? 'SkillNet unavailable' : !intelligence ? 'Intelligence unavailable' : !runtime ? 'Runtime unavailable' : undefined
      };
    } catch (error) {
      return { healthy: false, skills: 0, error: error instanceof Error ? error.message : 'Service unavailable' };
    }
  }
}

export const skillnet = new SkillNetClient();
export default skillnet;
