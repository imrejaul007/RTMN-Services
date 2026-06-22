/**
 * Stress Test Runner
 *
 * Runs all stress tests in sequence and generates a report.
 */

import { testEventPlatformFailure } from './event-platform-failure.test';
import { testDuplicateEvents } from './duplicate-events.test';

const TESTS = [
  { name: 'Event Platform Failure', fn: testEventPlatformFailure },
  { name: 'Duplicate Events (Idempotency)', fn: testDuplicateEvents },
  // Add more tests here as they are created
];

async function runAllTests() {
  console.log('🧪 REZ FIRST LOOP - STRESS TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Running ${TESTS.length} stress tests...\n`);

  const results = {
    total: TESTS.length,
    passed: 0,
    failed: 0,
    tests: [] as Array<{
      name: string;
      passed: boolean;
      duration: number;
      error?: string;
    }>,
  };

  for (const test of TESTS) {
    console.log(`\n▶️  Running: ${test.name}`);
    console.log('-'.repeat(40));

    const start = Date.now();
    try {
      await test.fn();
      results.passed++;
      results.tests.push({
        name: test.name,
        passed: true,
        duration: Date.now() - start,
      });
      console.log(`✅ PASSED: ${test.name} (${Date.now() - start}ms)`);
    } catch (error: any) {
      results.failed++;
      results.tests.push({
        name: test.name,
        passed: false,
        duration: Date.now() - start,
        error: error.message,
      });
      console.log(`❌ FAILED: ${test.name} (${Date.now() - start}ms)`);
      console.log(`   Error: ${error.message}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 STRESS TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('\nTest Results:');
  results.tests.forEach(t => {
    const status = t.passed ? '✅' : '❌';
    console.log(`  ${status} ${t.name} (${t.duration}ms)`);
    if (t.error) {
      console.log(`     Error: ${t.error}`);
    }
  });

  console.log('='.repeat(60));

  // Exit with appropriate code
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { runAllTests };
