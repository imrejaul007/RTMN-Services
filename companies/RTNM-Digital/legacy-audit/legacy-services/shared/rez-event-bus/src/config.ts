import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4075'),
  NODE_ENV: z.string().default('development'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  EVENT_STREAM: z.string().default('rez:events'),
  DLQ_STREAM: z.string().default('rez:events:dlq'),
  MAX_RETRIES: z.string().default('3'),
  RETRY_DELAY: z.string().default('5000'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment configuration:', result.error.format());
  process.exit(1);
}

export const config = result.data;

export const CONFIG = {
  PORT: parseInt(config.PORT, 10),
  NODE_ENV: config.NODE_ENV,
  REDIS_URL: config.REDIS_URL,
  EVENT_STREAM: config.EVENT_STREAM,
  DLQ_STREAM: config.DLQ_STREAM,
  MAX_RETRIES: parseInt(config.MAX_RETRIES, 10),
  RETRY_DELAY: parseInt(config.RETRY_DELAY, 10),
} as const;
