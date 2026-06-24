/**
 * @hojai/skills SDK — SkillOS, Skill Marketplace, Prompts, Workflows, Translation.
 *
 * The capability layer that powers every HOJAI agent. Wraps 5 services:
 *
 *   os           (4743) — SkillOS: skill registry + execution + composition
 *   marketplace  (4120) — Skill Marketplace: discovery, install, review
 *   prompts      (4771) — Prompt Manager: versioned prompt templates
 *   workflows    (4938) — Workflow Marketplace: multi-step workflow deploy
 *   translation  (4866) — Translation OS: multi-provider translation + glossaries
 *
 * @example
 * ```ts
 * import { Skills } from '@hojai/skills';
 *
 * const s = new Skills({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Discover a skill semantically
 * const results = await s.os.semanticSearch({ q: 'translate Hindi to English' });
 *
 * // 2. Create + version a prompt template
 * const tpl = await s.prompts.create({ slug: 'welcome', name: 'Welcome', content: 'Hi {{name}}!', variables: ['name'] });
 * await s.prompts.publishVersion('welcome', { content: 'Hi {{name}}, welcome!', notes: 'add comma' });
 *
 * // 3. Install a skill from the marketplace
 * await s.marketplace.install('skill-123');
 *
 * // 4. Deploy a workflow
 * const dep = await s.workflows.deploy('wf-onboard-customer');
 *
 * // 5. Translate with glossary
 * const translation = await s.translation.translate({ text: 'Hello', sourceLang: 'en', targetLang: 'es', glossaryId: 'gl-1' });
 *
 * // 6. Execute a skill
 * const result = await s.os.execute('translate-hi-en', { text: 'नमस्ते' });
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { SkillOsClient } from './os.js';
import { SkillMarketplaceClient } from './marketplace.js';
import { PromptManagerClient, type PromptTemplate, type PromptVersion } from './prompts.js';
import { WorkflowMarketplaceClient, type Workflow, type Deployment } from './workflows.js';
import { TranslationClient, type Language, type TranslationProvider, type TranslationResult, type Glossary } from './translation.js';
import { SKILL_PORTS, type Skill, type SkillCategory, type SkillExecutionResult, type SkillMarketplaceListing } from './types.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { SkillOsClient } from './os.js';
export { SkillMarketplaceClient } from './marketplace.js';
export { PromptManagerClient, type PromptTemplate, type PromptVersion } from './prompts.js';
export { WorkflowMarketplaceClient, type Workflow, type Deployment } from './workflows.js';
export { TranslationClient, type Language, type TranslationProvider, type TranslationResult, type Glossary } from './translation.js';
export { SKILL_PORTS, type Skill, type SkillCategory, type SkillExecutionResult, type SkillMarketplaceListing } from './types.js';

export class Skills {
  public readonly os: SkillOsClient;
  public readonly marketplace: SkillMarketplaceClient;
  public readonly prompts: PromptManagerClient;
  public readonly workflows: WorkflowMarketplaceClient;
  public readonly translation: TranslationClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.os = new SkillOsClient(resolved);
    this.marketplace = new SkillMarketplaceClient(resolved);
    this.prompts = new PromptManagerClient(resolved);
    this.workflows = new WorkflowMarketplaceClient(resolved);
    this.translation = new TranslationClient(resolved);
  }
}

export default Skills;
