import { z } from 'zod';

export const SLASchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  channel: z.enum(['whatsapp', 'instagram', 'email', 'sms', 'voice', 'all']).default('all'),
  priority: z.enum(['low', 'normal', 'high', 'urgent', 'all']).default('all'),
  responseTimeSeconds: z.number().min(0),
  firstResponseTimeSeconds: z.number().min(0).optional(),
  resolutionTimeSeconds: z.number().min(0).optional(),
  enabled: z.boolean().default(true),
  createdAt: z.date()
});
export type SLA = z.infer<typeof SLASchema>;

export const SLAViolationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  slaId: z.string(),
  conversationId: z.string(),
  type: z.enum(['response_time', 'first_response', 'resolution_time']),
  thresholdSeconds: z.number(),
  actualSeconds: z.number(),
  occurredAt: z.date(),
  acknowledged: z.boolean().default(false),
  acknowledgedBy: z.string().optional(),
  acknowledgedAt: z.date().optional()
});
export type SLAViolation = z.infer<typeof SLAViolationSchema>;

export const SLAAlertConfigSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  slaId: z.string(),
  channels: z.array(z.enum(['email', 'sms', 'push', 'webhook'])),
  recipients: z.array(z.string()),
  webhookUrl: z.string().url().optional(),
  thresholdPercent: z.number().min(50).max(100).default(80)
});
export type SLAAlertConfig = z.infer<typeof SLAAlertConfigSchema>;

export const SLAStatsSchema = z.object({
  tenantId: z.string(),
  slaId: z.string(),
  period: z.enum(['today', 'week', 'month', 'quarter']),
  total: z.number(),
  met: z.number(),
  violated: z.number(),
  complianceRate: z.number(),
  avgResponseTime: z.number(),
  avgFirstResponseTime: z.number().optional(),
  avgResolutionTime: z.number().optional()
});
export type SLAStats = z.infer<typeof SLAStatsSchema>;
