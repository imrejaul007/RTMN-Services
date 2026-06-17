import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schema
export const SkillValidationSchema = z.object({
  tenantId: z.string().min(1),
  employeeId: z.string().min(1),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.enum(['basic', 'intermediate', 'advanced', 'native']),
    certified: z.boolean().default(false)
  })).default([]),
  products: z.array(z.object({
    productName: z.string(),
    proficiency: z.enum(['beginner', 'intermediate', 'expert']),
    yearsOfExperience: z.number().min(0).default(0),
    lastUsed: z.date().optional()
  })).default([]),
  channels: z.array(z.object({
    channel: z.string(),
    proficiency: z.enum(['basic', 'intermediate', 'advanced']),
    certifications: z.array(z.string()).default([])
  })).default([]),
  softSkills: z.array(z.object({
    skill: z.string(),
    level: z.enum(['developing', 'proficient', 'expert']).default('proficient')
  })).default([]),
  overallProficiency: z.number().min(0).max(100).optional()
});

// MongoDB schema
const SkillSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true },
  languages: [{
    language: { type: String, required: true },
    proficiency: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced', 'native'],
      default: 'intermediate'
    },
    certified: { type: Boolean, default: false }
  }],
  products: [{
    productName: { type: String, required: true },
    proficiency: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'intermediate'
    },
    yearsOfExperience: { type: Number, default: 0 },
    lastUsed: { type: Date }
  }],
  channels: [{
    channel: { type: String, required: true },
    proficiency: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced'],
      default: 'basic'
    },
    certifications: [{ type: String }]
  }],
  softSkills: [{
    skill: { type: String, required: true },
    level: {
      type: String,
      enum: ['developing', 'proficient', 'expert'],
      default: 'proficient'
    }
  }],
  overallProficiency: { type: Number, min: 0, max: 100 }
}, {
  timestamps: true
});

// Indexes
SkillSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
SkillSchema.index({ tenantId: 1, 'products.productName': 1 });
SkillSchema.index({ tenantId: 1, 'languages.language': 1 });

export interface ILanguage {
  language: string;
  proficiency: 'basic' | 'intermediate' | 'advanced' | 'native';
  certified: boolean;
}

export interface IProduct {
  productName: string;
  proficiency: 'beginner' | 'intermediate' | 'expert';
  yearsOfExperience: number;
  lastUsed?: Date;
}

export interface IChannel {
  channel: string;
  proficiency: 'basic' | 'intermediate' | 'advanced';
  certifications: string[];
}

export interface ISoftSkill {
  skill: string;
  level: 'developing' | 'proficient' | 'expert';
}

export interface ISkill extends Document {
  tenantId: string;
  employeeId: string;
  languages: ILanguage[];
  products: IProduct[];
  channels: IChannel[];
  softSkills: ISoftSkill[];
  overallProficiency?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const Skill = mongoose.model<ISkill>('Skill', SkillSchema);
