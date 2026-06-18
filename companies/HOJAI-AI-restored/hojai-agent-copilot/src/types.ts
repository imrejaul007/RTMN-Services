import { z } from 'zod';

// Draft Reply
export const DraftReplySchema = z.object({
  ticketId: z.string(),
  conversation: z.array(z.object({
    role: z.enum(['customer', 'agent', 'system']),
    message: z.string(),
    timestamp: z.string().optional()
  })),
  tone: z.enum(['professional', 'friendly', 'empathetic', 'formal']).optional(),
  maxLength: z.number().optional()
});

export type DraftReplyRequest = z.infer<typeof DraftReplySchema>;

export interface DraftReplyResponse {
  suggestions: Array<{
    text: string;
    confidence: number;
    tone: string;
  }>;
  keywords: string[];
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
  };
}

// Summarize
export const SummarizeSchema = z.object({
  conversation: z.array(z.object({
    role: z.enum(['customer', 'agent', 'system']),
    message: z.string(),
    timestamp: z.string().optional()
  })),
  style: z.enum(['brief', 'detailed', 'executive']).optional(),
  focus: z.array(z.string()).optional()
});

export type SummarizeRequest = z.infer<typeof SummarizeSchema>;

export interface SummarizeResponse {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: string;
  duration?: string;
}

// CSAT Prediction
export const PredictCSATSchema = z.object({
  conversation: z.array(z.object({
    role: z.enum(['customer', 'agent', 'system']),
    message: z.string(),
    timestamp: z.string().optional()
  })),
  metadata: z.object({
    responseTime: z.number().optional(),
    resolutionTime: z.number().optional(),
    agentRating: z.number().optional()
  }).optional()
});

export type PredictCSATRequest = z.infer<typeof PredictCSATSchema>;

export interface PredictCSATResponse {
  predictedScore: number;
  confidence: number;
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
  sentiment: {
    customer: number;
    agent: number;
    overall: number;
  };
}

// Macro Suggestions
export const SuggestMacrosSchema = z.object({
  conversation: z.array(z.object({
    role: z.enum(['customer', 'agent', 'system']),
    message: z.string(),
    timestamp: z.string().optional()
  })),
  category: z.string().optional()
});

export type SuggestMacrosRequest = z.infer<typeof SuggestMacrosSchema>;

export interface Macro {
  id: string;
  name: string;
  content: string;
  category: string;
  relevance: number;
}

export interface SuggestMacrosResponse {
  macros: Macro[];
  categories: string[];
}

// Health
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
}