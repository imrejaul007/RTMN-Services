/**
 * HOJAI Agent
 */

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  description?: string;
  skills: string[];
  memory?: {
    required?: string[];
    updateOn?: string[];
  };
  twins?: string[];
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface AgentContext {
  executionId: string;
  agentId: string;
  input: any;
  memory?: Record<string, any>;
  twins?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  output?: any;
  error?: string;
  metrics?: {
    tokens?: number;
    duration?: number;
    actions?: number;
  };
}

export class Agent {
  public id: string;
  public name: string;
  public role: string;
  public description?: string;
  public skills: string[];
  public memory?: AgentDefinition['memory'];
  public twins: string[];
  public permissions: string[];
  public metadata: Record<string, any>;

  constructor(definition: AgentDefinition) {
    this.id = definition.id;
    this.name = definition.name;
    this.role = definition.role;
    this.description = definition.description;
    this.skills = definition.skills || [];
    this.memory = definition.memory;
    this.twins = definition.twins || [];
    this.permissions = definition.permissions || [];
    this.metadata = definition.metadata || {};
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Override in subclasses
    return { success: true, output: context.input };
  }

  async *stream(context: AgentContext): AsyncGenerator<AgentResult> {
    // Override for streaming
    const result = await this.execute(context);
    yield result;
  }

  toDefinition(): AgentDefinition {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      description: this.description,
      skills: this.skills,
      memory: this.memory,
      twins: this.twins,
      permissions: this.permissions,
      metadata: this.metadata,
    };
  }
}

// Pre-built agents
export class SDRAgent extends Agent {
  constructor(id = 'sdr-agent') {
    super({
      id,
      name: 'Sales Development Rep',
      role: 'sdr',
      description: 'AI-powered sales development rep for lead qualification and outreach',
      skills: ['lead_qualification', 'company_research', 'email_outreach', 'meeting_booking'],
    });
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const { input } = context;

    // Lead qualification logic
    const leadScore = await this.qualifyLead(input);

    if (leadScore >= 70) {
      await this.bookMeeting(input);
      return { success: true, output: { lead: input, score: leadScore, action: 'meeting_booked' } };
    } else {
      return { success: true, output: { lead: input, score: leadScore, action: 'nurture' } };
    }
  }

  private async qualifyLead(lead: any): Promise<number> {
    // Simplified scoring
    let score = 50;
    if (lead.company_size > 100) score += 20;
    if (lead.job_title?.includes('Director') || lead.job_title?.includes('VP')) score += 15;
    if (lead.budget_indicator) score += 15;
    return Math.min(score, 100);
  }

  private async bookMeeting(lead: any): Promise<void> {
    // Integrate with calendar
  }
}

export class SupportAgent extends Agent {
  constructor(id = 'support-agent') {
    super({
      id,
      name: 'Customer Support',
      role: 'support',
      description: 'AI-powered customer support agent',
      skills: ['ticket_classification', 'knowledge_retrieval', 'response_generation', 'sentiment_analysis'],
    });
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const { input } = context;

    const ticket = await this.classifyTicket(input);

    if (ticket.confidence >= 0.8) {
      const response = await this.generateResponse(ticket);
      return { success: true, output: { ticket, response, autoReply: true } };
    } else {
      return { success: true, output: { ticket, response: null, autoReply: false } };
    }
  }

  private async classifyTicket(ticket: any) {
    return { category: 'general', confidence: 0.85 };
  }

  private async generateResponse(ticket: any): Promise<string> {
    return 'Thank you for reaching out. We are looking into your issue.';
  }
}
