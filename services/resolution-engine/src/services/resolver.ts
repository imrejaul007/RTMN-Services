import { v4 as uuidv4 } from 'uuid';
import {
  Resolution,
  resolutionTemplates,
  escalationRules,
  resolutionStore,
  ResolutionTemplate
} from '../models/Resolution';
import { KnowledgeResolver } from './knowledgeResolver';
import { CustomerOpsBridge } from './customerOpsBridge';
import winston from 'winston';

export interface AutoResolveResult {
  resolved: boolean;
  match?: ResolutionTemplate;
  confidence?: number;
  method?: 'auto' | 'kb' | 'ai';
}

export interface EscalationResult {
  escalated: boolean;
  rule?: {
    id: string;
    trigger: string;
    escalationLevel: number;
    assignTo: string;
  };
  reason?: string;
}

export class ResolverService {
  private knowledgeResolver: KnowledgeResolver;
  private customerBridge: CustomerOpsBridge;
  private logger: winston.Logger;
  private autoResolveEnabled: boolean;
  private confidenceThreshold: number;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.knowledgeResolver = new KnowledgeResolver(logger);
    this.customerBridge = new CustomerOpsBridge(logger);
    this.autoResolveEnabled = process.env.AUTO_RESOLVE_ENABLED !== 'false';
    this.confidenceThreshold = parseFloat(process.env.AUTO_RESOLVE_CONFIDENCE_THRESHOLD || '0.85');
  }

  async tryAutoResolve(resolution: Resolution): Promise<AutoResolveResult> {
    if (!this.autoResolveEnabled) {
      return { resolved: false };
    }

    this.logger.info(`Attempting auto-resolution for ticket: ${resolution.ticketId}`);

    try {
      // Step 1: Match against resolution templates
      const templateMatch = this.matchTemplate(resolution);

      if (templateMatch && templateMatch.confidence >= this.confidenceThreshold) {
        return this.applyTemplateResolution(resolution, templateMatch);
      }

      // Step 2: Try Knowledge Base resolution
      const kbResult = await this.knowledgeResolver.resolveFromKB(resolution);

      if (kbResult.resolved && kbResult.confidence && kbResult.confidence >= this.confidenceThreshold) {
        return this.applyKBResolution(resolution, kbResult);
      }

      // Step 3: Check if AI resolution should be attempted
      if (resolution.priority === 'critical' || resolution.priority === 'high') {
        const aiResult = await this.tryAIResolution(resolution);
        if (aiResult.resolved) {
          return aiResult;
        }
      }

      // No auto-resolution possible
      this.logger.info(`No auto-resolution found for ticket: ${resolution.ticketId}`);
      return { resolved: false };
    } catch (error: any) {
      this.logger.error(`Auto-resolution error for ${resolution.ticketId}:`, error);
      return { resolved: false };
    }
  }

  private matchTemplate(resolution: Resolution): ResolutionTemplate | null {
    const titleLower = resolution.title.toLowerCase();
    const descLower = resolution.description.toLowerCase();
    const categoryLower = resolution.category.toLowerCase();

    let bestMatch: ResolutionTemplate | null = null;
    let bestScore = 0;

    resolutionTemplates.forEach(template => {
      let score = 0;

      // Check keywords
      template.keywords.forEach(keyword => {
        const kwLower = keyword.toLowerCase();
        if (titleLower.includes(kwLower)) score += 3;
        if (descLower.includes(kwLower)) score += 1;
        if (categoryLower.includes(kwLower)) score += 2;
      });

      // Exact title match bonus
      if (titleLower === template.title.toLowerCase()) {
        score += 10;
      }

      // Title contains bonus
      if (titleLower.includes(template.title.toLowerCase())) {
        score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = template;
      }
    });

    if (bestMatch && bestScore > 0) {
      // Normalize confidence based on score
      const normalizedConfidence = Math.min(0.95, bestMatch.confidence * (bestScore / 20));
      return { ...bestMatch, confidence: normalizedConfidence };
    }

    return null;
  }

  private async applyTemplateResolution(
    resolution: Resolution,
    template: ResolutionTemplate
  ): Promise<AutoResolveResult> {
    this.logger.info(`Applying template resolution: ${template.name} for ticket: ${resolution.ticketId}`);

    resolution.resolutionMethod = 'auto';
    resolution.resolutionTemplateId = template.id;
    resolution.resolution = template.solution;
    resolution.steps = template.steps;
    resolution.confidence = template.confidence;
    resolution.status = 'auto_resolved';
    resolution.resolvedAt = new Date();
    resolution.updatedAt = new Date();

    resolutionStore.set(resolution.id, resolution);

    // Notify customer bridge
    await this.customerBridge.notifyResolution(resolution);

    return {
      resolved: true,
      match: template,
      confidence: template.confidence,
      method: 'auto'
    };
  }

  private async applyKBResolution(
    resolution: Resolution,
    kbResult: any
  ): Promise<AutoResolveResult> {
    this.logger.info(`Applying KB resolution for ticket: ${resolution.ticketId}`);

    resolution.resolutionMethod = 'kb';
    resolution.resolution = kbResult.solution;
    resolution.steps = kbResult.steps;
    resolution.confidence = kbResult.confidence;
    resolution.status = 'auto_resolved';
    resolution.resolvedAt = new Date();
    resolution.updatedAt = new Date();

    resolutionStore.set(resolution.id, resolution);

    await this.customerBridge.notifyResolution(resolution);

    return {
      resolved: true,
      confidence: kbResult.confidence,
      method: 'kb'
    };
  }

  private async tryAIResolution(resolution: Resolution): Promise<AutoResolveResult> {
    this.logger.info(`Attempting AI resolution for ticket: ${resolution.ticketId}`);

    // Placeholder for AI resolution logic
    // In production, this would call an AI service
    return { resolved: false };
  }

  async checkAndEscalate(resolution: Resolution): Promise<EscalationResult> {
    const now = new Date();

    // Check SLA breach
    if (!resolution.slaBreached && now > resolution.slaResolutionDeadline) {
      resolution.slaBreached = true;
      resolution.slaBreachTime = now;
      resolutionStore.set(resolution.id, resolution);
    }

    // Find applicable escalation rules
    for (const rule of escalationRules.values()) {
      let shouldEscalate = false;

      switch (rule.trigger) {
        case 'sla_breach':
          shouldEscalate = resolution.slaBreached;
          break;
        case 'priority':
          shouldEscalate = resolution.priority === rule.threshold;
          break;
        case 'customer_level':
          shouldEscalate = resolution.customerTier === rule.threshold;
          break;
        case 'escalation_count':
          shouldEscalate = resolution.escalationCount >= Number(rule.threshold);
          break;
      }

      if (shouldEscalate) {
        return this.executeEscalation(resolution, rule);
      }
    }

    return { escalated: false };
  }

  private async executeEscalation(
    resolution: Resolution,
    rule: any
  ): Promise<EscalationResult> {
    this.logger.info(`Executing escalation for ticket: ${resolution.ticketId}, rule: ${rule.id}`);

    resolution.escalationCount += 1;
    resolution.escalationHistory.push({
      escalatedAt: new Date(),
      escalatedTo: rule.assignTo,
      reason: `Escalation rule triggered: ${rule.trigger}`,
      previousPriority: resolution.priority
    });

    resolution.status = 'escalated';
    resolution.escalatedTo = rule.assignTo;
    resolution.updatedAt = new Date();

    resolutionStore.set(resolution.id, resolution);

    // Notify via customer bridge
    await this.customerBridge.notifyEscalation(resolution, rule);

    return {
      escalated: true,
      rule: {
        id: rule.id,
        trigger: rule.trigger,
        escalationLevel: rule.escalationLevel,
        assignTo: rule.assignTo
      },
      reason: `Escalation rule triggered: ${rule.trigger}`
    };
  }

  async assignAgent(resolution: Resolution, agentCriteria?: {
    skills?: string[];
    workload?: number;
  }): Promise<{ agentId: string; agentName: string; team: string } | null> {
    // In production, this would call Agent Twin service
    // For now, return a placeholder
    const agent = {
      agentId: uuidv4(),
      agentName: 'Auto-Assigned Agent',
      team: 'support-tier-2'
    };

    resolution.assignedAgent = {
      agentId: agent.agentId,
      agentName: agent.agentName,
      team: agent.team,
      skills: agentCriteria?.skills || [],
      workload: agentCriteria?.workload || 0,
      assignedAt: new Date()
    };

    resolutionStore.set(resolution.id, resolution);
    return agent;
  }

  getResolutionTemplates(): ResolutionTemplate[] {
    return Array.from(resolutionTemplates.values());
  }

  addTemplate(template: Omit<ResolutionTemplate, 'id'>): ResolutionTemplate {
    const newTemplate: ResolutionTemplate = {
      id: uuidv4(),
      ...template
    };
    resolutionTemplates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }
}
