import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Used for:
 * - Kubernetes liveness/readiness probes
 * - Vercel health checks
 * - Load balancer monitoring
 * - Uptime monitors (UptimeRobot, Pingdom, etc.)
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    supabase: {
      status: 'pass' | 'fail';
      latency?: number;
      error?: string;
    };
    environment: {
      status: 'pass' | 'fail';
      error?: string;
    };
  };
}

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      supabase: { status: 'fail' },
      environment: { status: 'pass' },
    },
  };

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    health.checks.environment = {
      status: 'fail',
      error: `Missing environment variables: ${missingEnvVars.join(', ')}`,
    };
    health.status = 'degraded';
  }

  // Check Supabase connection
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    const checkStart = Date.now();
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error } = await supabase.from('merchants').select('id').limit(1);

      if (error) {
        health.checks.supabase = {
          status: 'fail',
          latency: Date.now() - checkStart,
          error: error.message,
        };
        health.status = 'degraded';
      } else {
        health.checks.supabase = {
          status: 'pass',
          latency: Date.now() - checkStart,
        };
      }
    } catch (err) {
      health.checks.supabase = {
        status: 'fail',
        latency: Date.now() - checkStart,
        error: err instanceof Error ? err.message : 'Connection failed',
      };
      health.status = 'unhealthy';
    }
  } else {
    health.checks.supabase = {
      status: 'fail',
      error: 'Supabase credentials not configured',
    };
    health.status = 'unhealthy';
  }

  // Determine HTTP status code based on health
  const httpStatus =
    health.status === 'healthy'
      ? 200
      : health.status === 'degraded'
        ? 200
        : 503;

  return NextResponse.json(health, { status: httpStatus });
}

// Also expose HEAD endpoint for simpler health checks
export async function HEAD(): Promise<NextResponse> {
  const isConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  return new NextResponse(null, {
    status: isConfigured ? 200 : 503,
  });
}
