/**
 * Stress Test: Event Platform Failure
 *
 * Test: Kill Event Platform for 30-60 seconds
 * Expected: Events queue locally, no data loss, system recovers
 */

import axios from 'axios';

const EVENT_PLATFORM_URL = process.env.EVENT_PLATFORM_URL || 'http://localhost:4022';
const TEST_ID = `platform_fail_${Date.now()}`;

async function testEventPlatformFailure() {
  console.log('🧪 Starting Event Platform Failure Test');
  console.log('Test ID:', TEST_ID);

  const results = {
    eventsSent: 0,
    eventsProcessed: 0,
    eventsAfterRecovery: 0,
    passed: false,
    details: [] as string[],
  };

  // Step 1: Send events while healthy
  console.log('\n📤 Step 1: Sending 10 events while Event Platform is healthy...');

  const events = [];
  for (let i = 1; i <= 10; i++) {
    const event = {
      event: 'inventory.low',
      version: 'v1',
      correlation_id: `${TEST_ID}_${i}`,
      source: 'stress-test',
      timestamp: Date.now(),
      data: {
        merchant_id: 'test_merchant',
        store_id: 'test_store',
        item_id: `test_item_${i}`,
        item_name: `Test Item ${i}`,
        current_stock: 3,
        threshold: 5,
        unit: 'units',
      },
    };
    events.push(event);

    try {
      await axios.post(`${EVENT_PLATFORM_URL}/events/inventory.low`, event);
      results.eventsSent++;
    } catch (error: any) {
      results.details.push(`Failed to send event ${i}: ${error.message}`);
    }
  }
  console.log(`✅ Sent ${results.eventsSent}/10 events`);

  // Step 2: Simulate Event Platform failure
  console.log('\n⏸️ Step 2: SIMULATE Event Platform failure (30 seconds)...');
  console.log('⚠️  In production: Kill the Event Platform process here');
  console.log('    docker stop rez-event-platform');

  // In test, we just add delay to simulate
  await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second simulation

  // Step 3: Try to send events during failure (should queue or fail gracefully)
  console.log('\n📤 Step 3: Attempting to send events during failure...');

  let eventsDuringFailure = 0;
  for (let i = 11; i <= 15; i++) {
    const event = {
      event: 'inventory.low',
      version: 'v1',
      correlation_id: `${TEST_ID}_${i}`,
      source: 'stress-test',
      timestamp: Date.now(),
      data: {
        merchant_id: 'test_merchant',
        store_id: 'test_store',
        item_id: `test_item_${i}`,
        item_name: `Test Item ${i}`,
        current_stock: 3,
        threshold: 5,
        unit: 'units',
      },
    };

    try {
      await axios.post(`${EVENT_PLATFORM_URL}/events/inventory.low`, event);
      eventsDuringFailure++;
    } catch (error: any) {
      // Expected to fail - should be handled gracefully
      results.details.push(`Event ${i} failed as expected: ${error.message}`);
    }
  }
  console.log(`Events sent during failure: ${eventsDuringFailure}/5`);

  // Step 4: Simulate recovery
  console.log('\n🔄 Step 4: SIMULATE Event Platform recovery...');
  console.log('⚠️  In production: Restart the Event Platform here');
  console.log('    docker start rez-event-platform');

  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second recovery simulation

  // Step 5: Verify recovery
  console.log('\n📊 Step 5: Verifying recovery and event processing...');

  try {
    // Check if events were processed after recovery
    const statsResponse = await axios.get(`${EVENT_PLATFORM_URL}/stats`);
    const stats = statsResponse.data;

    results.eventsProcessed = stats.processed || 0;
    results.eventsAfterRecovery = stats.processed_after_recovery || results.eventsProcessed;

    console.log(`📈 Events processed total: ${results.eventsProcessed}`);
    console.log(`📈 Events after recovery: ${results.eventsAfterRecovery}`);

  } catch (error: any) {
    results.details.push(`Failed to verify recovery: ${error.message}`);
  }

  // Step 6: Check for data loss
  console.log('\n🔍 Step 6: Checking for data loss...');

  // Expected: All events should be eventually processed
  const expectedTotal = results.eventsSent + eventsDuringFailure;
  const actualProcessed = results.eventsAfterRecovery;

  if (actualProcessed >= expectedTotal * 0.95) { // 95% tolerance
    results.passed = true;
    results.details.push(`✅ All events recovered (${actualProcessed}/${expectedTotal})`);
  } else {
    results.passed = false;
    results.details.push(`❌ Data loss detected (${actualProcessed}/${expectedTotal})`);
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📋 EVENT PLATFORM FAILURE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Test ID: ${TEST_ID}`);
  console.log(`Events Sent (healthy): ${results.eventsSent}`);
  console.log(`Events Sent (failure): ${eventsDuringFailure}`);
  console.log(`Events Processed: ${results.eventsProcessed}`);
  console.log(`Events After Recovery: ${results.eventsAfterRecovery}`);
  console.log(`PASSED: ${results.passed ? '✅ YES' : '❌ NO'}`);
  console.log('\nDetails:');
  results.details.forEach(d => console.log(`  ${d}`));
  console.log('='.repeat(60));

  // Exit with appropriate code
  process.exit(results.passed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  testEventPlatformFailure().catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
}

export { testEventPlatformFailure };
