import { z } from 'zod';

// Credit Line Status Enum
export const CreditLineStatusSchema = z.enum(['active', 'suspended', 'closed', 'pending']);
export type CreditLineStatus = z.infer<typeof CreditLineStatusSchema>;

// Credit Line Tier Enum
export const CreditLineTierSchema = z.enum(['standard', 'premium', 'enterprise']);
export type CreditLineTier = z.infer<typeof CreditLineTierSchema>;

// Credit Line Entity
export interface CreditLine {
  id: string;
  merchantId: string;
  creditLimit: number;
  utilized: number;
  tenorDays: number;
  interestRate: number;
  status: CreditLineStatus;
  tier: CreditLineTier;
  createdAt: Date;
  updatedAt: Date;
}

// Credit Line Zod Schema
export const CreditLineSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  creditLimit: z.number().min(0),
  utilized: z.number().min(0),
  tenorDays: z.number().int().positive(),
  interestRate: z.number().min(0),
  status: CreditLineStatusSchema,
  tier: CreditLineTierSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Credit Line Input
export interface CreateCreditLineInput {
  merchantId: string;
  creditLimit?: number;
  tenorDays?: number;
  interestRate?: number;
  tier?: CreditLineTier;
}

// Create Credit Line Zod Schema
export const CreateCreditLineSchema = z.object({
  merchantId: z.string().uuid(),
  creditLimit: z.number().min(0).optional(),
  tenorDays: z.number().int().positive().optional(),
  interestRate: z.number().min(0).optional(),
  tier: CreditLineTierSchema.optional(),
});

// Update Credit Line Input
export interface UpdateCreditLineInput {
  creditLimit?: number;
  utilized?: number;
  status?: CreditLineStatus;
  tier?: CreditLineTier;
}

// Update Credit Line Zod Schema
export const UpdateCreditLineSchema = z.object({
  creditLimit: z.number().min(0).optional(),
  utilized: z.number().min(0).optional(),
  status: CreditLineStatusSchema.optional(),
  tier: CreditLineTierSchema.optional(),
});
