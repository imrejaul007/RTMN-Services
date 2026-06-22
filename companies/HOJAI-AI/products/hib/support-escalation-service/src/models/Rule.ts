/**
 * Rule Model - Mongoose schema for escalation rules
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum RuleConditionType {
  TICKET_PRIORITY = 'ticket_priority',
  TICKET_CATEGORY = 'ticket_category',
  TICKET_STATUS = 'ticket_status',
  SLA_BREACH = 'sla_breach',
  CUSTOMER_TIER = 'customer_tier',
  ASSIGNEE_WORKLOAD = 'assignee_workload',
  TIME_BASED = 'time_based',
  KEYWORD = 'keyword',
}

export enum RuleActionType {
  ESCALATE_LEVEL = 'escalate_level',
  ASSIGN_TO_TEAM = 'assign_to_team',
  ASSIGN_TO_USER = 'assign_to_user',
  ADD_TAG = 'add_tag',
  NOTIFY = 'notify',
  AUTO_RESOLVE = 'auto_resolve',
}

export interface IRuleCondition {
  type: RuleConditionType;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number | boolean;
}

export interface IRuleAction {
  type: RuleActionType;
  value: string;
}

export interface IRule extends Document {
  ruleId: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions: IRuleCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: IRuleAction[];
  escalationLevel: string;
  targetTeam?: string;
  targetUser?: string;
  cooldownMinutes: number;
  lastTriggeredAt?: Date;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ruleSchema = new Schema<IRule>(
  {
    ruleId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0, index: true },
    conditions: [
      {
        type: {
          type: String,
          enum: Object.values(RuleConditionType),
          required: true,
        },
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'],
          required: true,
        },
        value: { type: Schema.Types.Mixed, required: true },
      },
    ],
    conditionLogic: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND',
    },
    actions: [
      {
        type: {
          type: String,
          enum: Object.values(RuleActionType),
          required: true,
        },
        value: { type: String, required: true },
      },
    ],
    escalationLevel: { type: String, required: true },
    targetTeam: String,
    targetUser: String,
    cooldownMinutes: { type: Number, default: 60 },
    lastTriggeredAt: Date,
    triggerCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
ruleSchema.index({ isActive: 1, priority: -1 });

export const Rule = mongoose.model<IRule>('Rule', ruleSchema);
export default Rule;