import { v4 as uuidv4 } from 'uuid';
import { Skill, AgentSkill, RoutingRule } from '../models';

export class RoutingService {
  /**
   * Create skill
   */
  async createSkill(data: {
    tenantId: string;
    name: string;
    description?: string;
    category?: string;
    level?: number;
  }): Promise<any> {
    const skill = new Skill({
      skillId: `skill_${uuidv4()}`,
      ...data
    });
    await skill.save();
    return skill;
  }

  /**
   * Add skill to agent
   */
  async addAgentSkill(data: {
    tenantId: string;
    agentId: string;
    skillId: string;
    level: number;
  }): Promise<any> {
    const agentSkill = new AgentSkill({
      agentSkillId: uuidv4(),
      ...data
    });
    await agentSkill.save();
    return agentSkill;
  }

  /**
   * Create routing rule
   */
  async createRule(data: {
    tenantId: string;
    name: string;
    conditions: any[];
    targetSkillId?: string;
    targetTeam?: string;
    priority?: number;
  }): Promise<any> {
    const rule = new RoutingRule({
      ruleId: `rule_${uuidv4()}`,
      ...data,
      active: true
    });
    await rule.save();
    return rule;
  }

  /**
   * Find best agent for conversation
   */
  async routeConversation(data: {
    tenantId: string;
    conversationId: string;
    channel: string;
    priority: string;
    requiredSkills: Array<{ skillId: string; minLevel: number }>;
    language?: string;
    customerTier?: string;
    tags?: string[];
  }): Promise<{
    agentId?: string;
    team?: string;
    score: number;
    method: string;
    alternatives: Array<{ agentId: string; score: number }>;
  }> {
    const { tenantId, requiredSkills, priority } = data;

    // 1. Check routing rules first
    const rules = await RoutingRule.find({ tenantId, active: true })
      .sort({ priority: -1 });

    for (const rule of rules) {
      const matches = this.evaluateConditions(rule.conditions, data);
      if (matches) {
        if (rule.targetTeam) {
          // Route to team
          return {
            agentId: undefined,
            team: rule.targetTeam,
            score: rule.priority / 100,
            method: 'rule_based',
            alternatives: []
          };
        }
        if (rule.targetSkillId) {
          // Find agent with this skill
          requiredSkills = [{ skillId: rule.targetSkillId, minLevel: 1 }];
        }
      }
    }

    // 2. Find agents with required skills
    if (requiredSkills.length > 0) {
      const agentScores = await this.findAgentsBySkills(tenantId, requiredSkills);

      if (agentScores.length > 0) {
        const best = agentScores[0];
        return {
          agentId: best.agentId,
          team: undefined,
          score: best.score,
          method: 'skill_match',
          alternatives: agentScores.slice(1, 4).map(a => ({ agentId: a.agentId, score: a.score }))
        };
      }
    }

    // 3. Fallback: round-robin (would need Redis for production)
    return {
      agentId: undefined,
      team: 'general',
      score: 0.5,
      method: 'round_robin',
      alternatives: []
    };
  }

  /**
   * Find agents by skill match
   */
  private async findAgentsBySkills(
    tenantId: string,
    requiredSkills: Array<{ skillId: string; minLevel: number }>
  ): Promise<Array<{ agentId: string; score: number }>> {
    const scores: Map<string, { total: number; count: number }> = new Map();

    for (const req of requiredSkills) {
      const agentSkills = await AgentSkill.find({
        tenantId,
        skillId: req.skillId,
        level: { $gte: req.minLevel }
      });

      for (const as of agentSkills) {
        const current = scores.get(as.agentId) || { total: 0, count: 0 };
        current.total += as.level;
        current.count += 1;
        scores.set(as.agentId, current);
      }
    }

    // Calculate average score
    const results: Array<{ agentId: string; score: number }> = [];
    for (const [agentId, data] of scores.entries()) {
      results.push({
        agentId,
        score: data.total / (data.count * 5) // Normalize to 0-1
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Evaluate routing conditions
   */
  private evaluateConditions(conditions: any[], data: any): boolean {
    for (const cond of conditions) {
      const value = this.getFieldValue(cond.field, data);
      let result: boolean;

      switch (cond.operator) {
        case 'equals':
          result = value === cond.value;
          break;
        case 'not_equals':
          result = value !== cond.value;
          break;
        case 'in':
          result = Array.isArray(cond.value) && cond.value.includes(value);
          break;
        case 'greater_than':
          result = value > cond.value;
          break;
        case 'less_than':
          result = value < cond.value;
          break;
        default:
          result = false;
      }

      if (!result) return false;
    }
    return true;
  }

  /**
   * Get field value from data
   */
  private getFieldValue(field: string, data: any): any {
    switch (field) {
      case 'priority': return data.priority;
      case 'channel': return data.channel;
      case 'language': return data.language;
      case 'customer_tier': return data.customerTier;
      case 'tags': return data.tags;
      default: return data[field];
    }
  }

  /**
   * Get skills for agent
   */
  async getAgentSkills(tenantId: string, agentId: string): Promise<any[]> {
    return AgentSkill.find({ tenantId, agentId });
  }

  /**
   * Get all skills for tenant
   */
  async getSkills(tenantId: string): Promise<any[]> {
    return Skill.find({ tenantId, enabled: true });
  }

  /**
   * Get routing rules
   */
  async getRules(tenantId: string): Promise<any[]> {
    return RoutingRule.find({ tenantId }).sort({ priority: -1 });
  }
}

export const routingService = new RoutingService();
