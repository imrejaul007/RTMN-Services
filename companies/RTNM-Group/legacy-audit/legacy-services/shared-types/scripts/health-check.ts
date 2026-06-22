/**
 * Health Check Script
 * Monitors all ReZ platform services and QR system dependencies
 *
 * Run: npx tsx scripts/health-check.ts
 * Schedule: Every 5 minutes via cron or health check service
 */

import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Configuration
// ============================================================================

interface ServiceConfig {
  name: string;
  url: string;
  timeout: number;
  critical: boolean;
  expectedStatus?: number;
}

const SERVICES: ServiceConfig[] = [
  // Core ReZ Services
  {
    name: 'ReZ Auth Service',
    url: process.env.REZ_AUTH_URL || 'http://localhost:3001/api/health',
    timeout: 5000,
    critical: true,
  },
  {
    name: 'ReZ Wallet Service',
    url: process.env.REZ_WALLET_URL || 'http://localhost:3002/api/health',
    timeout: 5000,
    critical: true,
  },
  {
    name: 'ReZ Payment Service',
    url: process.env.REZ_PAYMENT_URL || 'http://localhost:3003/api/health',
    timeout: 5000,
    critical: true,
  },
  {
    name: 'ReZ Merchant Service',
    url: process.env.REZ_MERCHANT_URL || 'http://localhost:3004/api/health',
    timeout: 5000,
    critical: true,
  },
  {
    name: 'ReZ Intent Graph',
    url: process.env.INTENT_GRAPH_URL || 'http://localhost:3005/api/health',
    timeout: 5000,
    critical: true,
  },
  {
    name: 'ReZ Knowledge Base',
    url: process.env.KNOWLEDGE_BASE_URL || 'http://localhost:3006/api/health',
    timeout: 5000,
    critical: false,
  },
  {
    name: 'ReZ Chat Service',
    url: process.env.CHAT_SERVICE_URL || 'http://localhost:3007/api/health',
    timeout: 5000,
    critical: false,
  },
  // External Services
  {
    name: 'Hotel OTA API',
    url: process.env.HOTEL_API_URL || 'http://localhost:3008/api/health',
    timeout: 10000,
    critical: false,
  },
  {
    name: 'StayOwn Service',
    url: process.env.STAYOWN_URL || 'http://localhost:3009/api/health',
    timeout: 5000,
    critical: true,
  },
  {
    name: 'AdBazaar API',
    url: process.env.ADBazaar_URL || 'http://localhost:3010/api/health',
    timeout: 5000,
    critical: false,
  },
  // Supabase
  {
    name: 'Supabase Database',
    url: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    timeout: 10000,
    critical: true,
  },
];

// ============================================================================
// Types
// ============================================================================

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

interface HealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  criticalFailures: string[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  generatedAt: string;
}

// ============================================================================
// Health Check Functions
// ============================================================================

async function checkService(service: ServiceConfig): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const response = await axios.get(service.url, {
      timeout: service.timeout,
      validateStatus: () => true, // Accept any status
    });

    const responseTime = Date.now() - startTime;
    const statusCode = response.status;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (statusCode >= 500) {
      status = 'unhealthy';
    } else if (statusCode >= 400) {
      status = 'degraded';
    } else if (responseTime > service.timeout * 0.8) {
      status = 'degraded';
    }

    return {
      service: service.name,
      status,
      responseTime,
      statusCode,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      service: service.name,
      status: 'unhealthy',
      responseTime,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }
}

async function runHealthChecks(): Promise<HealthReport> {
  const results = await Promise.all(SERVICES.map(checkService));

  const criticalFailures = results
    .filter(r => r.status === 'unhealthy' && SERVICES.find(s => s.name === r.service)?.critical)
    .map(r => r.service);

  const summary = {
    total: results.length,
    healthy: results.filter(r => r.status === 'healthy').length,
    degraded: results.filter(r => r.status === 'degraded').length,
    unhealthy: results.filter(r => r.status === 'unhealthy').length,
  };

  let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (criticalFailures.length > 0) {
    overall = 'unhealthy';
  } else if (summary.unhealthy > 0) {
    overall = 'degraded';
  } else if (summary.degraded > Math.floor(summary.total / 2)) {
    overall = 'degraded';
  }

  return {
    overall,
    services: results,
    criticalFailures,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Output Functions
// ============================================================================

function printReport(report: HealthReport): void {
  const statusColors: Record<string, string> = {
    healthy: '\x1b[32m',   // Green
    degraded: '\x1b[33m',   // Yellow
    unhealthy: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';

  console.log('='.repeat(80));
  console.log('REZ PLATFORM HEALTH CHECK');
  console.log('='.repeat(80));
  console.log();
  logger.info(Overall Status: ${statusColors[report.overall]}${report.overall.toUpperCase()}${reset}`);
  logger.info(Generated: ${report.generatedAt}`);
  console.log();

  console.log('Service Status:');
  console.log('-'.repeat(80));

  for (const result of report.services) {
    const color = statusColors[result.status];
    const statusLabel = result.status.toUpperCase().padEnd(10);
    const timeLabel = `${result.responseTime}ms`.padEnd(8);

    console.log(
      `  ${color}${statusLabel}${reset} ${result.service.padEnd(30)} ${timeLabel}`
    );

    if (result.statusCode) {
      logger.info(           Status: ${result.statusCode}`);
    }

    if (result.error) {
      logger.info(           Error: ${result.error}`);
    }
  }

  console.log();
  console.log('-'.repeat(80));
  console.log('Summary:');
  logger.info(  Total Services: ${report.summary.total}`);
  logger.info(  ${statusColors.healthy}Healthy${reset}: ${report.summary.healthy}`);
  logger.info(  ${statusColors.degraded}Degraded${reset}: ${report.summary.degraded}`);
  logger.info(  ${statusColors.unhealthy}Unhealthy${reset}: ${report.summary.unhealthy}`);
  console.log();

  if (report.criticalFailures.length > 0) {
    console.log('CRITICAL FAILURES:');
    for (const failure of report.criticalFailures) {
      logger.info(  - ${failure}`);
    }
    console.log();
  }

  console.log('='.repeat(80));
}

function generateSlackPayload(report: HealthReport): object {
  const statusEmoji: Record<string, string> = {
    healthy: ':green_circle:',
    degraded: ':yellow_circle:',
    unhealthy: ':red_circle:',
  };

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji[report.overall]} ReZ Platform Health`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Overall Status:*\n${report.overall.toUpperCase()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Total Services:*\n${report.summary.total}`,
          },
          {
            type: 'mrkdwn',
            text: `*Healthy:*\n${report.summary.healthy}`,
          },
          {
            type: 'mrkdwn',
            text: `*Degraded:*\n${report.summary.degraded}`,
          },
          {
            type: 'mrkdwn',
            text: `*Unhealthy:*\n${report.summary.unhealthy}`,
          },
        ],
      },
      ...(report.criticalFailures.length > 0
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Critical Failures:*\n${report.criticalFailures.map(f => `• ${f}`).join('\n')}`,
              },
            },
          ]
        : []),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Health check generated at ${report.generatedAt}`,
          },
        ],
      },
    ],
  };
}

async function sendAlerts(report: HealthReport): Promise<void> {
  // Send to Slack if webhook is configured
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;

  if (slackWebhook && report.overall !== 'healthy') {
    try {
      await axios.post(slackWebhook, generateSlackPayload(report));
      console.log('Slack alert sent successfully');
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // Send to PagerDuty if critical failures exist
  const pagerdutyKey = process.env.PAGERDUTY_ROUTING_KEY;

  if (pagerdutyKey && report.criticalFailures.length > 0) {
    try {
      await axios.post('https://events.pagerduty.com/v2/enqueue', {
        routing_key: pagerdutyKey,
        event_action: 'trigger',
        payload: {
          summary: `ReZ Platform: ${report.criticalFailures.join(', ')}`,
          severity: 'critical',
          source: 'health-check-script',
          timestamp: report.generatedAt,
        },
      });
      console.log('PagerDuty alert sent successfully');
    } catch (error) {
      console.error('Failed to send PagerDuty alert:', error);
    }
  }
}

// ============================================================================
// Main Function
// ============================================================================

async function main(): Promise<void> {
  console.log('Starting health checks...\n');

  const report = await runHealthChecks();

  printReport(report);

  await sendAlerts(report);

  // Exit with appropriate code
  const exitCode = report.overall === 'unhealthy' ? 2 : report.overall === 'degraded' ? 1 : 0;
  process.exit(exitCode);
}

main().catch(error => {
  console.error('Health check failed:', error);
  process.exit(2);
});
