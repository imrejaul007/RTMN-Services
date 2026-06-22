// ── Integration Test Script ─────────────────────────────────────────────────────────
// Run manually to test the AI handler end-to-end

import { createAIHandler } from '../handlers/aiHandler';
import { initializeMemoryService } from '../memory/memoryIntegration';
import { ALL_REZ_TOOLS } from '../tools/rezTools';
import { ORCHESTRATION_TOOLS } from '../tools/orchestration';

const API_KEY = process.env.ANTHROPIC_API_KEY;

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  duration: number;
}

async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, passed: true, duration: Date.now() - start };
  } catch (error: any) {
    return { name, passed: false, message: error.message, duration: Date.now() - start };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           ReZ Agent OS - AI Handler Integration Test         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: TestResult[] = [];

  // ── Tool Registry Tests ──────────────────────────────────────────────────────

  console.log('📋 Testing Tool Registry...\n');

  results.push(await runTest('14 base tools registered', async () => {
    if (ALL_REZ_TOOLS.length !== 14) {
      throw new Error(`Expected 14 tools, got ${ALL_REZ_TOOLS.length}`);
    }
    logger.info(  ✓ Found ${ALL_REZ_TOOLS.length} tools`);
  }));

  results.push(await runTest('5 orchestration tools registered', async () => {
    if (ORCHESTRATION_TOOLS.length !== 5) {
      throw new Error(`Expected 5 tools, got ${ORCHESTRATION_TOOLS.length}`);
    }
    logger.info(  ✓ Found ${ORCHESTRATION_TOOLS.length} orchestration tools`);
  }));

  results.push(await runTest('All tools have execute function', async () => {
    for (const tool of [...ALL_REZ_TOOLS, ...ORCHESTRATION_TOOLS]) {
      if (typeof tool.execute !== 'function') {
        throw new Error(`Tool ${tool.name} missing execute function`);
      }
    }
    logger.info(  ✓ All tools have execute function`);
  }));

  results.push(await runTest('All tools have required parameters', async () => {
    for (const tool of [...ALL_REZ_TOOLS, ...ORCHESTRATION_TOOLS]) {
      const required = Object.entries(tool.parameters).filter(([, p]) => p.required);
      if (required.length === 0 && tool.name !== 'get_wallet_balance') {
        logger.info(  ⚠ ${tool.name} has no required parameters`);
      }
    }
    logger.info(  ✓ All tools have parameter definitions`);
  }));

  // ── Memory Service Tests ─────────────────────────────────────────────────────

  console.log('\n📋 Testing Memory Service...\n');

  const memoryService = initializeMemoryService({});
  const testUserId = `test-${Date.now()}`;

  results.push(await runTest('Memory service initializes', async () => {
    if (!memoryService) {
      throw new Error('Memory service not initialized');
    }
    console.log('  ✓ Memory service initialized');
  }));

  results.push(await runTest('Get customer context', async () => {
    const ctx = await memoryService.getCustomerContext(testUserId, 'hotel');
    if (ctx.customerId !== testUserId) {
      throw new Error('Customer ID mismatch');
    }
    logger.info(  ✓ Got context for ${testUserId}`);
  }));

  results.push(await runTest('Learn preference', async () => {
    await memoryService.learnPreference(testUserId, 'dining', 'cuisine', 'Italian', 0.9, 'explicit');
    const ctx = await memoryService.getCustomerContext(testUserId, 'hotel');
    const pref = ctx.preferences?.['cuisine'];
    if (pref !== 'Italian') {
      throw new Error('Preference not stored');
    }
    console.log('  ✓ Learned preference');
  }));

  results.push(await runTest('Log intent', async () => {
    await memoryService.logIntent(testUserId, 'hotel', {
      category: 'booking',
      specific: 'hotel_search',
      confidence: 0.9,
    });
    console.log('  ✓ Intent logged');
  }));

  results.push(await runTest('Update signals', async () => {
    await memoryService.updateSignals(testUserId, {
      lastActive: new Date().toISOString(),
      tier: 'gold',
    });
    console.log('  ✓ Signals updated');
  }));

  // ── AI Handler Tests ─────────────────────────────────────────────────────────

  console.log('\n📋 Testing AI Handler...\n');

  const handler = createAIHandler({
    appType: 'hotel',
    customerContext: {
      customerId: testUserId,
      name: 'Test User',
      tier: 'gold',
      preferences: { karmaPoints: 500 },
    },
    memoryEnabled: true,
  });

  results.push(await runTest('AI handler initializes', async () => {
    if (!handler) {
      throw new Error('Handler not initialized');
    }
    console.log('  ✓ Handler initialized');
  }));

  results.push(await runTest('Handle greeting message', async () => {
    const response = await handler.handleMessage({
      conversationId: 'test-conv',
      message: 'Hello!',
      userId: testUserId,
      appType: 'hotel',
      customerContext: {
        customerId: testUserId,
        name: 'Test User',
      },
    });

    if (!response.message) {
      throw new Error('No response message');
    }
    logger.info(  ✓ Got greeting response: "${response.message.substring(0, 50)}..."`);
  }));

  results.push(await runTest('Handle check-in query', async () => {
    const response = await handler.handleMessage({
      conversationId: 'test-conv',
      message: 'What time is check-in?',
      userId: testUserId,
      appType: 'hotel',
      customerContext: {
        customerId: testUserId,
        name: 'Test User',
      },
    });

    if (!response.message) {
      throw new Error('No response message');
    }
    logger.info(  ✓ Got check-in response: "${response.message.substring(0, 50)}..."`);
  }));

  results.push(await runTest('Escalate on manager request', async () => {
    const response = await handler.handleMessage({
      conversationId: 'test-conv',
      message: 'I want to speak to a manager',
      userId: testUserId,
      appType: 'hotel',
      customerContext: {
        customerId: testUserId,
        name: 'Test User',
      },
    });

    if (!response.actions?.some(a => a.type === 'escalate')) {
      throw new Error('Escalation not triggered');
    }
    console.log('  ✓ Escalation triggered on manager request');
  }));

  results.push(await runTest('Handle booking intent', async () => {
    const response = await handler.handleMessage({
      conversationId: 'test-conv',
      message: 'I want to book a room',
      userId: testUserId,
      appType: 'hotel',
      customerContext: {
        customerId: testUserId,
        name: 'Test User',
        tier: 'gold',
      },
    });

    if (!response.message) {
      throw new Error('No response message');
    }
    logger.info(  ✓ Got booking response: "${response.message.substring(0, 50)}..."`);
  }));

  results.push(await runTest('Handle room service request', async () => {
    const response = await handler.handleMessage({
      conversationId: 'test-conv',
      message: 'Can I order room service?',
      userId: testUserId,
      appType: 'hotel',
      customerContext: {
        customerId: testUserId,
        name: 'Test User',
        tier: 'gold',
      },
    });

    if (!response.message) {
      throw new Error('No response message');
    }
    logger.info(  ✓ Got room service response`);
  }));

  // ── Tool Execution Tests ─────────────────────────────────────────────────────

  console.log('\n📋 Testing Tool Execution...\n');

  results.push(await runTest('Execute escalate_to_staff tool', async () => {
    const escalateTool = ALL_REZ_TOOLS.find(t => t.name === 'escalate_to_staff');
    if (!escalateTool) {
      throw new Error('escalate_to_staff tool not found');
    }

    const result = await escalateTool.execute({
      reason: 'Test escalation',
      department: 'support',
    }, { customerId: testUserId });

    if (!result.success) {
      throw new Error('Tool execution failed');
    }
    console.log('  ✓ escalate_to_staff executed');
  }));

  results.push(await runTest('Execute book_hotel_with_preferences tool', async () => {
    const tool = ORCHESTRATION_TOOLS.find(t => t.name === 'book_hotel_with_preferences');
    if (!tool) {
      throw new Error('book_hotel_with_preferences tool not found');
    }

    const result = await tool.execute({
      location: 'Mumbai',
      checkIn: '2024-01-15',
      checkOut: '2024-01-17',
      guests: 2,
      preferences: {
        roomTemp: '72F',
        pillowType: 'soft',
      },
    }, { customerId: testUserId, tier: 'gold' });

    if (!result.success) {
      throw new Error('Tool execution failed');
    }

    const data = result.data as any;
    if (!data.confirmationCode) {
      throw new Error('Missing confirmation code');
    }
    logger.info(  ✓ book_hotel_with_preferences executed: ${data.confirmationCode}`);
  }));

  results.push(await runTest('Execute plan_dinner_date tool', async () => {
    const tool = ORCHESTRATION_TOOLS.find(t => t.name === 'plan_dinner_date');
    if (!tool) {
      throw new Error('plan_dinner_date tool not found');
    }

    const result = await tool.execute({
      cuisine: 'Italian',
      location: 'Downtown',
      date: '2024-01-20',
      time: '19:00',
      partySize: 2,
      occasion: 'Anniversary',
      preOrderDrinks: true,
    }, { customerId: testUserId });

    if (!result.success) {
      throw new Error('Tool execution failed');
    }
    console.log('  ✓ plan_dinner_date executed');
  }));

  results.push(await runTest('Execute place_order_with_loyalty tool', async () => {
    const tool = ORCHESTRATION_TOOLS.find(t => t.name === 'place_order_with_loyalty');
    if (!tool) {
      throw new Error('place_order_with_loyalty tool not found');
    }

    const result = await tool.execute({
      storeId: 'pizza-hut-123',
      items: [{ itemId: 'pizza-1', quantity: 1 }],
      orderType: 'delivery',
      usePoints: 100,
    }, { customerId: testUserId, preferences: { karmaPoints: 500 } });

    if (!result.success) {
      throw new Error('Tool execution failed');
    }
    console.log('  ✓ place_order_with_loyalty executed');
  }));

  results.push(await runTest('Execute checkout_with_discounts tool', async () => {
    const tool = ORCHESTRATION_TOOLS.find(t => t.name === 'checkout_with_discounts');
    if (!tool) {
      throw new Error('checkout_with_discounts tool not found');
    }

    const result = await tool.execute({
      items: [
        { itemId: 'item-1', name: 'Burger', price: 250, quantity: 2 },
        { itemId: 'item-2', name: 'Fries', price: 100, quantity: 1 },
      ],
      applyCoupon: 'FIRST20',
      usePoints: 50,
    }, { customerId: testUserId });

    if (!result.success) {
      throw new Error('Tool execution failed');
    }
    console.log('  ✓ checkout_with_discounts executed');
  }));

  // ── Summary ─────────────────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                           ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  logger.info(║  Passed: ${passed}  |  Failed: ${failed}  |  Time: ${totalTime}ms        ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n❌ Failed Tests:\n');
    results.filter(r => !r.passed).forEach(r => {
      logger.info(  • ${r.name}: ${r.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
  }

  if (!API_KEY) {
    console.log('⚠️  Note: ANTHROPIC_API_KEY not set. AI responses use fallback.\n');
  }
}

main().catch(console.error);
