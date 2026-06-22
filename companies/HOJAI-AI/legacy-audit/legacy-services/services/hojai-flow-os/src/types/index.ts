import { z } from 'zod';
export const FlowStepSchema = z.object({ id: z.string(), skillId: z.string(), input: z.record(z.unknown()).optional(), condition: z.string().optional() });
export type FlowStep = z.infer<typeof FlowStepSchema>;
export const FlowSchema = z.object({ id: z.string().uuid(), name: z.string(), description: z.string().optional(), steps: z.array(FlowStepSchema), enabled: z.boolean().default(true), createdAt: z.date().default(() => new Date()) });
export type Flow = z.infer<typeof FlowSchema>;
export const FlowRunSchema = z.object({ id: z.string().uuid(), flowId: z.string(), status: z.enum(['pending', 'running', 'completed', 'failed']), results: z.array(z.unknown()), startedAt: z.date(), completedAt: z.date().optional() });
export type FlowRun = z.infer<typeof FlowRunSchema>;
export function validateFlow(data: unknown): Flow { return FlowSchema.parse(data); }
