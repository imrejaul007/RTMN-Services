/**
 * Retail Vertical Template
 * Industry: E-commerce / Retail Store
 */
module.exports = {
  name: 'retail',
  displayName: 'Retail Store',
  icon: '🛍️',
  description: 'For e-commerce stores, fashion shops, electronics stores, and general retail',
  intents: [
    { id: 'product_search', patterns: ['find product', 'search', 'show me', 'do you have', 'looking for', 'want to buy'], action: 'searchProducts' },
    { id: 'price_check', patterns: ['price', 'how much', 'cost', 'amount', 'rupees', ' INR'], action: 'getPrice' },
    { id: 'stock_check', patterns: ['in stock', 'available', 'delivery time', 'when will', 'shipping'], action: 'checkStock' },
    { id: 'size_guide', patterns: ['size', 'fit', 'measurement', '尺码', 'measurements'], action: 'showSizeGuide' },
    { id: 'compare_products', patterns: ['compare', 'difference between', 'which is better'], action: 'compareProducts' },
    { id: 'returns', patterns: ['return', 'exchange', 'refund', 'policy'], action: 'handleReturn' },
    { id: 'loyalty', patterns: ['points', 'rewards', 'membership', 'cashback'], action: 'checkLoyalty' },
    { id: 'order_track', patterns: ['track order', 'where is my order', 'delivery status'], action: 'trackOrder' },
    { id: 'coupon', patterns: ['coupon', 'discount', 'offer', 'promo code', 'deal'], action: 'applyCoupon' },
    { id: 'wishlist', patterns: ['wishlist', 'save for later', 'favorite'], action: 'manageWishlist' }
  ],
  richContentTypes: [
    { type: 'product_card', description: 'Product with image, price, Add to Cart' },
    { type: 'size_selector', description: 'Size dropdown with availability' },
    { type: 'color_selector', description: 'Color swatches' },
    { type: 'loyalty_points', description: 'Points balance and tier status' },
    { type: 'return_request', description: 'Return initiation form' },
    { type: 'order_tracking', description: 'Order status with timeline' },
    { type: 'recommendations', description: 'Similar product suggestions' }
  ],
  industryMetrics: [
    'conversion_rate', 'add_to_cart_rate', 'cart_abandonment_rate',
    'avg_order_value', 'repeat_purchase_rate', 'return_rate',
    'customer_acquisition_cost', 'lifetime_value'
  ],
  connectedServices: [
    { name: 'Retail OS', port: 5030, purpose: 'Product catalog, inventory, orders' },
    { name: 'REZ Wallet', port: 4004, purpose: 'Loyalty points, payments' },
    { name: 'REZ CRM Hub', port: 4056, purpose: 'Customer profiles' }
  ],
  agentPrompt: `You are an expert retail sales assistant. Help customers find products, answer questions about pricing and availability, assist with orders and returns, and provide personalized recommendations. Always be helpful, knowledgeable, and friendly.`,
  actionMappings: {
    searchProducts: { service: 'Retail OS', endpoint: '/api/products/search' },
    getPrice: { service: 'Retail OS', endpoint: '/api/products/price' },
    checkStock: { service: 'Retail OS', endpoint: '/api/products/stock' },
    handleReturn: { service: 'Retail OS', endpoint: '/api/orders/return' },
    checkLoyalty: { service: 'REZ Wallet', endpoint: '/api/wallet/points' },
    trackOrder: { service: 'Retail OS', endpoint: '/api/orders/track' }
  }
};