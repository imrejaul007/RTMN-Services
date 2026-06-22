import { z } from 'zod';

// ============ SKILL ============
export const SkillSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  level: z.number().min(1).max(5).default(1),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type Skill = z.infer<typeof SkillSchema>;

// ============ AGENT SKILL ============
export const AgentSkillSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  agentId: z.string(),
  skillId: z.string(),
  level: z.number().min(1).max(5),
  certifiedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date()
});
export type AgentSkill = z.infer<typeof AgentSkillSchema>;

// ============ ROUTING RULE ============
export const RoutingRuleConditionSchema = z.object({
  field: z.enum(['priority', 'channel', 'language', 'customer_tier', 'intent', 'topic', 'tag']),
  operator: z.enum(['equals', 'not_equals', 'in', 'not_in', 'greater_than', 'less_than']),
  value: z.union([z.string(), z.number(), z.array(z.string())])
});
export type RoutingRuleCondition = z.infer<typeof RoutingRuleConditionSchema>;

export const RoutingRuleSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  conditions: z.array(RoutingRuleConditionSchema),
  targetSkillId: z.string().optional(),
  targetTeam: z.string().optional(),
  priority: z.number().min(0).max(100).default(50),
  active: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});
export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

// ============ ROUTING REQUEST ============
export const RoutingRequestSchema = z.object({
  conversationId: z.string(),
  tenantId: z.string(),
  channel: z.enum(['whatsapp', 'instagram', 'email', 'sms', 'voice', 'webchat']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  requiredSkills: z.array(z.object({
    skillId: z.string(),
    minLevel: z.number().min(1).max(5).default(1)
  })),
  language: z.string().optional(),
  customerTier: z.enum(['standard', 'premium', 'vip']).optional(),
  tags: z.array(z.string()).optional(),
  context: z.record(z.any()).optional()
});
export type RoutingRequest = z.infer<typeof RoutingRequestSchema>;

// ============ ROUTING RESULT ============
export const RoutingResultSchema = z.object({
  conversationId: z.string(),
  assignedAgentId: z.string().optional(),
  assignedTeam: z.string().optional(),
  skillScore: z.number(),
  matchScore: z.number(),
  alternativeAgents: z.array(z.object({
    agentId: z.string(),
    score: z.number()
  })).optional(),
  routedAt: z.date(),
  routingMethod: z.enum(['skill_match', 'rule_based', 'round_robin', 'least_busy', 'random'])
});
export type RoutingResult = z.infer<typeof RoutingResultSchema>;
