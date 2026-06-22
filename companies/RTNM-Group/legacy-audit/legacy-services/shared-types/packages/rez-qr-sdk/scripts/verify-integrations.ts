/**
 * Integration Verification Script
 *
 * Verifies all REZ services are connected and responding.
 * Run with: npx ts-node scripts/verify-integrations.ts
 */

import axios, { AxiosInstance } from 'axios';
import { environments } from '../src/config/environments';

interface ServiceCheck {
  name: string;
  url: string;
  method: 'get' | 'post';
  data?: unknown;
}

interface CheckResult {
  name: string;
  status: 'success' | 'failed' | 'timeout';
  responseTime?: number;
  error?: string;
  details?: unknown;
}

// Service endpoints to check
const servicesToCheck: Record<string, ServiceCheck[]> = {
  'Rez Auth': [
    { name: 'Auth Health', url: '/health', method: 'get' },
    { name: 'Auth OTP Request', url: '/auth/otp/request', method: 'post', data: { phone: '+1234567890' } },
  ],
  'Rez Wallet': [
    { name: 'Wallet Health', url: '/health', method: 'get' },
    { name: 'Wallet Balance', url: '/wallet/balance', method: 'get' },
  ],
  'Rez Payment': [
    { name: 'Payment Health', url: '/health', method: 'get' },
    { name: 'Payment Create', url: '/payments/create', method: 'post', data: { amount: 100 } },
  ],
  'Rez Merchant': [
    { name: 'Merchant Health', url: '/health', method: 'get' },
    { name: 'Merchant Profile', url: '/merchants/profile', method: 'get' },
  ],
  'Rez Intent': [
    { name: 'Intent Health', url: '/health', method: 'get' },
    { name: 'Intent Detect', url: '/detect', method: 'post', data: { message: 'test' } },
  ],
  'Rez Chat': [
    { name: 'Chat Health', url: '/health', method: 'get' },
    { name: 'Chat Message', url: '/chat', method: 'post', data: { message: 'test' } },
  ],
  'Rez Knowledge Base': [
    { name: 'KB Health', url: '/health', method: 'get' },
    { name: 'KB Search', url: '/search', method: 'post', data: { query: 'test' } },
  ],
  'Rez API': [
    { name: 'API Health', url: '/health', method: 'get' },
    { name: 'API Menu', url: '/stores/test/menu', method: 'get' },
  ],
};

async function checkService(
  serviceName: string,
  checks: ServiceCheck[],
  baseUrl: string
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const client: AxiosInstance = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

  for (const check of checks) {
    const startTime = Date.now();
    try {
      const response = await (check.method === 'get'
        ? client.get(check.url)
        : client.post(check.url, check.data));

      const responseTime = Date.now() - startTime;

      results.push({
        name: `${serviceName}: ${check.name}`,
        status: 'success',
        responseTime,
        details: {
          statusCode: response.status,
          data: typeof response.data === 'object' ? 'OK' : response.data,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('ECONNABORTED');

      results.push({
        name: `${serviceName}: ${check.name}`,
        status: isTimeout ? 'timeout' : 'failed',
        responseTime: Date.now() - startTime,
        error: errorMessage,
      });
    }
  }

  return results;
}

async function verifyEnvironments() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           REZ SERVICES INTEGRATION VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const envs: Array<'development' | 'staging' | 'production'> = ['development', 'staging', 'production'];

  for (const env of envs) {
    logger.info(\n── Environment: ${env.toUpperCase()} ──\n`);

    const environment = environments[env];
    if (!environment) {
      logger.info(❌ Environment "${env}" not configured`);
      continue;
    }

    const allResults: CheckResult[] = [];
    let passed = 0;
    let failed = 0;

    // Check Auth
    const authResults = await checkService(
      'Auth',
      servicesToCheck['Rez Auth'],
      environment.services.authUrl
    );
    allResults.push(...authResults);

    // Check Wallet
    const walletResults = await checkService(
      'Wallet',
      servicesToCheck['Rez Wallet'],
      environment.services.walletUrl
    );
    allResults.push(...walletResults);

    // Check Payment
    const paymentResults = await checkService(
      'Payment',
      servicesToCheck['Rez Payment'],
      environment.services.paymentUrl
    );
    allResults.push(...paymentResults);

    // Check Merchant
    const merchantResults = await checkService(
      'Merchant',
      servicesToCheck['Rez Merchant'],
      environment.services.merchantUrl
    );
    allResults.push(...merchantResults);

    // Check Intent
    const intentResults = await checkService(
      'Intent',
      servicesToCheck['Rez Intent'],
      environment.services.intentUrl
    );
    allResults.push(...intentResults);

    // Check Chat
    const chatResults = await checkService(
      'Chat',
      servicesToCheck['Rez Chat'],
      environment.services.chatUrl
    );
    allResults.push(...chatResults);

    // Check Knowledge Base
    const kbResults = await checkService(
      'Knowledge Base',
      servicesToCheck['Rez Knowledge Base'],
      environment.services.knowledgeBaseUrl
    );
    allResults.push(...kbResults);

    // Check API
    const apiResults = await checkService(
      'API',
      servicesToCheck['Rez API'],
      environment.services.apiUrl
    );
    allResults.push(...apiResults);

    // Print results
    for (const result of allResults) {
      const icon = result.status === 'success' ? '✅' : result.status === 'timeout' ? '⏱️' : '❌';
      const time = result.responseTime ? `${result.responseTime}ms` : '';

      logger.info(${icon} ${result.name}`);
      if (result.status === 'success') {
        logger.info(   Response time: ${time}`);
        passed++;
      } else {
        logger.info(   Error: ${result.error}`);
        failed++;
      }
    }

    // Summary
    logger.info(\n   Summary: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      logger.info(   Status: ✅ All services healthy`);
    } else {
      logger.info(   Status: ⚠️ Some services need attention`);
    }
  }

  // Print environment URLs
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    SERVICE URLs');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const env of envs) {
    const envUrls = environments[env]?.services;
    if (!envUrls) continue;

    logger.info(${env.toUpperCase()}:`);
    logger.info(  API:         ${envUrls.apiUrl}`);
    logger.info(  Wallet:      ${envUrls.walletUrl}`);
    logger.info(  Payment:     ${envUrls.paymentUrl}`);
    logger.info(  Auth:        ${envUrls.authUrl}`);
    logger.info(  Merchant:    ${envUrls.merchantUrl}`);
    logger.info(  Intent:      ${envUrls.intentUrl}`);
    logger.info(  Chat:        ${envUrls.chatUrl}`);
    logger.info(  Knowledge:   ${envUrls.knowledgeBaseUrl}`);
    console.log('');
  }
}

// Run verification
verifyEnvironments()
  .then(() => {
    console.log('\nVerification complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nVerification failed:', error);
    process.exit(1);
  });
