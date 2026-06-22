import mongoose, { Schema, Document } from 'mongoose';

export interface ISkill extends Document {
  _id: mongoose.Types.ObjectId;
  skillId: string;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  level: number;
  enabled: boolean;
}

const SkillSchema = new Schema<ISkill>({
  skillId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  category: String,
  level: { type: Number, default: 1 },
  enabled: { type: Boolean, default: true }
}, { timestamps: true, collection: 'skills_routing_skills' });

export const Skill = mongoose.model<ISkill>('Skill', SkillSchema);

export interface IAgentSkill extends Document {
  _id: mongoose.Types.ObjectId;
  agentSkillId: string;
  tenantId: string;
  agentId: string;
  skillId: string;
  level: number;
  certifiedAt?: Date;
  expiresAt?: Date;
}

const AgentSkillSchema = new Schema<IAgentSkill>({
  agentSkillId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  agentId: { type: String, required: true, index: true },
  skillId: { type: String, required: true, index: true },
  level: { type: Number, required: true, min: 1, max: 5 },
  certifiedAt: Date,
  expiresAt: Date
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'skills_routing_agent_skills' });

AgentSkillSchema.index({ agentId: 1, skillId: 1 }, { unique: true });
export const AgentSkill = mongoose.model<IAgentSkill>('AgentSkill', AgentSkillSchema);

export interface IRoutingRule extends Document {
  _id: mongoose.Types.ObjectId;
  ruleId: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: Array<{ field: string; operator: string; value: any }>;
  targetSkillId?: string;
  targetTeam?: string;
  priority: number;
  active: boolean;
}

const RoutingRuleSchema = new Schema<IRoutingRule>({
  ruleId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  conditions: [Schema.Types.Mixed],
  targetSkillId: String,
  targetTeam: String,
  priority: { type: Number, default: 50 },
  active: { type: Boolean, default: true }
}, { timestamps: true, collection: 'skills_routing_rules' });

RoutingRuleSchema.index({ tenantId: 1, active: 1, priority: -1 });
export const RoutingRule = mongoose.model<IRoutingRule>('RoutingRule', RoutingRuleSchema);
