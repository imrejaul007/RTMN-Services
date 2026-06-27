/**
 * Restaurant Vertical Template
 * Industry: Restaurants, QSR, Cloud Kitchens, Food Delivery
 */
module.exports = {
  name: 'restaurant',
  displayName: 'Restaurant',
  icon: '🍽️',
  description: 'For restaurants, QSR chains, cloud kitchens, and food delivery platforms',
  intents: [
    { id: 'menu_browse', patterns: ['menu', 'what do you have', 'food options', 'dishes', 'cuisine'], action: 'browseMenu' },
    { id: 'order_food', patterns: ['order', 'place order', 'I want to order', 'get food'], action: 'placeOrder' },
    { id: 'table_reservation', patterns: ['reserve table', 'book table', 'reservation', 'book a table'], action: 'reserveTable' },
    { id: 'delivery_track', patterns: ['track delivery', 'where is my food', 'delivery status'], action: 'trackDelivery' },
    { id: 'dietary_preference', patterns: ['vegetarian', 'vegan', 'gluten free', 'allergy', 'dietary'], action: 'filterDietary' },
    { id: 'special_offer', patterns: ['offer', 'deal', 'discount', 'combo', 'special'], action: 'showOffers' },
    { id: 'review_order', patterns: ['rate', 'review', 'feedback', 'how was'], action: 'reviewOrder' },
    { id: 'reorder', patterns: ['reorder', 'order again', 'same as last time', 'repeat order'], action: 'reorder' },
    { id: 'customize_order', patterns: ['customize', 'special request', 'no onion', 'extra'], action: 'customizeItem' },
    { id: 'party_booking', patterns: ['party', 'group booking', 'celebration', 'event'], action: 'bookParty' }
  ],
  richContentTypes: [
    { type: 'menu_item', description: 'Dish with image, price, description, add button' },
    { type: 'table_slots', description: 'Time slot selector for reservations' },
    { type: 'order_confirmation', description: 'Order details with estimated time' },
    { type: 'dietary_filter', description: 'Dietary preference toggles' },
    { type: 'combo_deal', description: 'Combo meal with savings' },
    { type: 'delivery_tracker', description: 'Real-time delivery status' }
  ],
  industryMetrics: [
    'avg_order_value', 'order_frequency', 'delivery_time',
    'customer_retention', 'repeat_order_rate', 'table_occupancy',
    'peak_hours', 'popular_items', 'cancellation_rate'
  ],
  connectedServices: [
    { name: 'Restaurant OS', port: 5010, purpose: 'Menu, orders, reservations' },
    { name: 'REZ Wallet', port: 4004, purpose: 'Payments, loyalty points' },
    { name: 'REZ CRM Hub', port: 4056, purpose: 'Customer preferences' }
  ],
  agentPrompt: `You are an expert restaurant assistant. Help customers browse the menu, place orders, make reservations, track deliveries, and handle dietary requirements. Be warm, quick, and knowledgeable about the menu.`,
  actionMappings: {
    browseMenu: { service: 'Restaurant OS', endpoint: '/api/menu' },
    placeOrder: { service: 'Restaurant OS', endpoint: '/api/orders' },
    reserveTable: { service: 'Restaurant OS', endpoint: '/api/reservations' },
    trackDelivery: { service: 'Restaurant OS', endpoint: '/api/delivery/track' }
  }
};