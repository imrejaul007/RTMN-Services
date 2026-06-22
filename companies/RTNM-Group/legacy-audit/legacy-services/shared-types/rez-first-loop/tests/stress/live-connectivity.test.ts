/**
 * Live Connectivity Test
 *
 * Tests actual connectivity to deployed services.
 * This runs against the LIVE infrastructure.
 */

import axios from 'axios';

const SERVICES = [
  { name: 'ReZ Mind', url: 'https://rez-intent-graph.onrender.com/health' },
  { name: 'Hotel OTA API', url: 'https://hotel-ota-api.onrender.com/health' },
  { name: 'Event Platform (local)', url: 'http://localhost:4022/health' },
  { name: 'Action Engine (local)', url: 'http://localhost:4009/health' },
  { name: 'Feedback Service (local)', url: 'http://localhost:4010/health' },
];

async function testConnectivity() {
  console.log('🔍 LIVE CONNECTIVITY TEST');
  console.log('='.repeat(60));

  const results = {
    reachable: [] as string[],
    unreachable: [] as string[],
    errors: [] as string[],
  };

  for (const service of SERVICES) {
    console.log(`\nChecking: ${service.name}...`);
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      results.reachable.push(service.name);
      console.log(`✅ REACHABLE: ${service.name}`);
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}`);
    } catch (error: any) {
      results.unreachable.push(service.name);
      results.errors.push(`${service.name}: ${error.message}`);
      console.log(`❌ NOT REACHABLE: ${service.name}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONNECTIVITY SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Reachable: ${results.reachable.length}`);
  console.log(`❌ Unreachable: ${results.unreachable.length}`);

  if (results.reachable.length > 0) {
    console.log('\n✅ Available Services:');
    results.reachable.forEach(s => console.log(`   • ${s}`));
  }

  if (results.unreachable.length > 0) {
    console.log('\n❌ Missing Services:');
    results.unreachable.forEach(s => console.log(`   • ${s}`));
  }

  // Check if First Loop can run
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FIRST LOOP READINESS');
  console.log('='.repeat(60));

  const hasEventPlatform = results.reachable.includes('Event Platform (local)');
  const hasActionEngine = results.reachable.includes('Action Engine (local)');
  const hasFeedbackService = results.reachable.includes('Feedback Service (local)');
  const hasRezMind = results.reachable.includes('ReZ Mind');

  if (hasEventPlatform && hasActionEngine && hasFeedbackService) {
    console.log('✅ All First Loop services deployed');
    console.log('🚀 Ready to run stress tests');
  } else {
    console.log('⚠️  Missing services - deploy required:');
    if (!hasEventPlatform) console.log('   • rez-event-platform');
    if (!hasActionEngine) console.log('   • rez-action-engine');
    if (!hasFeedbackService) console.log('   • rez-feedback-service');
  }

  console.log('\n💡 Existing services available for testing:');
  if (hasRezMind) {
    console.log('   • ReZ Mind API (requires auth)');
  }

  console.log('\n' + '='.repeat(60));

  return results;
}

// Run if called directly
if (require.main === module) {
  testConnectivity().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { testConnectivity };
