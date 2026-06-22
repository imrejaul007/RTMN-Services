/**
 * SUTAR Negotiation Engine - Zod Validators
 */

import { z } from 'zod';

const CurrencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED']);

const TermSchema = z.object({
  type: z.enum(['price', 'delivery', 'payment', 'warranty', 'quantity', 'quality', 'custom']),
  label: z.string().min(1).max(200),
  value: z.union([z.string(), z.number(), z.boolean()]),
  isFlexible: z.boolean(),
  priority: z.enum(['required', 'preferred', 'optional']),
});

const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(50),
  specifications: z.record(z.unknown()).optional(),
  category: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
});

const CreatePartySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.enum(['buyer', 'seller', 'agent', 'mediator']),
  organization: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateNegotiationSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['rfq', 'quote', 'counter', 'deal']),
  buyer: CreatePartySchema,
  seller: CreatePartySchema.optional(),
  product: ProductSchema,
  targetPrice: z.number().positive().optional(),
  currency: CurrencySchema.optional().default('INR'),
  terms: z.array(TermSchema).optional(),
  deadline: z.coerce.date().optional(),
  createdBy: z.string().min(1),
  tenantId: z.string().min(1),
});

export const NegotiationQuerySchema = z.object({
  tenantId: z.string().min(1),
  status: z.enum(['draft', 'rfq_sent', 'quote_received', 'negotiating', 'awaiting_response', 'accepted', 'rejected', 'expired', 'cancelled']).optional(),
  type: z.enum(['rfq', 'quote', 'counter', 'deal']).optional(),
  buyerId: z.string().optional(),
  sellerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const AddOfferSchema = z.object({
  partyId: z.string().min(1),
  amount: z.number().positive(),
  currency: CurrencySchema,
  terms: z.array(TermSchema).default([]),
  validUntil: z.coerce.date(),
  message: z.string().max(1000).optional(),
});

export const CounterOfferSchema = z.object({
  negotiationId: z.string().min(1),
  amount: z.number().positive(),
  currency: CurrencySchema,
  terms: z.array(TermSchema),
  message: z.string().min(1).max(1000),
  validUntil: z.coerce.date(),
});

export const GenerateCounterSchema = z.object({
  negotiationId: z.string().min(1),
  partyId: z.string().min(1),
  buyerMax: z.number().positive(),
  sellerMin: z.number().positive(),
  strategy: z.enum(['competitive', 'collaborative', 'accommodating', 'compromising', 'principled']).optional(),
  customConcession: z.number().min(0).max(1).optional(),
});

export const AnalyzeZOPASchema = z.object({
  buyerMax: z.coerce.number().positive(),
  sellerMin: z.coerce.number().positive(),
});

export const CancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const RejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const AXPStartSchema = z.object({
  partyIds: z.array(z.string()).min(1).max(10),
});

export const AXPResponseSchema = z.object({
  negotiationId: z.string().optional(),
  partyId: z.string().min(1),
  response: z.enum(['accept', 'counter', 'reject', 'expire']),
  offer: z.object({
    amount: z.number().positive().optional(),
    currency: CurrencySchema.optional(),
    terms: z.array(TermSchema).optional(),
    message: z.string().max(1000).optional(),
  }).optional(),
  message: z.string().max(1000).optional(),
});

export const IdParamSchema = z.object({
  id: z.string().min(1).max(100),
});
