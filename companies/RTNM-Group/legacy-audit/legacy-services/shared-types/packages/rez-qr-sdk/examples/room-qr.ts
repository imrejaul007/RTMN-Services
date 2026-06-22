/**
 * Room QR Example - Hotel room service, checkout, and feedback
 *
 * This example demonstrates the complete flow for a hotel guest
 * using a QR code in their room to access services.
 */

import { QRSDK } from '../src';

// Initialize SDK
const sdk = new QRSDK({
  apiKey: process.env.REZ_API_KEY,
  environment: 'production',
});

/**
 * Scenario 1: Guest scans room QR and orders room service
 */
async function roomServiceFlow() {
  // Simulated QR scan result
  const scannedData = 'REZ-ROOM-ABC123-456';

  try {
    // Step 1: Validate the scanned QR code
    console.log('Validating room QR...');
    const room = await sdk.room.validateQR(scannedData);
    logger.info(Welcome to ${room.hotelName}, Room ${room.roomNumber}`);

    // Step 2: Get hotel amenities
    const amenities = await sdk.room.getAmenities(room.hotelId);
    console.log('Available amenities:', amenities.map((a) => a.name));

    // Step 3: Order room service (coffee with oat milk)
    console.log('Ordering room service...');
    const request = await sdk.room.submitRequest({
      roomId: room.id,
      category: 'room_service',
      itemId: 'coffee',
      quantity: 1,
      priority: 'normal',
      notes: 'With oat milk if available',
      guestPreferences: {
        dietaryRestrictions: ['dairy_free'],
      },
    });
    logger.info(Request submitted: ${request.request.requestId}`);
    logger.info(Status: ${request.request.status}`);
    logger.info(Estimated time: ${request.request.estimatedTime}`);

    // Step 4: Get AI recommendations for the stay
    const recommendations = await sdk.ai.getRecommendations({
      source: 'room_qr',
      roomId: room.id,
      timeOfDay: 'morning',
      stayDuration: room.checkOutDate,
    });
    console.log('Recommended for your stay:', recommendations.map((r) => r.title));

    // Step 5: Check the current bill
    const bill = await sdk.room.getBill(room.id);
    logger.info(Current bill total: ${bill.currency} ${bill.total}`);

    // Step 6: Request checkout
    console.log('Requesting express checkout...');
    const checkout = await sdk.room.requestExpressCheckout(room.id);
    logger.info(Checkout confirmation code: ${checkout.confirmationCode}`);

    // Step 7: Pay the bill with wallet
    const receipt = await sdk.room.checkout(bill.id, {
      method: 'wallet',
      amount: bill.total,
    });
    logger.info(Payment successful! Receipt: ${receipt.id}`);

    // Step 8: Submit feedback
    console.log('Submitting feedback...');
    const feedback = await sdk.room.submitFeedback({
      type: 'stay',
      roomId: room.id,
      rating: 5,
      categories: [
        { category: 'cleanliness', rating: 5, comment: 'Spotless room!' },
        { category: 'service', rating: 4, comment: 'Room service was a bit slow' },
      ],
      comment: 'Great stay overall!',
      contactPermission: false,
    });
    logger.info(Feedback submitted: ${feedback.id}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Scenario 2: Guest uses spa and laundry services
 */
async function additionalServicesFlow() {
  const roomId = 'room-123';

  // Book spa appointment
  console.log('Checking spa availability...');
  const availability = await sdk.room.getSpaAvailability(roomId, '2024-01-15');
  const morningSlots = availability.filter((s) => s.time.startsWith('09') || s.time.startsWith('10'));
  console.log('Available morning slots:', morningSlots);

  if (morningSlots.length > 0) {
    console.log('Booking spa appointment...');
    const spaBooking = await sdk.room.bookSpa(roomId, {
      serviceId: 'spa-massage',
      date: '2024-01-15',
      time: morningSlots[0].time,
      guestId: 'guest-123',
    });
    logger.info(Spa booked! Confirmation: ${spaBooking.confirmationCode}`);
  }

  // Request laundry pickup
  console.log('Requesting laundry pickup...');
  await sdk.room.submitRequest({
    roomId,
    category: 'laundry',
    priority: 'normal',
    notes: 'Express service needed',
  });
  console.log('Laundry pickup requested');

  // Get minibar items
  console.log('Checking minibar...');
  const minibarItems = await sdk.room.getMinibarItems(roomId);
  console.log('Available minibar items:', minibarItems.map((i) => `${i.name} - $${i.price}`));

  // Add items to room charges
  await sdk.room.addMinibarItem(roomId, 'minibar-cola', 2);
  await sdk.room.addMinibarItem(roomId, 'minibar-water', 4);
  console.log('Minibar items added to your bill');

  // Request wake-up call
  await sdk.room.requestWakeUpCall(roomId, '07:30');
  console.log('Wake-up call set for 7:30 AM');
}

/**
 * Scenario 3: AI-powered concierge interaction
 */
async function conciergeFlow() {
  const roomId = 'room-123';

  // Get concierge services
  const services = await sdk.room.getConciergeServices(roomId);
  console.log('Concierge services:', services.map((s) => `${s.name} - $${s.price}`));

  // Chat with AI for recommendations
  const response = await sdk.ai.sendMessage(
    "I'd like to find a good restaurant for dinner tonight, preferably Italian",
    {
      source: 'room_qr',
      roomId,
      context: {
        dietaryRestrictions: ['vegetarian'],
        budget: 'moderate',
        distance: 'walking_distance',
      },
    }
  );
  console.log('AI Response:', response.message);
  console.log('Suggestions:', response.suggestions);
}

/**
 * Scenario 4: Guest manages their requests
 */
async function requestManagementFlow() {
  const roomId = 'room-123';

  // Get all pending requests
  const requests = await sdk.room.getRequests(roomId);
  console.log('Current requests:');
  for (const req of requests) {
    logger.info(  - ${req.category}: ${req.status}`);
  }

  // Check specific request status
  if (requests.length > 0) {
    const status = await sdk.room.getRequestStatus(requests[0].id);
    logger.info(Request ${requests[0].id} status: ${status.request.status}`);
  }

  // Cancel a request if needed
  if (requests.length > 1) {
    logger.info(Cancelling request ${requests[1].id}...`);
    await sdk.room.cancelRequest(requests[1].id);
    console.log('Request cancelled');
  }
}

// Run all examples
async function runExamples() {
  console.log('=== Room QR Examples ===\n');

  console.log('--- Scenario 1: Room Service Flow ---');
  await roomServiceFlow();

  console.log('\n--- Scenario 2: Additional Services ---');
  await additionalServicesFlow();

  console.log('\n--- Scenario 3: AI Concierge ---');
  await conciergeFlow();

  console.log('\n--- Scenario 4: Request Management ---');
  await requestManagementFlow();

  console.log('\n=== All examples completed ===');
}

// Export for use in other examples
export { roomServiceFlow, additionalServicesFlow, conciergeFlow, requestManagementFlow };
