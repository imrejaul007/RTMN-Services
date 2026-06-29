/**
 * AI Support Agent
 * Customer Support - Ticket Classification, Response Generation, Escalation
 */

import { Agent, AgentContext, AgentResult } from '@hojai/agents';
import { MemoryOS } from '@hojai/memory';

export interface Ticket {
  id?: string;
  subject: string;
  description: string;
  customer_email: string;
  customer_name?: string;
  channel: 'email' | 'chat' | 'whatsapp' | 'phone' | 'twitter';
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  category?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  status?: 'open' | 'pending' | 'resolved' | 'closed';
}

export interface SupportConfig {
  autoRespondConfidence: number; // Min confidence to auto-respond
  slaHours: { P1: number; P2: number; P3: number; P4: number };
  knowledgeBaseId?: string;
  escalationEmail?: string;
}

export class AISupportAgent extends Agent {
  private memory: MemoryOS;
  private config: SupportConfig;

  constructor(config: Partial<SupportConfig> = {}) {
    super({
      id: 'ai-support-agent',
      name: 'AI Support Agent',
      role: 'support',
      description: 'AI-powered customer support for ticket classification, response generation, and escalation',
      skills: [
        'ticket_classification',
        'sentiment_analysis',
        'knowledge_retrieval',
        'response_generation',
        'escalation_routing',
        'sla_monitoring'
      ],
      memory: {
        required: ['ticket_history', 'knowledge_base', 'customer_interactions', 'response_templates'],
        updateOn: ['ticket_created', 'response_sent', 'escalation_triggered']
      },
      twins: ['ticket_twin', 'customer_twin']
    });

    this.memory = new MemoryOS();
    this.config = {
      autoRespondConfidence: config.autoRespondConfidence ?? 0.8,
      slaHours: config.slaHours ?? { P1: 1, P2: 4, P3: 24, P4: 72 },
      knowledgeBaseId: config.knowledgeBaseId,
      escalationEmail: config.escalationEmail
    };
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const { input } = context;

    // Step 1: Classify ticket
    const classification = await this.classifyTicket(input);

    // Step 2: Analyze sentiment
    const sentiment = await this.analyzeSentiment(input);

    // Step 3: Retrieve knowledge
    const knowledge = await this.retrieveKnowledge(input);

    // Step 4: Generate response
    const response = await this.generateResponse(input, classification, knowledge);

    // Step 5: Determine action
    const action = this.determineAction(classification, sentiment, response.confidence);

    if (action.type === 'auto_respond') {
      // High confidence - auto-respond
      await this.sendResponse(input, response);
      await this.updateTicketStatus(input.id, 'pending');
    } else if (action.type === 'escalate') {
      // High priority or low confidence - escalate
      await this.escalate(input, classification, sentiment);
    } else {
      // Medium confidence - draft for human review
      await this.createDraft(input, response);
    }

    // Update memory with interaction
    await this.updateCustomerMemory(input, classification, sentiment);

    return {
      success: true,
      output: {
        ticket: input,
        classification,
        sentiment,
        response,
        action,
        knowledge
      }
    };
  }

  private async classifyTicket(ticket: Ticket): Promise<{
    category: string;
    subcategory?: string;
    priority: 'P1' | 'P2' | 'P3' | 'P4';
    intent: string;
    entities: Record<string, string>;
  }> {
    // Intent classification based on keywords
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();

    let category = 'general';
    let subcategory: string | undefined;
    let priority: 'P1' | 'P2' | 'P3' | 'P4' = 'P3';
    let intent = 'inquiry';

    // Billing/Payment issues - high priority
    if (text.match(/refund|cancel|charge|payment|billing|subscription/i)) {
      category = 'billing';
      priority = 'P2';
      intent = 'billing_issue';
    }

    // Technical issues - medium priority
    if (text.match(/bug|error|crash|not working|broken|issue/i)) {
      category = 'technical';
      priority = 'P2';
      intent = 'technical_support';
    }

    // Urgent indicators - P1
    if (text.match(/urgent|asap|emergency|critical|down|immediately/i)) {
      priority = 'P1';
    }

    // Account issues
    if (text.match(/password|login|access|account|locked/i)) {
      category = 'account';
      subcategory = 'access';
      intent = 'account_issue';
    }

    // Product inquiry
    if (text.match(/how to|feature|documentation|guide|tutorial/i)) {
      category = 'product';
      subcategory = 'howto';
      priority = 'P4';
      intent = 'product_inquiry';
    }

    // Complaints - potentially high priority
    if (text.match(/disappointed|frustrated|worst|terrible|complaint/i)) {
      if (priority !== 'P1') priority = 'P2';
      intent = 'complaint';
    }

    // Extract entities
    const entities: Record<string, string> = {};
    const orderMatch = text.match(/order\s*#?\s*(\w+)/i);
    if (orderMatch) entities.orderId = orderMatch[1];

    const invoiceMatch = text.match(/invoice\s*#?\s*(\w+)/i);
    if (invoiceMatch) entities.invoiceId = invoiceMatch[1];

    return {
      category,
      subcategory,
      priority,
      intent,
      entities
    };
  }

  private async analyzeSentiment(ticket: Ticket): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    indicators: string[];
  }> {
    const text = `${ticket.subject} ${ticket.description}`;

    const positive = [
      'thank', 'great', 'love', 'excellent', 'perfect', 'awesome',
      'happy', 'wonderful', 'amazing', 'fantastic', 'helpful', 'appreciate'
    ];

    const negative = [
      'terrible', 'worst', 'horrible', 'angry', 'frustrated', 'disappointed',
      'annoyed', 'upset', 'awful', 'hate', 'sucks', 'pathetic', 'useless',
      'ridiculous', 'unacceptable'
    ];

    const urgent = [
      'urgent', 'asap', 'immediately', 'emergency', 'critical', 'help',
      'rescue', 'save', 'fix now'
    ];

    let score = 0; // -100 to +100
    const indicators: string[] = [];

    positive.forEach(word => {
      if (text.toLowerCase().includes(word)) {
        score += 15;
        indicators.push(`positive: ${word}`);
      }
    });

    negative.forEach(word => {
      if (text.toLowerCase().includes(word)) {
        score -= 25;
        indicators.push(`negative: ${word}`);
      }
    });

    urgent.forEach(word => {
      if (text.toLowerCase().includes(word)) {
        score -= 10;
        indicators.push(`urgent: ${word}`);
      }
    });

    // Clamp score
    score = Math.max(-100, Math.min(100, score));

    let sentiment: 'positive' | 'neutral' | 'negative';
    if (score > 20) sentiment = 'positive';
    else if (score < -20) sentiment = 'negative';
    else sentiment = 'neutral';

    return { sentiment, score, indicators };
  }

  private async retrieveKnowledge(ticket: Ticket): Promise<{
    articles: any[];
    confidence: number;
  }> {
    // Search knowledge base
    const query = ticket.subject;
    const articles = await this.memory.search({
      type: 'knowledge_article',
      query,
      limit: 3
    });

    // Calculate confidence based on match
    const confidence = articles.length > 0 ? 0.85 : 0.3;

    return { articles, confidence };
  }

  private async generateResponse(
    ticket: Ticket,
    classification: { category: string; intent: string },
    knowledge: { articles: any[]; confidence: number }
  ): Promise<{
    subject: string;
    body: string;
    confidence: number;
    tone: 'formal' | 'friendly' | 'empathetic';
  }> {
    const tone = classification.category === 'billing' ? 'formal' : 'friendly';

    // Generate response based on knowledge
    if (knowledge.articles.length > 0 && knowledge.confidence > 0.7) {
      const article = knowledge.articles[0];

      return {
        subject: `Re: ${ticket.subject}`,
        body: this.formatResponse(ticket, article.content, tone),
        confidence: knowledge.confidence,
        tone
      };
    }

    // Generic response
    return {
      subject: `Re: ${ticket.subject}`,
      body: this.getGenericResponse(ticket, classification, tone),
      confidence: 0.5,
      tone
    };
  }

  private formatResponse(ticket: Ticket, solution: string, tone: string): string {
    const greeting = ticket.customer_name
      ? `Hi ${ticket.customer_name.split(' ')[0]},`
      : 'Hi,';

    return `${greeting}

Thank you for reaching out.

${solution}

Is there anything else I can help you with?

Best regards,
Support Team`;
  }

  private getGenericResponse(ticket: Ticket, classification: { category: string; intent: string }, tone: string): string {
    const greeting = ticket.customer_name
      ? `Hi ${ticket.customer_name.split(' ')[0]},`
      : 'Hi,';

    const templates: Record<string, string> = {
      billing: `Thank you for contacting us about your billing concern.

I've reviewed your account and I'm looking into this for you. You can expect an update within 24 hours.

In the meantime, if this is urgent, please reply with "URGENT" in the subject line.`,

      technical: `Thank you for reporting this issue.

Our technical team has been notified and is investigating. We'll keep you updated on our progress.

Expected resolution: Within ${this.config.slaHours.P2} hours.`,

      general: `Thank you for reaching out!

I've received your message and am looking into this for you. You can expect a detailed response within ${this.config.slaHours.P3} hours.

Best,
Support Team`
    };

    return `${greeting}

${templates[classification.category] || templates.general}`;
  }

  private determineAction(
    classification: { priority: string },
    sentiment: { sentiment: string },
    responseConfidence: number
  ): {
    type: 'auto_respond' | 'escalate' | 'draft';
    reason: string;
  } {
    // P1 always escalates
    if (classification.priority === 'P1') {
      return { type: 'escalate', reason: 'P1 priority' };
    }

    // Negative sentiment + high priority = escalate
    if (sentiment.sentiment === 'negative' && classification.priority === 'P2') {
      return { type: 'escalate', reason: 'Negative sentiment + P2 priority' };
    }

    // High confidence response = auto-respond
    if (responseConfidence >= this.config.autoRespondConfidence) {
      return { type: 'auto_respond', reason: `High confidence (${responseConfidence})` };
    }

    // Default to draft for human review
    return { type: 'draft', reason: 'Medium confidence - needs review' };
  }

  private async sendResponse(ticket: Ticket, response: { subject: string; body: string }): Promise<void> {
    // TODO: Integrate with email/chat/whatsapp
    await this.memory.save({
      type: 'support_response',
      ticketId: ticket.id,
      channel: ticket.channel,
      subject: response.subject,
      body: response.body,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });
  }

  private async escalate(ticket: Ticket, classification: any, sentiment: any): Promise<void> {
    await this.memory.save({
      type: 'escalation',
      ticketId: ticket.id,
      reason: `${classification.priority} - ${sentiment.sentiment} sentiment`,
      escalatedAt: new Date().toISOString(),
      assignedTo: 'support_manager'
    });

    // TODO: Send notification
    if (this.config.escalationEmail) {
      // Send email to escalation email
    }
  }

  private async createDraft(ticket: Ticket, response: { subject: string; body: string }): Promise<void> {
    await this.memory.save({
      type: 'draft_response',
      ticketId: ticket.id,
      draft: response,
      createdAt: new Date().toISOString(),
      status: 'draft'
    });
  }

  private async updateTicketStatus(ticketId: string | undefined, status: string): Promise<void> {
    if (!ticketId) return;
    // TODO: Update ticket in helpdesk
  }

  private async updateCustomerMemory(ticket: Ticket, classification: any, sentiment: any): Promise<void> {
    await this.memory.save({
      type: 'customer_interaction',
      customerEmail: ticket.customer_email,
      ticketId: ticket.id,
      category: classification.category,
      sentiment: sentiment.sentiment,
      timestamp: new Date().toISOString()
    });
  }
}

export default AISupportAgent;
