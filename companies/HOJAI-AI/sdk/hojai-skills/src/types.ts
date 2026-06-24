export const SKILL_PORTS: Record<string, number> = {
  os: 4743,         // SkillOS — capability registry + execution
  marketplace: 4120, // Skill Marketplace
  prompts: 4771,     // Prompt Manager
  workflows: 4938,   // Workflow Marketplace
  translation: 4866, // Translation OS
};

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Free-form tags */
  tags: string[];
  /** Inputs the skill accepts */
  inputs: Array<{ name: string; type: string; required: boolean; description?: string }>;
  /** What the skill returns */
  outputs: Array<{ name: string; type: string; description?: string }>;
  /** Version (semver) */
  version: string;
  /** Whether this skill is publicly available */
  public: boolean;
  /** Who created it */
  author?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  skillCount: number;
}

export interface SkillExecutionResult {
  skillId: string;
  status: 'success' | 'failed' | 'pending';
  output: Record<string, unknown>;
  durationMs: number;
  error?: string;
}

export interface SkillMarketplaceListing {
  id: string;
  skillId: string;
  publisher: string;
  price: { amount: number; currency: string } | null;
  rating: number;
  ratingCount: number;
  installs: number;
  publishedAt: string;
}
