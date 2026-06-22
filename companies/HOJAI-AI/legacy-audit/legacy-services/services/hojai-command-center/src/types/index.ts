import { z } from 'zod';
export const WidgetSchema = z.object({ id: z.string().uuid(), type: z.enum(['metric', 'chart', 'table', 'alert', 'news', 'goals']), title: z.string(), config: z.record(z.unknown()).default({}), position: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }), refreshInterval: z.number().default(60) });
export type Widget = z.infer<typeof WidgetSchema>;
export const DashboardSchema = z.object({ id: z.string().uuid(), name: z.string(), description: z.string().optional(), widgets: z.array(z.string()).default([]), ownerId: z.string().optional(), isDefault: z.boolean().default(false) });
export type Dashboard = z.infer<typeof DashboardSchema>;
export function validateWidget(data: unknown): Widget { return WidgetSchema.parse(data); }
export function validateDashboard(data: unknown): Dashboard { return DashboardSchema.parse(data); }
