/**
 * Hotel Vertical Template
 * Industry: Hotels, Resorts, Homestays, Vacation Rentals
 */
module.exports = {
  name: 'hotel',
  displayName: 'Hotel',
  icon: '🏨',
  description: 'For hotels, resorts, homestays, and vacation rental properties',
  intents: [
    { id: 'room_search', patterns: ['search rooms', 'find rooms', 'available rooms', 'book room'], action: 'searchRooms' },
    { id: 'check_availability', patterns: ['availability', 'available', 'dates', 'check in', 'check out'], action: 'checkAvailability' },
    { id: 'room_details', patterns: ['room details', 'room features', 'amenities', 'describe'], action: 'getRoomDetails' },
    { id: 'booking', patterns: ['book', 'reserve', 'make reservation', 'I want to stay'], action: 'createBooking' },
    { id: 'upgrade', patterns: ['upgrade', 'better room', 'premium', 'suite'], action: 'showUpgrades' },
    { id: 'late_checkout', patterns: ['late checkout', 'extend stay', 'checkout time'], action: 'requestLateCheckout' },
    { id: 'spa_booking', patterns: ['spa', 'massage', 'wellness', 'spa appointment'], action: 'bookSpa' },
    { id: 'dining', patterns: ['restaurant', 'dining', 'breakfast', 'dinner', 'room service'], action: 'diningOptions' },
    { id: 'guest_preferences', patterns: ['preferences', 'requests', 'special needs', 'celebration'], action: 'guestPreferences' },
    { id: 'checkout', patterns: ['checkout', 'check out', 'bill', 'invoice', 'payment'], action: 'processCheckout' }
  ],
  richContentTypes: [
    { type: 'room_card', description: 'Room with image, price, key features' },
    { type: 'availability_calendar', description: 'Date picker with availability' },
    { type: 'booking_confirmation', description: 'Booking details with confirmation number' },
    { type: 'upgrade_options', description: 'Upgrade choices with pricing' },
    { type: 'invoice', description: 'Itemized bill' },
    { type: 'loyalty_tier', description: 'Guest tier status and benefits' }
  ],
  industryMetrics: [
    'occupancy_rate', 'avg_daily_rate', 'revpar', 'guest_satisfaction',
    'booking_conversion', 'cancellation_rate', 'upsell_rate',
    'repeat_guest_rate', 'review_score'
  ],
  connectedServices: [
    { name: 'Hotel OS', port: 5025, purpose: 'Rooms, bookings, PMS' },
    { name: 'REZ Wallet', port: 4004, purpose: 'Payments, loyalty' },
    { name: 'Customer Twin', port: 4895, purpose: 'Guest preferences' }
  ],
  agentPrompt: `You are an expert hotel concierge. Help guests find rooms, make bookings, handle special requests, and provide personalized service. Be professional, attentive, and anticipatory of guest needs.`,
  actionMappings: {
    searchRooms: { service: 'Hotel OS', endpoint: '/api/rooms/search' },
    checkAvailability: { service: 'Hotel OS', endpoint: '/api/availability' },
    createBooking: { service: 'Hotel OS', endpoint: '/api/bookings' },
    bookSpa: { service: 'Hotel OS', endpoint: '/api/spa/bookings' }
  }
};