import { z } from 'zod';

// User Role Enum
export const UserRoleSchema = z.enum(['merchant', 'supplier', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// User Entity
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  linkedEntityId?: string; // merchantId or supplierId
  createdAt: Date;
}

// User Zod Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
  role: UserRoleSchema,
  linkedEntityId: z.string().optional(),
  createdAt: z.date(),
});

// Create User Input
export interface CreateUserInput {
  email: string;
  name?: string;
  role: UserRole;
  linkedEntityId?: string;
}

// Create User Zod Schema
export const CreateUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
  role: UserRoleSchema,
  linkedEntityId: z.string().optional(),
});

// Update User Input
export interface UpdateUserInput {
  name?: string;
  linkedEntityId?: string;
}

// Update User Zod Schema
export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  linkedEntityId: z.string().optional(),
});

