/**
 * Store QR Example (Rez Now / Linktree) - Profile, links, and analytics
 *
 * This example demonstrates how businesses can use
 * Linktree-style profiles for their brand.
 */

import { QRSDK } from '../src';

// Initialize SDK
const sdk = new QRSDK({
  apiKey: process.env.REZ_API_KEY,
  environment: 'production',
});

/**
 * Scenario 1: User scans store QR and views profile
 */
async function storeProfileFlow() {
  const slug = 'acme-business';

  try {
    // Step 1: Get store profile
    console.log('Loading store profile...');
    const profile = await sdk.store.getProfile(slug);
    logger.info(\n=== ${profile.name} ===`);
    logger.info(Description: ${profile.description || 'No description'}`);
    logger.info(Verified: ${profile.verified ? 'Yes' : 'No'}`);
    logger.info(Location: ${profile.location?.city}, ${profile.location?.country}`);

    // Step 2: Display links
    console.log('\n--- Available Links ---');
    profile.links.forEach((link) => {
      const icon = link.icon || '🔗';
      logger.info(${icon} ${link.title} (${link.type})`);
    });

    // Step 3: Get AI recommendations for similar stores
    const recs = await sdk.ai.getStoreRecommendations(undefined, {
      lat: profile.location?.coordinates?.latitude || 0,
      lng: profile.location?.coordinates?.longitude || 0,
    });
    console.log('\nSimilar stores you might like:');
    recs.slice(0, 3).forEach((rec) => {
      logger.info(  - ${rec.title}`);
    });

    // Step 4: Track the scan event
    await sdk.store.trackEvent(profile.id, {
      eventType: 'scan',
      source: 'qr',
      timestamp: new Date().toISOString(),
      metadata: { device: 'mobile' },
    });
    console.log('\nScan tracked');

    // Step 5: Get store analytics (for merchant view)
    const analytics = await sdk.store.getAnalytics(profile.id, {
      period: 'month',
    });
    console.log('\n--- Store Analytics (Last Month) ---');
    logger.info(Total scans: ${analytics.totalScans}`);
    logger.info(Unique scans: ${analytics.uniqueScans}`);
    logger.info(Conversion rate: ${(analytics.conversionRate * 100).toFixed(1)}%`);
    logger.info(Revenue: $${analytics.revenue.toFixed(2)}`);

    // Step 6: Favorite the store
    await sdk.store.favoriteStore(profile.id);
    console.log('\nStore favorited!');

    // Step 7: Share the store
    const shareResult = await sdk.store.shareStore(profile.id, 'whatsapp');
    logger.info(Share link: ${shareResult.shareUrl}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Scenario 2: Generate QR codes for a store
 */
async function qrGenerationFlow() {
  const storeId = 'store-123';

  console.log('Generating QR codes for store...');

  // Generate different types of QR codes
  const qrTypes: Array<{ type: 'menu' | 'order' | 'payment' | 'feedback' | 'loyalty'; desc: string }> = [
    { type: 'menu', desc: 'Digital Menu' },
    { type: 'order', desc: 'Order Online' },
    { type: 'payment', desc: 'Pay with REZ' },
    { type: 'feedback', desc: 'Leave Feedback' },
    { type: 'loyalty', desc: 'Join Loyalty Program' },
  ];

  const generatedQRCodes = [];
  for (const { type, desc } of qrTypes) {
    const qr = await sdk.store.generateQR(storeId, type, {
      size: 300,
      foregroundColor: '#000000',
      backgroundColor: '#FFFFFF',
    });
    logger.info(Generated ${desc} QR: ${qr.id}`);
    generatedQRCodes.push(qr);
  }

  // Get all generated QR codes
  console.log('\nFetching all generated QRs...');
  const allQRCodes = await sdk.store.getQRCodes(storeId);
  logger.info(Total QR codes: ${allQRCodes.length}`);

  // Get QR analytics
  console.log('\nFetching QR analytics...');
  for (const qr of generatedQRCodes) {
    const qrAnalytics = await sdk.store.getQRAnalytics(storeId, qr.id);
    logger.info(QR ${qr.id}: ${qrAnalytics.totalScans} scans`);
  }
}

/**
 * Scenario 3: Business owner views their store analytics
 */
async function merchantAnalyticsFlow() {
  const storeId = 'store-123';

  console.log('Fetching store analytics...');

  // Get overall analytics
  const analytics = await sdk.store.getAnalytics(storeId, {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    period: 'month',
  });

  console.log('\n=== Store Performance Report ===');
  logger.info(\nScans:`);
  logger.info(  Total: ${analytics.totalScans}`);
  logger.info(  Unique: ${analytics.uniqueScans}`);
  logger.info(  Average daily: ${(analytics.totalScans / 30).toFixed(1)}`);

  logger.info(\nClicks:`);
  logger.info(  Total: ${analytics.totalClicks}`);
  logger.info(  Unique: ${analytics.uniqueClicks}`);

  logger.info(\nConversions:`);
  logger.info(  Purchases: ${analytics.totalPurchases}`);
  logger.info(  Revenue: $${analytics.revenue.toFixed(2)}`);
  logger.info(  Conversion Rate: ${(analytics.conversionRate * 100).toFixed(2)}%`);

  logger.info(\nTop Links:`);
  analytics.topLinks.forEach((link, i) => {
    logger.info(  ${i + 1}. ${link.title}: ${link.clicks} clicks`);
  });

  logger.info(\nDaily Scan Trend:`);
  analytics.scansByDay.slice(-7).forEach((day) => {
    logger.info(  ${day.date}: ${day.count} scans`);
  });

  // Get link-specific analytics
  console.log('\n=== Link Analytics ===');
  for (const link of analytics.topLinks.slice(0, 3)) {
    const linkAnalytics = await sdk.store.getLinkAnalytics(storeId, link.linkId);
    logger.info(\n${link.title}:`);
    logger.info(  Clicks: ${linkAnalytics.clicks}`);
    logger.info(  Top cities: ${linkAnalytics.locations.slice(0, 3).map((l) => l.city).join(', ')}`);
    logger.info(  Devices: ${linkAnalytics.devices.map((d) => `${d.type}: ${d.count}`).join(', ')}`);
  }
}

/**
 * Scenario 4: Search and discover stores
 */
async function searchAndDiscoveryFlow() {
  console.log('=== Store Discovery ===\n');

  // Search stores
  console.log('Searching for "coffee shop"...');
  const searchResults = await sdk.store.search('coffee', { limit: 5 });
  logger.info(Found ${searchResults.length} results:`);
  searchResults.forEach((store) => {
    logger.info(  - ${store.name} (${store.location?.city || 'Unknown location'})`);
  });

  // Get nearby stores
  console.log('\nFinding nearby stores (San Francisco)...');
  const nearby = await sdk.store.getNearby(37.7749, -122.4194, 5000); // 5km radius
  logger.info(Found ${nearby.length} nearby stores:`);
  nearby.slice(0, 5).forEach((store) => {
    logger.info(  - ${store.name} (${store.links.length} links)`);
  });

  // Get active campaigns
  console.log('\nLooking for active promotions...');
  const campaigns = await sdk.campaign.getActiveCampaigns({ location: 'San Francisco', limit: 5 });
  logger.info(Found ${campaigns.length} active campaigns:`);
  campaigns.forEach((campaign) => {
    logger.info(  - ${campaign.name} by ${campaign.brandName}`);
    logger.info(    ${campaign.rewards.length} rewards available`);
  });
}

/**
 * Scenario 5: User submits review
 */
async function userReviewFlow() {
  const storeId = 'store-123';

  console.log('Getting store reviews...');
  const reviews = await sdk.store.getReviews(storeId, { page: 1, limit: 5 });
  logger.info(Average rating: ${reviews.averageRating.toFixed(1)}/5`);
  logger.info(Total reviews: ${reviews.total}`);

  console.log('\nRecent reviews:');
  reviews.items.forEach((review) => {
    logger.info(\n[${review.rating}/5] ${review.userName}`);
    logger.info(  ${review.comment || '(No comment)'}`);
    logger.info(  Helpful: ${review.helpful}`);
  });

  // Submit own review
  console.log('\nSubmitting your review...');
  const newReview = await sdk.store.submitReview(storeId, {
    rating: 5,
    comment: 'Absolutely love this place! The service is exceptional and the products are high quality.',
  });
  logger.info(Review submitted successfully: ${newReview.reviewId}`);
}

// Run all examples
async function runExamples() {
  console.log('=== Store QR (Rez Now) Examples ===\n');

  console.log('--- Scenario 1: Store Profile Flow ---');
  await storeProfileFlow();

  console.log('\n--- Scenario 2: QR Code Generation ---');
  await qrGenerationFlow();

  console.log('\n--- Scenario 3: Merchant Analytics ---');
  await merchantAnalyticsFlow();

  console.log('\n--- Scenario 4: Search and Discovery ---');
  await searchAndDiscoveryFlow();

  console.log('\n--- Scenario 5: User Reviews ---');
  await userReviewFlow();

  console.log('\n=== All examples completed ===');
}

// Export for use in other examples
export { storeProfileFlow, qrGenerationFlow, merchantAnalyticsFlow, searchAndDiscoveryFlow, userReviewFlow };
