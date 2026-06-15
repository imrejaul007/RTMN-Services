import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().min(2, 'Company name required'),
  contactName: z.string().min(2, 'Contact name required'),
  phone: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const selectServiceSchema = z.object({
  serviceId: z.string().min(1),
  plan: z.enum(['pilot', 'growth', 'enterprise']).default('pilot')
});

export const checkoutSchema = z.object({
  serviceId: z.string().min(1),
  plan: z.enum(['pilot', 'growth', 'enterprise']).default('pilot')
});
