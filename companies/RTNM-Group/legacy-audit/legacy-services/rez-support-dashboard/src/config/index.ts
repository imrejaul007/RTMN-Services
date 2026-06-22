import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4052'),
  MONGODB_URI: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  INTERNAL_SERVICE_TOKEN: z.string(),
  SUPPORT_COPILOT_URL: z.string().default('http://localhost:3000'),
  SUPPORT_AGENT_URL: z.string().default('http://localhost:3001'),
  UNIFIED_CHAT_URL: z.string().default('http://localhost:3002'),
  WHATSAPP_COMMERCE_URL: z.string().default('http://localhost:4031'),
  INSTAGRAM_BRIDGE_URL: z.string().default('http://localhost:4090'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }));
  },
};
