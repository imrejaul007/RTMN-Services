import { z } from 'zod';
export const EntitySchema = z.object({ id: z.string().uuid(), type: z.enum(['company', 'person', 'product', 'document', 'policy', 'sop', 'decision', 'goal', 'project']), name: z.string(), properties: z.record(z.unknown()).default({}), createdAt: z.date().default(() => new Date()) });
export type Entity = z.infer<typeof EntitySchema>;
export const RelationshipSchema = z.object({ id: z.string().uuid(), sourceId: z.string().uuid(), targetId: z.string().uuid(), type: z.string(), properties: z.record(z.unknown()).default({}) });
export type Relationship = z.infer<typeof RelationshipSchema>;
export function validateEntity(data: unknown): Entity { return EntitySchema.parse(data); }
