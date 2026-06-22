/**
 * Full Integration Example - All systems together
 *
 * This example demonstrates a complete end-to-end flow
 * combining Room QR, Menu QR, Store QR, and Wallet.
 */

import { QRSDK } from '../src';

// Initialize SDK with all service URLs
const sdk = new QRSDK({
  apiKey: process.env.REZ_API_KEY,
  environment: 'production',
});

/**
 * Complete Hotel + Restaurant + Shopping Experience
 */
async function fullHotelExperience() {
  console.log('=== Full Hotel + Restaurant + Shopping Experience ===\n');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: HOTEL CHECK-IN
  // ═══════════════════════════════════════════════════════════════
  console.log('── PHASE 1: Hotel Check-in ──');

  // Step 1: Guest scans room QR
  console.log('Step 1: Scanning room QR...');
  const room = await sdk.room.validateQR('REZ-ROOM-HOTEL001-305');
  logger.info(Welcome to ${room.hotelName}, Room ${room.roomNumber}`);
  logger.info(Check-in: ${room.checkInDate} | Check-out: ${room.checkOutDate}`);

  // Step 2: Set up guest preferences
  console.log('\nStep 2: Setting up preferences...');
  await sdk.auth.loginWithOTP('+1234567890');
  const profile = await sdk.auth.getProfile();
  logger.info(Logged in as: ${profile.name || profile.phone}`);

  await sdk.auth.updatePreferences({
    language: 'en',
    currency: 'USD',
    notifications: { push: true, email: true, sms: false, types: ['booking', 'promo'] },
    dietary: { vegetarian: true, nutFree: true },
  });
  console.log('Preferences updated');

  // Step 3: Get personalized welcome recommendations
  console.log('\nStep 3: Getting welcome recommendations...');
  const welcomeRecs = await sdk.ai.getRecommendations({
    source: 'room_qr',
    roomId: room.id,
    stayDuration: room.checkOutDate,
    timeOfDay: new Date().getHours() < 12 ? 'morning' : 'afternoon',
  });
  console.log('Recommended for your stay:');
  welcomeRecs.slice(0, 3).forEach((rec) => {
    logger.info(  - ${rec.title}: ${rec.reasons.join(', ')}`);
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: ROOM SERVICE ORDERING
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── PHASE 2: Room Service ──');

  // Step 4: Check wallet balance
  console.log('Step 4: Checking wallet balance...');
  const wallet = await sdk.wallet.getBalance();
  logger.info(Balance: ${wallet.currency} ${wallet.total.toFixed(2)}`);
  logger.info(Available: ${wallet.currency} ${wallet.available.toFixed(2)}`);

  // Step 5: Order room service
  console.log('\nStep 5: Ordering room service...');
  const roomServiceRequest = await sdk.room.submitRequest({
    roomId: room.id,
    category: 'room_service',
    itemId: 'breakfast-combo',
    quantity: 2,
    priority: 'normal',
    notes: 'One vegetarian, one with extra coffee',
    guestPreferences: profile.preferences?.dietary,
  });
  logger.info(Order placed: ${roomServiceRequest.request.requestId}`);
  logger.info(Estimated delivery: ${roomServiceRequest.request.estimatedTime}`);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: DINNER AT RESTAURANT
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── PHASE 3: Dinner at Restaurant ──');

  // Step 6: Get restaurant menu
  console.log('Step 6: Getting restaurant menu...');
  const menu = await sdk.menu.getMenu('restaurant-hotel-01');
  logger.info(Welcome to ${menu.storeName}!`);
  logger.info(Categories: ${menu.categories.map((c) => c.name).join(', ')}`);

  // Step 7: Filter for dietary preferences
  console.log('\nStep 7: Filtering for dietary preferences...');
  const filters = {
    vegetarian: true,
    nutFree: true,
  };
  const safeItems = sdk.menu.filterByDietary(menu.items, filters);
  logger.info(Found ${safeItems.length} safe items`);

  // Step 8: Get AI recommendations
  console.log('\nStep 8: Getting AI recommendations...');
  const menuRecs = await sdk.ai.getMenuRecommendations('restaurant-hotel-01', undefined, ['vegetarian']);
  console.log('Recommended dishes:');
  menuRecs.slice(0, 5).forEach((rec) => {
    logger.info(  - ${rec.title} (${rec.price ? '$' + rec.price : 'Price TBD'})`);
    logger.info(    Why: ${rec.reasons.join(', ')}`);
  });

  // Step 9: Add items to cart
  console.log('\nStep 9: Adding items to cart...');
  const cart = await sdk.menu.addToCart('restaurant-hotel-01', safeItems[0].id, 1);
  logger.info(Cart ID: ${cart.cartId}`);
  const cart2 = await sdk.menu.addToCart('restaurant-hotel-01', safeItems[1].id, 1);
  logger.info(Items in cart: ${cart2.itemCount}`);

  // Step 10: Apply hotel discount
  console.log('\nStep 10: Applying hotel guest discount...');
  const promoResult = await sdk.menu.applyPromoCode(cart.cartId, 'HOTELGUEST10');
  logger.info(Discount applied: $${promoResult.discount.toFixed(2)}`);
  logger.info(New total: $${promoResult.newTotal.toFixed(2)}`);

  // Step 11: Place order
  console.log('\nStep 11: Placing order...');
  const order = await sdk.menu.placeOrder('restaurant-hotel-01', cart.cartId, {
    tableNumber: room.roomNumber,
    priority: { level: 'normal' },
  });
  logger.info(Order ID: ${order.orderId}`);
  logger.info(Status: ${order.status}`);
  logger.info(Estimated ready: ${order.estimatedReadyTime}`);

  // Step 12: Split bill with room charge option
  console.log('\nStep 12: Requesting bill...');
  const bill = await sdk.menu.requestBill('restaurant-hotel-01', order.orderId);
  logger.info(Bill total: $${bill.total.toFixed(2)}`);

  // Option A: Pay with wallet
  console.log('\n  Option A: Pay with wallet...');
  const walletPayment = await sdk.menu.checkout(order.orderId, {
    method: 'wallet',
    amount: bill.total,
  });
  logger.info(Payment successful! Receipt: ${walletPayment.id}`);
  logger.info(New balance: $${walletPayment.newBalance.toFixed(2)}`);

  // Option B: Split with companions (commented out)
  // const splits = [
  //   { type: 'equal' },
  //   { type: 'equal' },
  // ];
  // const splitResult = await sdk.menu.splitBill(order.orderId, splits);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: SHOPPING AT HOTEL BOUTIQUE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── PHASE 4: Hotel Boutique Shopping ──');

  // Step 13: Browse hotel store
  console.log('Step 13: Browsing hotel boutique...');
  const store = await sdk.store.getProfile('hotel-boutique');
  logger.info(\n=== ${store.name} ===`);
  logger.info(Location: ${store.location?.address}`);

  // Step 14: Generate shopping QR
  console.log('\nStep 14: Generating shopping QR...');
  const shoppingQR = await sdk.store.generateQR(store.id, 'order');
  logger.info(Shopping QR: ${shoppingQR.id}`);
  logger.info(QR URL: ${shoppingQR.url}`);

  // Step 15: Track shopping interest
  console.log('\nStep 15: Tracking engagement...');
  await sdk.store.trackEvent(store.id, {
    eventType: 'scan',
    source: 'qr',
    timestamp: new Date().toISOString(),
    metadata: { room: room.roomNumber, previousSpend: wallet.total },
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: CHECKOUT AND DEPARTURE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── PHASE 5: Checkout ──');

  // Step 16: Get final bill
  console.log('Step 16: Getting final bill...');
  const finalBill = await sdk.room.getBill(room.id);
  logger.info(Bill items:`);
  finalBill.items.forEach((item) => {
    logger.info(  - ${item.name} x${item.quantity}: $${item.total.toFixed(2)}`);
  });
  logger.info(Subtotal: $${finalBill.subtotal.toFixed(2)}`);
  logger.info(Taxes: $${finalBill.taxes.toFixed(2)}`);
  logger.info(Total: $${finalBill.total.toFixed(2)}`);

  // Step 17: Pay final bill
  console.log('\nStep 17: Processing payment...');
  const receipt = await sdk.room.checkout(finalBill.id, {
    method: 'wallet',
    amount: finalBill.total,
  });
  logger.info(Payment successful! Receipt: ${receipt.id}`);

  // Step 18: Get final wallet state
  console.log('\nStep 18: Final wallet state...');
  const finalWallet = await sdk.wallet.getBalance();
  logger.info(Remaining balance: ${finalWallet.currency} ${finalWallet.available.toFixed(2)}`);

  // Step 19: Express checkout
  console.log('\nStep 19: Requesting express checkout...');
  const checkout = await sdk.room.requestExpressCheckout(room.id);
  logger.info(Express checkout code: ${checkout.confirmationCode}`);
  console.log('You can now leave your key at reception!');

  // Step 20: Submit feedback
  console.log('\nStep 20: Submitting feedback...');
  const feedback = await sdk.room.submitFeedback({
    type: 'stay',
    roomId: room.id,
    rating: 5,
    categories: [
      { category: 'room', rating: 5 },
      { category: 'service', rating: 5 },
      { category: 'restaurant', rating: 4, comment: 'Great vegetarian options!' },
      { category: 'checkout', rating: 5, comment: 'Express checkout was seamless' },
    ],
    comment: 'Excellent stay overall. The AI recommendations were spot on!',
  });
  logger.info(Feedback submitted: ${feedback.id}`);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 6: POST-STAY FOLLOW-UP
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── PHASE 6: Post-Stay Follow-up ──');

  // Step 21: Get transaction history
  console.log('Step 21: Fetching transaction history...');
  const transactions = await sdk.wallet.getTransactions({ limit: 10 });
  logger.info(Total transactions: ${transactions.total}`);
  console.log('\nRecent transactions:');
  transactions.items.slice(0, 5).forEach((tx) => {
    const sign = tx.type === 'credit' ? '+' : '-';
    logger.info(  ${sign}$${tx.amount.toFixed(2)} - ${tx.description}`);
  });

  // Step 22: Get spending insights
  console.log('\nStep 22: Spending insights...');
  const insights = await sdk.wallet.getInsights({ period: 'month' });
  logger.info(Total spent this month: $${insights.totalSpent.toFixed(2)}`);
  logger.info(Average transaction: $${insights.averageTransaction.toFixed(2)}`);
  logger.info(Transactions: ${insights.transactionCount}`);
  console.log('Top categories:');
  insights.topCategories.slice(0, 3).forEach((cat) => {
    logger.info(  - ${cat.category}: $${cat.amount.toFixed(2)} (${cat.percentage}%)`);
  });

  // Step 23: Check for campaigns/promotions
  console.log('\nStep 23: Checking for ongoing promotions...');
  const campaigns = await sdk.campaign.getActiveCampaigns({ limit: 3 });
  if (campaigns.length > 0) {
    logger.info(Found ${campaigns.length} active campaigns:`);
    campaigns.forEach((c) => {
      logger.info(  - ${c.name}: ${c.rewards.length} rewards available`);
    });
  } else {
    console.log('No active campaigns at this time');
  }

  // Step 24: Logout
  console.log('\nStep 24: Logging out...');
  await sdk.auth.logout();
  console.log('Logged out successfully');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('=== FULL EXPERIENCE COMPLETE ===');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

/**
 * Run the full integration example
 */
async function main() {
  try {
    await fullHotelExperience();
  } catch (error) {
    console.error('Error in full integration:', error);
    throw error;
  }
}

// Export for testing
export { fullHotelExperience, main };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
