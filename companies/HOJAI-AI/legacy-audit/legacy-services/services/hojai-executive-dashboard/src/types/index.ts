import { z } from 'zod';
export const KPIReportSchema = z.object({ id: z.string().uuid(), title: z.string(), type: z.enum(['daily', 'weekly', 'monthly', 'quarterly']), metrics: z.record(z.string(), z.number()), insights: z.array(z.string()).default([]), createdAt: z.date().default(() => new Date()) });
export type KPIReport = z.infer<typeof KPIReportSchema>;
export function validateReport(data: unknown): KPIReport { return KPIReportSchema.parse(data); }
