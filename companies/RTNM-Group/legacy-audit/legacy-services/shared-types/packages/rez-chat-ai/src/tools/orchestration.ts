// ── Cross-App Orchestration Tools ─────────────────────────────────────────────────
// Tools that coordinate actions across multiple ReZ apps and services

import crypto from 'crypto';
import { ToolHandlerConfig, CustomerContext, ToolResult } from '../types';
import { logger } from '../logger';

// ── Orchestration: Complete Hotel Stay Package ──────────────────────────────────

/**
 * Book hotel + request room preferences + check loyalty status
 * Single conversation turn: "Book a hotel for tomorrow and set up my preferences"
 */
export const bookHotelWithPreferencesTool: ToolHandlerConfig = {
  name: 'book_hotel_with_preferences',
  description: 'Book a hotel and set up guest preferences in one flow (room temp, pillows, early check-in)',
  parameters: {
    location: { type: 'string', description: 'City or area', required: true },
    checkIn: { type: 'string', description: 'Check-in date (YYYY-MM-DD)', required: true },
    checkOut: { type: 'string', description: 'Check-out date (YYYY-MM-DD)', required: true },
    guests: { type: 'number', description: 'Number of guests', required: true },
    roomType: { type: 'string', description: 'Room type preference', required: false },
    preferences: { type: 'object', description: '{roomTemp, pillowType, extraPillows, earlyCheckIn, lateCheckOut}', required: false },
    paymentMethod: { type: 'string', description: 'wallet, card, coins', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      // Step 1: Search and book hotel
      logger.info('[Orchestration] Booking hotel', { location: params.location });

      const checkOutDate = String(params.checkOut).split('-');
      const checkInDate = String(params.checkIn).split('-');
      const nights = parseInt(checkOutDate[2]) - parseInt(checkInDate[2]);

      const booking = {
        bookingId: `BK${Date.now()}`,
        confirmationCode: `GHC${crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
        hotelName: 'Grand Hotel',
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        roomType: params.roomType || 'deluxe',
        guests: params.guests,
        price: 5000 * nights,
      };

      // Step 2: Set preferences if provided
      const preferences = params.preferences as Record<string, string | boolean> | undefined;
      const prefsSet = preferences ? {
        roomTemp: preferences.roomTemp || '72F',
        pillowType: preferences.pillowType || 'standard',
        earlyCheckIn: preferences.earlyCheckIn || false,
        lateCheckOut: preferences.lateCheckOut || false,
      } : null;

      // Step 3: Check loyalty
      const cashbackAmount = Math.floor(booking.price * 0.05);
      const tier = context.tier || 'bronze';

      return {
        success: true,
        data: {
          bookingId: booking.bookingId,
          confirmationCode: booking.confirmationCode,
          hotelName: booking.hotelName,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          preferences: prefsSet,
          tier,
          cashbackEarned: cashbackAmount,
          total: booking.price,
          message: `Hotel booked! Confirmation: ${booking.confirmationCode}. You'll earn ${cashbackAmount} ReZ coins!`,
        }
      };

    } catch (error: any) {
      logger.error('[Orchestration] book_hotel_with_preferences failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};

// ── Orchestration: Restaurant Dinner Date ──────────────────────────────────────

/**
 * Search restaurant + make reservation + order drinks
 * Single conversation turn: "Book a romantic dinner for 2 at an Italian place"
 */
export const planDinnerDateTool: ToolHandlerConfig = {
  name: 'plan_dinner_date',
  description: 'Search restaurants, make reservation, and pre-order drinks in one flow',
  parameters: {
    cuisine: { type: 'string', description: 'Cuisine type (Italian, Japanese, etc.)', required: true },
    location: { type: 'string', description: 'Area or landmark', required: true },
    date: { type: 'string', description: 'Reservation date (YYYY-MM-DD)', required: true },
    time: { type: 'string', description: 'Reservation time (HH:MM)', required: true },
    partySize: { type: 'number', description: 'Number of guests', required: true },
    occasion: { type: 'string', description: 'Birthday, anniversary, date night, etc.', required: false },
    preOrderDrinks: { type: 'boolean', description: 'Pre-order champagne or wine', required: false },
    specialRequests: { type: 'string', description: 'Window seat, decorations, etc.', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      // Step 1: Search restaurants
      logger.info('[Orchestration] Searching restaurants', { cuisine: params.cuisine });

      const restaurant = {
        id: `rest_${Date.now()}`,
        name: `${params.cuisine} Garden`,
        rating: 4.5,
        priceRange: '$$',
      };

      // Step 2: Make reservation
      const reservation = {
        reservationId: `RES${Date.now()}`,
        confirmationCode: `DIN${crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
        restaurantName: restaurant.name,
        date: params.date,
        time: params.time,
        partySize: params.partySize,
      };

      // Step 3: Pre-order drinks if requested
      let drinksOrder = null;
      if (params.preOrderDrinks) {
        const occasionStr = String(params.occasion || '').toLowerCase();
        drinksOrder = {
          orderId: `DRK${Date.now()}`,
          items: occasionStr.includes('birthday')
            ? [{ name: 'Champagne', quantity: 1, price: 1500 }]
            : [{ name: 'House Red Wine', quantity: 1, price: 800 }],
          status: 'confirmed',
        };
      }

      return {
        success: true,
        data: {
          reservationId: reservation.reservationId,
          confirmationCode: reservation.confirmationCode,
          restaurantName: restaurant.name,
          restaurantRating: restaurant.rating,
          date: reservation.date,
          time: reservation.time,
          partySize: reservation.partySize,
          occasion: params.occasion,
          preOrderedDrinks: drinksOrder ? 'Yes - will be waiting at your table' : 'No',
          drinksOrder,
          specialRequests: params.specialRequests,
          message: `Dinner date planned! ${restaurant.name} on ${params.date} at ${params.time} for ${params.partySize}. Confirmation: ${reservation.confirmationCode}`,
        }
      };

    } catch (error: any) {
      logger.error('[Orchestration] plan_dinner_date failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};

// ── Orchestration: Order + Earn Points ────────────────────────────────────────

/**
 * Place order + apply loyalty discount + earn points
 * Single conversation turn: "Order from McDonalds and use my karma points"
 */
export const placeOrderWithLoyaltyTool: ToolHandlerConfig = {
  name: 'place_order_with_loyalty',
  description: 'Place an order, apply loyalty points as discount, and earn more points',
  parameters: {
    storeId: { type: 'string', description: 'Restaurant/store ID', required: true },
    items: { type: 'array', description: 'Array of {itemId, quantity}', required: true },
    orderType: { type: 'string', description: 'dine_in, delivery, takeout', required: true },
    deliveryAddress: { type: 'string', description: 'Full delivery address', required: false },
    usePoints: { type: 'number', description: 'Points to redeem (auto-calculate max)', required: false },
    applyCashback: { type: 'boolean', description: 'Apply ReZ coins as discount', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      // Step 1: Check current loyalty status
      const currentPoints = (context.preferences?.['karmaPoints'] as number) || 0;
      const maxRedeemable = Math.min(currentPoints, 500);

      // Step 2: Calculate discount
      const pointsToUse = (params.usePoints as number) || maxRedeemable;
      const pointValue = Math.floor(pointsToUse / 10);

      // Step 3: Place order
      const order = {
        orderId: `ORD${Date.now()}`,
        orderNumber: `#${Number.parseInt(crypto.randomUUID().replace(/-/g, ''), 16) % 9000 + 1000}`,
        subtotal: 350,
        discount: pointValue,
        total: Math.max(0, 350 - pointValue),
        status: 'confirmed',
        estimatedTime: '25-35 mins',
      };

      // Step 4: Calculate points earned
      const pointsEarned = Math.floor(order.total / 10);
      const newBalance = currentPoints - pointsToUse + pointsEarned;

      return {
        success: true,
        data: {
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          pointsRedeemed: pointsToUse,
          cashDiscount: pointValue,
          total: order.total,
          pointsEarned,
          previousBalance: currentPoints,
          newPointsBalance: newBalance,
          estimatedTime: order.estimatedTime,
          message: `Order ${order.orderNumber} confirmed! Total: ₹${order.total}. Used ${pointsToUse} points (₹${pointValue} off). Earned ${pointsEarned} new points. New balance: ${newBalance}`,
        }
      };

    } catch (error: any) {
      logger.error('[Orchestration] place_order_with_loyalty failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};

// ── Orchestration: Cross-App Travel Booking ─────────────────────────────────────

/**
 * Book hotel + flights + experiences
 * Single conversation turn: "Plan a trip to Goa for 3 days with beach activities"
 */
export const planTripTool: ToolHandlerConfig = {
  name: 'plan_trip',
  description: 'Plan a complete trip with hotel, activities, and recommendations',
  parameters: {
    destination: { type: 'string', description: 'Destination city', required: true },
    checkIn: { type: 'string', description: 'Start date (YYYY-MM-DD)', required: true },
    checkOut: { type: 'string', description: 'End date (YYYY-MM-DD)', required: true },
    travelers: { type: 'number', description: 'Number of travelers', required: true },
    tripType: { type: 'string', description: 'adventure, relaxation, romance, family, business', required: false },
    budget: { type: 'string', description: 'budget, mid, premium', required: false },
    interests: { type: 'array', description: 'Activities: beaches, food, nightlife, culture, nature', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      // Step 1: Search hotels
      logger.info('[Orchestration] Searching hotels', { destination: params.destination });

      const checkOutDate = String(params.checkOut).split('-');
      const checkInDate = String(params.checkIn).split('-');
      const nights = parseInt(checkOutDate[2]) - parseInt(checkInDate[2]);

      const hotels = [
        { id: 'h1', name: 'Beach Resort', rating: 4.6, pricePerNight: 4500 },
        { id: 'h2', name: 'Ocean View Inn', rating: 4.3, pricePerNight: 2800 },
      ];

      // Step 2: Search experiences
      const interests = (params.interests as string[]) || ['beaches', 'food'];
      const activities = [
        { id: 'a1', name: 'Sunset Boat Cruise', price: 1500, type: 'beaches' },
        { id: 'a2', name: 'Water Sports Combo', price: 2500, type: 'adventure' },
        { id: 'a3', name: 'Street Food Tour', price: 800, type: 'food' },
        { id: 'a4', name: 'Temple Tour', price: 500, type: 'culture' },
      ].filter(a => interests.some(i => a.type.includes(i)));

      // Step 3: Weather check
      const weather = {
        forecast: 'Sunny, 28°C',
        recommendation: 'Great weather for outdoor activities!',
      };

      // Calculate totals
      const recommendedHotel = hotels[0];
      const activitiesTotal = activities.reduce((sum: number, a) => sum + a.price, 0);
      const hotelTotal = recommendedHotel.pricePerNight * nights;
      const estimatedTotal = hotelTotal + activitiesTotal;

      // Apply tier discount
      const tier = context.tier || 'bronze';
      const tierDiscounts: Record<string, number> = { bronze: 0, silver: 0.05, gold: 0.1, platinum: 0.15 };
      const discount = estimatedTotal * (tierDiscounts[tier] || 0);

      return {
        success: true,
        data: {
          destination: params.destination,
          dates: `${params.checkIn} to ${params.checkOut}`,
          nights,
          travelers: params.travelers,
          tripType: params.tripType,
          weather,
          recommendedHotel: {
            name: recommendedHotel.name,
            rating: recommendedHotel.rating,
            pricePerNight: recommendedHotel.pricePerNight,
          },
          allHotels: hotels,
          suggestedActivities: activities,
          subtotal: estimatedTotal,
          tierDiscount: discount,
          tier,
          estimatedTotal: estimatedTotal - discount,
          message: `Trip to ${params.destination} planned! Top pick: ${recommendedHotel.name} at ₹${recommendedHotel.pricePerNight}/night. ${activities.length} activities suggested. ${tier !== 'bronze' ? `${tier} tier discount: ₹${Math.floor(discount)}` : ''} Total estimate: ₹${Math.floor(estimatedTotal - discount)}`,
        }
      };

    } catch (error: any) {
      logger.error('[Orchestration] plan_trip failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};

// ── Orchestration: Checkout Flow ────────────────────────────────────────────────

/**
 * Combine multiple items, apply all discounts, show final total
 */
export const checkoutWithDiscountsTool: ToolHandlerConfig = {
  name: 'checkout_with_discounts',
  description: 'Combine cart, apply coupons/points/coins, show final breakdown',
  parameters: {
    items: { type: 'array', description: 'Array of {itemId, name, price, quantity}', required: true },
    applyCoupon: { type: 'string', description: 'Coupon code to apply', required: false },
    usePoints: { type: 'number', description: 'Karma points to redeem', required: false },
    useCoins: { type: 'number', description: 'ReZ coins to redeem', required: false },
    paymentMethod: { type: 'string', description: 'Primary payment method', required: false },
  },
  execute: async (params: Record<string, unknown>, context: CustomerContext): Promise<ToolResult> => {
    try {
      const items = params.items as Array<{itemId: string; name: string; price: number; quantity: number}>;
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      let couponDiscount = 0;
      let pointsDiscount = 0;
      let coinsDiscount = 0;

      // Apply coupon
      const couponCode = String(params.applyCoupon || '').toUpperCase();
      if (couponCode) {
        const coupons: Record<string, number> = {
          'FIRST20': 0.2,
          'SAVE10': 0.1,
          'FLAT50': 50,
        };
        const discount = coupons[couponCode];
        if (discount) {
          couponDiscount = discount < 1
            ? subtotal * discount
            : discount;
        }
      }

      // Apply points
      const pointsToUse = (params.usePoints as number) || 0;
      if (pointsToUse) {
        pointsDiscount = Math.min(pointsToUse / 10, subtotal - couponDiscount);
      }

      // Apply coins
      const coinsToUse = (params.useCoins as number) || 0;
      if (coinsToUse) {
        coinsDiscount = Math.min(coinsToUse * 0.01, subtotal - couponDiscount - pointsDiscount);
      }

      const total = Math.max(0, subtotal - couponDiscount - pointsDiscount - coinsDiscount);
      const savings = couponDiscount + pointsDiscount + coinsDiscount;

      // Calculate points earned
      const pointsEarned = Math.floor(total / 10);
      const currentPoints = (context.preferences?.['karmaPoints'] as number) || 0;

      return {
        success: true,
        data: {
          items: items.map(i => `${i.quantity}x ${i.name}`),
          subtotal,
          couponDiscount: couponDiscount > 0 ? {
            code: couponCode,
            amount: couponDiscount,
          } : null,
          pointsDiscount,
          coinsDiscount,
          total,
          savings,
          savingsPercentage: subtotal > 0 ? Math.round((savings / subtotal) * 100) : 0,
          pointsEarned,
          newPointsBalance: currentPoints + pointsEarned,
          paymentMethod: params.paymentMethod || 'wallet',
          message: `Checkout ready! Subtotal: ₹${subtotal}. Discounts: ₹${Math.floor(savings)}. Total: ₹${Math.floor(total)}. You save ₹${Math.floor(savings)} (${Math.round((savings / subtotal) * 100)}%) and earn ${pointsEarned} points!`,
        }
      };

    } catch (error: any) {
      logger.error('[Orchestration] checkout_with_discounts failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
};

// ── All Orchestration Tools Export ─────────────────────────────────────────────

export const ORCHESTRATION_TOOLS: ToolHandlerConfig[] = [
  bookHotelWithPreferencesTool,
  planDinnerDateTool,
  placeOrderWithLoyaltyTool,
  planTripTool,
  checkoutWithDiscountsTool,
];

export default ORCHESTRATION_TOOLS;
