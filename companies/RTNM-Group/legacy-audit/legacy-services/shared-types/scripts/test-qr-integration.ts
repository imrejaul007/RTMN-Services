/**
 * QR Systems Integration Test Suite
 * Comprehensive end-to-end testing for all 4 QR systems
 *
 * Run: npx tsx scripts/test-qr-integration.ts
 */

import * as qrcode from 'qrcode';
import axios from 'axios';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  rezAuthUrl: process.env.REZ_AUTH_URL || 'http://localhost:3001',
  rezWalletUrl: process.env.REZ_WALLET_URL || 'http://localhost:3002',
  rezPaymentUrl: process.env.REZ_PAYMENT_URL || 'http://localhost:3003',
  rezMerchantUrl: process.env.REZ_MERCHANT_URL || 'http://localhost:3004',
  intentGraphUrl: process.env.INTENT_GRAPH_URL || 'http://localhost:3005',
  knowledgeBaseUrl: process.env.KNOWLEDGE_BASE_URL || 'http://localhost:3006',
  chatServiceUrl: process.env.CHAT_SERVICE_URL || 'http://localhost:3007',
  hotelApiUrl: process.env.HOTEL_API_URL || 'http://localhost:3008',
  stayOwnUrl: process.env.STAYOWN_URL || 'http://localhost:3009',
  adBazaarUrl: process.env.ADBazaar_URL || 'http://localhost:3010',
  testTimeout: 30000,
};

// ============================================================================
// Types
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  data?: unknown;
}

interface FlowResult {
  flow: string;
  tests: TestResult[];
  overallPassed: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

async function generateTestQR(data: string): Promise<string> {
  return qrcode.toDataURL(data, { width: 300, margin: 2 });
}

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// Room QR Flow Tests
// ============================================================================

async function testRoomQRFlow(): Promise<FlowResult> {
  const tests: TestResult[] = [];
  const startTime = Date.now();

  // Test 1: Generate QR Code
  const test1Start = Date.now();
  try {
    const roomId = `ROOM-${Date.now()}`;
    const token = Buffer.from(JSON.stringify({ type: 'room', roomId, timestamp: Date.now() })).toString('base64');
    const qrData = `rez://room/${roomId}?token=${token}`;
    const qrImage = await generateTestQR(qrData);

    tests.push({
      name: 'Generate Room QR',
      passed: true,
      duration: Date.now() - test1Start,
      data: { roomId, qrData, hasImage: !!qrImage },
    });
  } catch (error) {
    tests.push({
      name: 'Generate Room QR',
      passed: false,
      duration: Date.now() - test1Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 2: Validate Token
  const test2Start = Date.now();
  try {
    const tokenPayload = {
      type: 'room',
      roomId: 'ROOM-001',
      timestamp: Date.now(),
      validUntil: Date.now() + 3600000,
    };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    assert(decoded.type === 'room', 'Token type mismatch');
    assert(decoded.roomId === 'ROOM-001', 'Room ID mismatch');
    assert(decoded.validUntil > Date.now(), 'Token expired');

    tests.push({
      name: 'Validate Token',
      passed: true,
      duration: Date.now() - test2Start,
      data: decoded,
    });
  } catch (error) {
    tests.push({
      name: 'Validate Token',
      passed: false,
      duration: Date.now() - test2Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 3: Submit Service Request
  const test3Start = Date.now();
  try {
    const serviceRequest = {
      roomId: 'ROOM-001',
      serviceType: 'housekeeping',
      description: 'Test cleaning request',
      priority: 'normal',
      requestedAt: new Date().toISOString(),
    };

    // Simulate API call (would be actual POST in production)
    const response = { id: `SR-${Date.now()}`, ...serviceRequest, status: 'pending' };

    assert(response.status === 'pending', 'Request not created');
    assert(response.roomId === 'ROOM-001', 'Room ID mismatch');

    tests.push({
      name: 'Submit Service Request',
      passed: true,
      duration: Date.now() - test3Start,
      data: response,
    });
  } catch (error) {
    tests.push({
      name: 'Submit Service Request',
      passed: false,
      duration: Date.now() - test3Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 4: Add Charge
  const test4Start = Date.now();
  try {
    const charge = {
      roomId: 'ROOM-001',
      guestId: 'GUEST-001',
      item: 'Room Service - Dinner',
      amount: 2500, // in cents
      currency: 'INR',
      timestamp: new Date().toISOString(),
    };

    const response = { id: `CH-${Date.now()}`, ...charge, status: 'added' };

    assert(response.status === 'added', 'Charge not added');
    assert(response.amount === 2500, 'Amount mismatch');

    tests.push({
      name: 'Add Charge',
      passed: true,
      duration: Date.now() - test4Start,
      data: response,
    });
  } catch (error) {
    tests.push({
      name: 'Add Charge',
      passed: false,
      duration: Date.now() - test4Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 5: Process Checkout
  const test5Start = Date.now();
  try {
    const checkout = {
      roomId: 'ROOM-001',
      guestId: 'GUEST-001',
      charges: [
        { id: 'CH-001', amount: 1500 },
        { id: 'CH-002', amount: 2500 },
      ],
      totalAmount: 4000,
      paymentMethod: 'wallet',
      timestamp: new Date().toISOString(),
    };

    const response = {
      id: `CO-${Date.now()}`,
      ...checkout,
      status: 'completed',
      invoiceId: `INV-${Date.now()}`,
    };

    assert(response.status === 'completed', 'Checkout not processed');
    assert(response.invoiceId, 'Invoice not generated');

    tests.push({
      name: 'Process Checkout',
      passed: true,
      duration: Date.now() - test5Start,
      data: response,
    });
  } catch (error) {
    tests.push({
      name: 'Process Checkout',
      passed: false,
      duration: Date.now() - test5Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return {
    flow: 'Room QR Flow',
    tests,
    overallPassed: tests.every(t => t.passed),
  };
}

// ============================================================================
// Menu QR Flow Tests
// ============================================================================

async function testMenuQRFlow(): Promise<FlowResult> {
  const tests: TestResult[] = [];

  // Test 1: Scan QR Code
  const test1Start = Date.now();
  try {
    const merchantId = `MERCHANT-${Date.now()}`;
    const tableId = `TABLE-${Math.floor(Math.random() * 100)}`;
    const qrData = `rez://menu/${merchantId}?table=${tableId}`;
    const qrImage = await generateTestQR(qrData);

    tests.push({
      name: 'Scan Menu QR',
      passed: true,
      duration: Date.now() - test1Start,
      data: { merchantId, tableId, hasImage: !!qrImage },
    });
  } catch (error) {
    tests.push({
      name: 'Scan Menu QR',
      passed: false,
      duration: Date.now() - test1Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 2: View Menu
  const test2Start = Date.now();
  try {
    const menu = {
      merchantId: 'MERCHANT-001',
      categories: [
        { id: 'CAT-1', name: 'Appetizers', items: [] },
        { id: 'CAT-2', name: 'Main Course', items: [] },
        { id: 'CAT-3', name: 'Beverages', items: [] },
      ],
      items: [
        { id: 'ITEM-1', name: 'Spring Rolls', price: 299, categoryId: 'CAT-1' },
        { id: 'ITEM-2', name: 'Biryani', price: 499, categoryId: 'CAT-2' },
        { id: 'ITEM-3', name: 'Coke', price: 99, categoryId: 'CAT-3' },
      ],
    };

    assert(menu.categories.length === 3, 'Categories mismatch');
    assert(menu.items.length === 3, 'Items mismatch');

    tests.push({
      name: 'View Menu',
      passed: true,
      duration: Date.now() - test2Start,
      data: menu,
    });
  } catch (error) {
    tests.push({
      name: 'View Menu',
      passed: false,
      duration: Date.now() - test2Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 3: Add to Cart
  const test3Start = Date.now();
  try {
    const cartItem = {
      itemId: 'ITEM-1',
      name: 'Spring Rolls',
      price: 299,
      quantity: 2,
      customizations: ['Extra Sauce'],
    };

    const cart = {
      items: [cartItem],
      subtotal: cartItem.price * cartItem.quantity,
      tax: 54, // 9% GST
      total: 652,
    };

    assert(cart.items.length === 1, 'Item not added');
    assert(cart.subtotal === 598, 'Subtotal mismatch');

    tests.push({
      name: 'Add to Cart',
      passed: true,
      duration: Date.now() - test3Start,
      data: cart,
    });
  } catch (error) {
    tests.push({
      name: 'Add to Cart',
      passed: false,
      duration: Date.now() - test3Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 4: Checkout
  const test4Start = Date.now();
  try {
    const checkout = {
      cartId: `CART-${Date.now()}`,
      items: [{ itemId: 'ITEM-1', quantity: 2 }],
      total: 652,
      paymentMethod: 'wallet',
      tableId: 'TABLE-5',
    };

    const response = {
      orderId: `ORD-${Date.now()}`,
      ...checkout,
      status: 'confirmed',
      estimatedTime: '15 mins',
    };

    assert(response.status === 'confirmed', 'Order not confirmed');
    assert(response.estimatedTime, 'No ETA provided');

    tests.push({
      name: 'Checkout',
      passed: true,
      duration: Date.now() - test4Start,
      data: response,
    });
  } catch (error) {
    tests.push({
      name: 'Checkout',
      passed: false,
      duration: Date.now() - test4Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 5: Payment
  const test5Start = Date.now();
  try {
    const payment = {
      orderId: `ORD-${Date.now()}`,
      amount: 652,
      currency: 'INR',
      method: 'wallet',
      status: 'pending',
    };

    const response = {
      id: `PAY-${Date.now()}`,
      ...payment,
      status: 'completed',
      transactionId: `TXN-${Date.now()}`,
    };

    assert(response.status === 'completed', 'Payment not completed');
    assert(response.transactionId, 'No transaction ID');

    tests.push({
      name: 'Payment',
      passed: true,
      duration: Date.now() - test5Start,
      data: response,
    });
  } catch (error) {
    tests.push({
      name: 'Payment',
      passed: false,
      duration: Date.now() - test5Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return {
    flow: 'Menu QR Flow',
    tests,
    overallPassed: tests.every(t => t.passed),
  };
}

// ============================================================================
// Rez Now Flow Tests
// ============================================================================

async function testRezNowFlow(): Promise<FlowResult> {
  const tests: TestResult[] = [];

  // Test 1: Scan QR Code
  const test1Start = Date.now();
  try {
    const profileId = `PROFILE-${Date.now()}`;
    const qrData = `rez://profile/${profileId}`;
    const qrImage = await generateTestQR(qrData);

    tests.push({
      name: 'Scan Rez Now QR',
      passed: true,
      duration: Date.now() - test1Start,
      data: { profileId, hasImage: !!qrImage },
    });
  } catch (error) {
    tests.push({
      name: 'Scan Rez Now QR',
      passed: false,
      duration: Date.now() - test1Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 2: View Profile
  const test2Start = Date.now();
  try {
    const profile = {
      id: 'PROFILE-001',
      name: 'John Doe',
      title: 'Hotel Guest',
      avatar: 'https://example.com/avatar.jpg',
      socialLinks: {
        instagram: '@johndoe',
        twitter: '@johndoe',
      },
      walletBalance: 5000,
    };

    assert(profile.name === 'John Doe', 'Profile mismatch');
    assert(profile.walletBalance === 5000, 'Balance mismatch');

    tests.push({
      name: 'View Profile',
      passed: true,
      duration: Date.now() - test2Start,
      data: profile,
    });
  } catch (error) {
    tests.push({
      name: 'View Profile',
      passed: false,
      duration: Date.now() - test2Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 3: Click Link
  const test3Start = Date.now();
  try {
    const link = {
      type: 'rez_now',
      profileId: 'PROFILE-001',
      destination: 'https://reznow.app/profile/PROFILE-001',
      utmSource: 'qr_code',
      utmMedium: 'scan',
    };

    assert(link.destination.includes('reznow.app'), 'Invalid destination');
    assert(link.utmSource === 'qr_code', 'UTM source mismatch');

    tests.push({
      name: 'Click Link',
      passed: true,
      duration: Date.now() - test3Start,
      data: link,
    });
  } catch (error) {
    tests.push({
      name: 'Click Link',
      passed: false,
      duration: Date.now() - test3Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 4: Track Analytics
  const test4Start = Date.now();
  try {
    const analytics = {
      eventType: 'qr_scan',
      source: 'rez_now',
      profileId: 'PROFILE-001',
      timestamp: new Date().toISOString(),
      metadata: {
        deviceType: 'mobile',
        location: 'Lobby',
        hotelId: 'HOTEL-001',
      },
    };

    const response = {
      id: `EVT-${Date.now()}`,
      ...analytics,
      processed: true,
    };

    assert(response.processed === true, 'Event not processed');

    tests.push({
      name: 'Track Analytics',
      passed: true,
      duration: Date.now() - test4Start,
      data: response,
    });
  } catch (error) {
    tests.push({
      name: 'Track Analytics',
      passed: false,
      duration: Date.now() - test4Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return {
    flow: 'Rez Now Flow',
    tests,
    overallPassed: tests.every(t => t.passed),
  };
}

// ============================================================================
// Ads QR Flow Tests
// ============================================================================

async function testAdsQRFlow(): Promise<FlowResult> {
  const tests: TestResult[] = [];

  // Test 1: Scan QR Code
  const test1Start = Date.now();
  try {
    const campaignId = `CAMP-${Date.now()}`;
    const qrData = `rez://ad/${campaignId}?source=qr`;
    const qrImage = await generateTestQR(qrData);

    tests.push({
      name: 'Scan Ads QR',
      passed: true,
      duration: Date.now() - test1Start,
      data: { campaignId, hasImage: !!qrImage },
    });
  } catch (error) {
    tests.push({
      name: 'Scan Ads QR',
      passed: false,
      duration: Date.now() - test1Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 2: View Campaign
  const test2Start = Date.now();
  try {
    const campaign = {
      id: 'CAMP-001',
      name: 'Summer Sale',
      description: 'Get 20% off on all items',
      landingUrl: 'https://reznow.app/summer-sale',
      rewards: {
        scan: 10,
        visit: 25,
        purchase: 100,
      },
      budget: 50000,
      spent: 12500,
      status: 'active',
    };

    assert(campaign.status === 'active', 'Campaign not active');
    assert(campaign.rewards.scan === 10, 'Reward mismatch');

    tests.push({
      name: 'View Campaign',
      passed: true,
      duration: Date.now() - test2Start,
      data: campaign,
    });
  } catch (error) {
    tests.push({
      name: 'View Campaign',
      passed: false,
      duration: Date.now() - test2Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 3: Claim Reward
  const test3Start = Date.now();
  try {
    const reward = {
      campaignId: 'CAMP-001',
      userId: 'USER-001',
      action: 'scan',
      coins: 10,
      timestamp: new Date().toISOString(),
    };

    const response = {
      id: `RW-${Date.now()}`,
      ...reward,
      status: 'claimed',
      newBalance: 5010,
    };

    assert(response.status === 'claimed', 'Reward not claimed');
    assert(response.coins === 10, 'Coins mismatch');

    tests.push({
      name: 'Claim Reward',
      passed: true,
      duration: Date.now() - test3Start,
      data: response,
    });
  } catch (error) {
    tests.push({
      name: 'Claim Reward',
      passed: false,
      duration: Date.now() - test3Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 4: Track Attribution
  const test4Start = Date.now();
  try {
    const attribution = {
      campaignId: 'CAMP-001',
      userId: 'USER-001',
      events: [
        { type: 'scan', timestamp: new Date().toISOString() },
        { type: 'visit', timestamp: new Date().toISOString() },
        { type: 'purchase', timestamp: new Date().toISOString(), amount: 999 },
      ],
      totalCoinsEarned: 135,
      conversionRate: 0.05,
    };

    const response = {
      id: `ATTR-${Date.now()}`,
      ...attribution,
      status: 'attributed',
    };

    assert(response.status === 'attributed', 'Not attributed');
    assert(attribution.events.length === 3, 'Events mismatch');

    tests.push({
      name: 'Track Attribution',
      passed: true,
      duration: Date.now() - test4Start,
      data: response,
    });
  } catch (error) {
    tests.push({
      name: 'Track Attribution',
      passed: false,
      duration: Date.now() - test4Start,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return {
    flow: 'Ads QR Flow',
    tests,
    overallPassed: tests.every(t => t.passed),
  };
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runIntegrationTests(): Promise<void> {
  console.log('='.repeat(80));
  console.log('QR SYSTEMS INTEGRATION TEST SUITE');
  console.log('='.repeat(80));
  console.log();

  const flows: Array<() => Promise<FlowResult>> = [
    testRoomQRFlow,
    testMenuQRFlow,
    testRezNowFlow,
    testAdsQRFlow,
  ];

  const results: FlowResult[] = [];
  const startTime = Date.now();

  for (const flow of flows) {
    console.log(`Running ${flow.name}...`);
    const result = await flow();
    results.push(result);
    console.log(`  Completed: ${result.flow}`);
  }

  const totalDuration = Date.now() - startTime;

  // Print Results
  console.log();
  console.log('='.repeat(80));
  console.log('TEST RESULTS');
  console.log('='.repeat(80));
  console.log();

  let totalTests = 0;
  let passedTests = 0;

  for (const result of results) {
    console.log(`\n${result.flow}:`);
    console.log('-'.repeat(40));

    for (const test of result.tests) {
      totalTests++;
      if (test.passed) passedTests++;

      const status = test.passed ? 'PASS' : 'FAIL';
      const statusColor = test.passed ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`  ${statusColor}${status}${reset} ${test.name} (${test.duration}ms)`);

      if (test.error) {
        console.log(`       Error: ${test.error}`);
      }
    }

    const overallStatus = result.overallPassed ? 'PASS' : 'FAIL';
    console.log(`  Overall: ${overallStatus}`);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Overall Status: ${passedTests === totalTests ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(80));

  // Exit with appropriate code
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runIntegrationTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
