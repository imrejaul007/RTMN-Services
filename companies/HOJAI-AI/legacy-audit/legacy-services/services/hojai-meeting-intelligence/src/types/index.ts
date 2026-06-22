import { z } from 'zod';
export const MeetingSchema = z.object({ id: z.string().uuid(), title: z.string().min(1), attendees: z.array(z.string()), startTime: z.date(), endTime: z.date(), summary: z.string().optional(), actionItems: z.array(z.object({ id: z.string(), task: z.string(), assignee: z.string().optional(), completed: z.boolean().default(false) })), decisions: z.array(z.object({ id: z.string(), decision: z.string(), madeBy: z.string() })), notes: z.string().optional(), createdAt: z.date().default(() => new Date()) });
export type Meeting = z.infer<typeof MeetingSchema>;
export function validateMeeting(data: unknown): Meeting { return MeetingSchema.parse(data); }
