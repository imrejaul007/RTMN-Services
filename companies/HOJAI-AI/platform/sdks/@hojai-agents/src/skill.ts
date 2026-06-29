/**
 * HOJAI Skill
 */

export interface SkillDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  triggers?: string[];
  tools?: string[];
  memory_required?: string[];
  twins_required?: string[];
  permissions?: string[];
  outputs?: string[];
  metadata?: Record<string, any>;
}

export interface SkillContext {
  executionId: string;
  skillId: string;
  input: any;
  tools?: Record<string, any>;
}

export interface SkillResult {
  success: boolean;
  output?: any;
  error?: string;
  metrics?: {
    tokens?: number;
    duration?: number;
  };
}

export class Skill {
  public id: string;
  public name: string;
  public description?: string;
  public version: string;
  public triggers: string[];
  public tools: string[];
  public memory_required: string[];
  public twins_required: string[];
  public permissions: string[];
  public outputs: string[];
  public metadata: Record<string, any>;

  constructor(definition: SkillDefinition) {
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description;
    this.version = definition.version;
    this.triggers = definition.triggers || [];
    this.tools = definition.tools || [];
    this.memory_required = definition.memory_required || [];
    this.twins_required = definition.twins_required || [];
    this.permissions = definition.permissions || [];
    this.outputs = definition.outputs || [];
    this.metadata = definition.metadata || {};
  }

  async execute(context: SkillContext): Promise<SkillResult> {
    // Override in subclasses
    return { success: true, output: context.input };
  }

  toDefinition(): SkillDefinition {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      triggers: this.triggers,
      tools: this.tools,
      memory_required: this.memory_required,
      twins_required: this.twins_required,
      permissions: this.permissions,
      outputs: this.outputs,
      metadata: this.metadata,
    };
  }
}

// Pre-built skills
export class LeadQualificationSkill extends Skill {
  constructor() {
    super({
      id: 'lead-qualification',
      name: 'Lead Qualification',
      description: 'Qualify leads based on BANT criteria',
      version: '1.0.0',
      triggers: ['lead.created', 'form.submitted'],
      outputs: ['score', 'grade', 'recommendation'],
    });
  }

  async execute(context: SkillContext): Promise<SkillResult> {
    const { input } = context;

    // BANT criteria
    const budget = input.budget || 0;
    const authority = input.job_title?.match(/Director|VP|CEO|CFO|COO|Chief/) ? 1 : 0;
    const need = input.problem_statement ? 1 : 0.5;
    const timeline = input.timeline || 'unknown';

    let score = 0;
    if (budget > 100000) score += 30;
    else if (budget > 50000) score += 20;
    else if (budget > 10000) score += 10;

    if (authority) score += 30;
    if (need > 0.5) score += 20;
    if (timeline === 'immediate') score += 20;
    else if (timeline === '1-3 months') score += 10;

    let grade = 'D';
    if (score >= 80) grade = 'A';
    else if (score >= 60) grade = 'B';
    else if (score >= 40) grade = 'C';

    return {
      success: true,
      output: {
        score,
        grade,
        recommendation: score >= 60 ? 'contact' : 'nurture',
        criteria: { budget, authority, need, timeline },
      },
    };
  }
}

export class EmailOutreachSkill extends Skill {
  constructor() {
    super({
      id: 'email-outreach',
      name: 'Email Outreach',
      description: 'Send personalized cold emails',
      version: '1.0.0',
      triggers: ['lead.qualified'],
      tools: ['smtp', 'email_template'],
      outputs: ['email_sent', 'open_rate', 'response_rate'],
    });
  }

  async execute(context: SkillContext): Promise<SkillResult> {
    const { input } = context;

    // Generate personalized email
    const email = {
      to: input.email,
      subject: `Quick question about ${input.company}`,
      body: `Hi ${input.first_name},\n\n...`,
    };

    return {
      success: true,
      output: { email, status: 'sent' },
    };
  }
}
