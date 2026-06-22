// ============================================================================
// HOJAI VOICE PLATFORM - Voice Commerce Agent
// ============================================================================

import { BaseVoiceAgent, AgentConfig } from './base.agent';
import { IntentDefinition, SentimentScore, VoiceAgent } from '../types';

/**
 * Default intents for Voice Commerce Agent
 */
export const DEFAULT_VOICE_COMMERCE_INTENTS: Omit<IntentDefinition, 'id'>[] = [
  {
    name: 'product_search',
    description: 'User wants to search for products',
    examples: [
      'find me a pizza', 'show me shoes', 'I want to order food',
      'search for laptops', 'find hotels near me'
    ],
    action: 'handleProductSearch',
    parameters: {
      query: { name: 'query', type: 'string', description: 'Search query' },
      category: { name: 'category', type: 'string', description: 'Product category' },
    },
  },
  {
    name: 'product_details',
    description: 'User wants details about a specific product',
    examples: [
      'tell me about this', 'what are the details', 'more info',
      'specifications', 'price details'
    ],
    action: 'handleProductDetails',
    parameters: {
      productId: { name: 'productId', type: 'string', description: 'Product ID' },
    },
  },
  {
    name: 'add_to_cart',
    description: 'User wants to add an item to their cart',
    examples: [
      'add to cart', 'add this to my order', 'I want this',
      'add one more', 'include this'
    ],
    action: 'handleAddToCart',
    parameters: {
      productId: { name: 'productId', type: 'string', description: 'Product ID' },
      quantity: { name: 'quantity', type: 'number', description: 'Quantity', defaultValue: 1 },
    },
    requiredParameters: ['productId'],
  },
  {
    name: 'place_order',
    description: 'User wants to place an order',
    examples: [
      'place order', 'checkout', 'order now', 'confirm order',
      'buy it', 'place the order'
    ],
    action: 'handlePlaceOrder',
    parameters: {
      paymentMethod: { name: 'paymentMethod', type: 'enum', description: 'Payment method', allowedValues: ['card', 'wallet', 'cod', 'upi'] },
      address: { name: 'address', type: 'string', description: 'Delivery address' },
    },
  },
  {
    name: 'order_tracking',
    description: 'User wants to track their order',
    examples: [
      'track my order', 'where is my order', 'order status',
      'when will it arrive', 'delivery update'
    ],
    action: 'handleOrderTracking',
    parameters: {
      orderId: { name: 'orderId', type: 'string', description: 'Order ID' },
    },
  },
  {
    name: 'cancel_order',
    description: 'User wants to cancel an order',
    examples: [
      'cancel my order', 'I want to cancel', 'do not want it anymore',
      'cancel it', 'stop the order'
    ],
    action: 'handleCancelOrder',
    parameters: {
      orderId: { name: 'orderId', type: 'string', description: 'Order ID' },
      reason: { name: 'reason', type: 'string', description: 'Cancellation reason' },
    },
  },
  {
    name: 'return_item',
    description: 'User wants to return an item',
    examples: [
      'return this', 'I want a refund', 'send it back',
      'return the item', 'not happy with it'
    ],
    action: 'handleReturnItem',
    parameters: {
      orderId: { name: 'orderId', type: 'string', description: 'Order ID' },
      productId: { name: 'productId', type: 'string', description: 'Product ID' },
      reason: { name: 'reason', type: 'string', description: 'Return reason' },
    },
  },
  {
    name: 'apply_coupon',
    description: 'User wants to apply a coupon or discount',
    examples: [
      'apply coupon', 'use discount code', 'I have a promo code',
      'add coupon', 'discount please'
    ],
    action: 'handleApplyCoupon',
    parameters: {
      couponCode: { name: 'couponCode', type: 'string', description: 'Coupon code' },
    },
    requiredParameters: ['couponCode'],
  },
  {
    name: 'view_cart',
    description: 'User wants to view their shopping cart',
    examples: [
      'show my cart', 'what is in my cart', 'view cart',
      'my order summary', 'what did I order'
    ],
    action: 'handleViewCart',
  },
  {
    name: 'payment_issue',
    description: 'User has a payment-related issue',
    examples: [
      'payment failed', 'cannot pay', 'payment error',
      'transaction declined', 'payment not working'
    ],
    action: 'handlePaymentIssue',
    parameters: {
      orderId: { name: 'orderId', type: 'string', description: 'Order ID' },
    },
  },
  {
    name: 'greeting',
    description: 'User is greeting',
    examples: ['hello', 'hi', 'namaste', 'good morning', 'नमस्ते'],
    action: 'handleGreeting',
    followUp: 'What would you like to order today?',
  },
  {
    name: 'goodbye',
    description: 'User is ending the conversation',
    examples: ['bye', 'goodbye', 'thanks', 'thank you'],
    action: 'handleGoodbye',
  },
];

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderResult {
  orderId: string;
  status: 'placed' | 'pending' | 'confirmed';
  estimatedDelivery?: string;
  totalAmount: number;
}

export class VoiceCommerceAgent extends BaseVoiceAgent {
  private cart: CartItem[] = [];
  private pendingOrder: Partial<OrderResult> = {};

  constructor(config: AgentConfig) {
    super(config);

    if (this.agent.intents.length === 0) {
      this.agent.intents = DEFAULT_VOICE_COMMERCE_INTENTS.map((intent, idx) => ({
        ...intent,
        id: `vc_intent_${idx}`,
      }));
    }
  }

  protected async handleIntent(
    intent: IntentDefinition,
    parameters: Record<string, unknown>,
    sentiment: SentimentScore
  ): Promise<string> {
    switch (intent.action) {
      case 'handleProductSearch':
        return this.handleProductSearch(parameters);
      case 'handleProductDetails':
        return this.handleProductDetails(parameters);
      case 'handleAddToCart':
        return this.handleAddToCart(parameters);
      case 'handlePlaceOrder':
        return this.handlePlaceOrder(parameters);
      case 'handleOrderTracking':
        return this.handleOrderTracking(parameters);
      case 'handleCancelOrder':
        return this.handleCancelOrder(parameters);
      case 'handleReturnItem':
        return this.handleReturnItem(parameters);
      case 'handleApplyCoupon':
        return this.handleApplyCoupon(parameters);
      case 'handleViewCart':
        return this.handleViewCart();
      case 'handlePaymentIssue':
        return this.handlePaymentIssue(parameters);
      case 'handleGreeting':
        return this.handleGreeting();
      case 'handleGoodbye':
        return this.handleGoodbye();
      default:
        return this.handleUnknown();
    }
  }

  protected getAgentCapabilities(): string {
    return 'searching products, placing orders, tracking deliveries, managing your cart, and handling returns';
  }

  private handleGreeting(): string {
    const greetings: Record<string, string> = {
      'en-IN': 'Namaste! Welcome to our voice shopping service. What would you like to order today?',
      'hi-IN': 'नमस्ते! आपका हमारी वॉइस शॉपिंग सेवा में स्वागत है। आज आप क्या ऑर्डर करना चाहेंगे?',
      'ta-IN': 'வணக்கம்! எங்கள் குரல் ஷாப்பிங் சேவைக்கு வரவேற்கிறோம். இன்று என்ன ஆர்டர் செய்ய விரும்புகிறீர்கள்?',
    };

    return greetings[this.session?.language || 'en-IN'] || greetings['en-IN'];
  }

  private handleProductSearch(parameters: Record<string, unknown>): string {
    const query = parameters.query || parameters.search || '';

    if (!query) {
      return `What are you looking for today? You can search for products by name, category, or describe what you need.`;
    }

    // In production, this would search a product database
    return `I found several options for "${query}". The top results include: Margherita Pizza at Rs. 299, Pepperoni Pizza at Rs. 399, and Veg Supreme at Rs. 449. Which one would you like to add to your cart?`;
  }

  private handleProductDetails(parameters: Record<string, unknown>): string {
    const productId = parameters.productId || this.cart[0]?.productId;

    if (!productId) {
      return `Which product would you like to know more about?`;
    }

    // In production, this would fetch product details
    return `This is a fresh, hot pizza made with mozzarella cheese, tomato sauce, and your choice of toppings. It weighs approximately 500 grams and is best enjoyed within 30 minutes of delivery. Price: Rs. 299. Would you like to add it to your cart?`;
  }

  private handleAddToCart(parameters: Record<string, unknown>): string {
    const productId = String(parameters.productId || 'product-001');
    const quantity = Number(parameters.quantity || 1);

    const existingItem = this.cart.find(item => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      // In production, fetch product details
      this.cart.push({
        productId,
        name: `Product ${productId}`,
        quantity,
        price: 299, // Would be fetched from product database
      });
    }

    this.emit('cart:updated', this.cart);

    return `Added to your cart. You now have ${this.cart.length} item${this.cart.length > 1 ? 's' : ''} in your cart. Your total is Rs. ${this.getCartTotal()}. Would you like to checkout or add more items?`;
  }

  private handleViewCart(): string {
    if (this.cart.length === 0) {
      return `Your cart is empty. What would you like to order?`;
    }

    const items = this.cart.map(item =>
      `${item.quantity}x ${item.name} - Rs. ${item.price * item.quantity}`
    ).join(', ');

    return `Your cart contains: ${items}. Total: Rs. ${this.getCartTotal()}. Would you like to checkout or add more items?`;
  }

  private async handlePlaceOrder(parameters: Record<string, unknown>): Promise<string> {
    if (this.cart.length === 0) {
      return `Your cart is empty. Would you like to add some items before placing an order?`;
    }

    const address = parameters.address || this.session?.context?.customData?.get('address') || '';

    if (!address) {
      return `To place your order, I need your delivery address. Please provide the complete address.`;
    }

    // Create order (in production, this would call the order service)
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const total = this.getCartTotal();

    this.pendingOrder = {
      orderId,
      status: 'confirmed',
      estimatedDelivery: '30-45 minutes',
      totalAmount: total,
    };

    this.emit('order:placed', this.pendingOrder);

    // Clear cart
    this.cart = [];

    return `Your order has been placed successfully! Order ID: ${orderId}. Total amount: Rs. ${total}. Estimated delivery time: 30-45 minutes. You'll receive SMS updates on your phone. Thank you for shopping with us!`;
  }

  private handleOrderTracking(parameters: Record<string, unknown>): string {
    const orderId = parameters.orderId || this.pendingOrder.orderId;

    if (!orderId) {
      return `Could you please provide your order ID?`;
    }

    // In production, this would track the actual order
    return `Your order ${orderId} is currently being prepared at the kitchen. It will be picked up by our delivery partner in approximately 15 minutes. Estimated arrival: 30-45 minutes from order placement.`;
  }

  private handleCancelOrder(parameters: Record<string, unknown>): string {
    const orderId = parameters.orderId || this.pendingOrder.orderId;
    const reason = parameters.reason || 'Customer requested cancellation';

    if (!orderId) {
      return `Could you please provide your order ID?`;
    }

    // In production, this would cancel the actual order
    this.emit('order:cancelled', { orderId, reason });

    return `Your order ${orderId} has been cancelled. If payment was made, it will be refunded within 5-7 business days. Is there anything else I can help you with?`;
  }

  private handleReturnItem(parameters: Record<string, unknown>): string {
    const orderId = parameters.orderId;
    const reason = parameters.reason || 'Customer requested return';

    if (!orderId) {
      return `Could you please provide your order ID?`;
    }

    this.emit('return:requested', { orderId, reason });

    return `I've initiated a return request for your order ${orderId}. Our delivery partner will pick up the item within 24 hours. Once we receive it, the refund of Rs. ${this.getCartTotal()} will be processed within 5-7 business days.`;
  }

  private handleApplyCoupon(parameters: Record<string, unknown>): string {
    const couponCode = String(parameters.couponCode || '').toUpperCase();

    if (!couponCode) {
      return `Please provide your coupon or discount code.`;
    }

    // Simulate coupon validation
    const validCoupons: Record<string, number> = {
      'SAVE10': 10,
      'FIRST20': 20,
      'FLAT50': 50,
    };

    const discount = validCoupons[couponCode];

    if (discount) {
      const total = this.getCartTotal();
      const newTotal = Math.max(0, total - discount);
      return `Coupon ${couponCode} applied! You get Rs. ${discount} off. New total: Rs. ${newTotal}. Would you like to proceed to checkout?`;
    }

    return `I'm sorry, coupon code ${couponCode} is not valid or has expired. Please check and try again.`;
  }

  private handlePaymentIssue(parameters: Record<string, unknown>): string {
    const orderId = parameters.orderId || this.pendingOrder.orderId;

    if (!orderId) {
      return `Could you please provide your order ID?`;
    }

    return `I see there's an issue with your payment for order ${orderId}. This could be due to insufficient funds, card limit, or network issues. Please try a different payment method or contact your bank. Would you like me to help you with an alternative payment option?`;
  }

  private getCartTotal(): number {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  private async handleGoodbye(): Promise<string> {
    await this.endSession();

    const farewells: Record<string, string> = {
      'en-IN': 'Thank you for shopping with us! Have a great day!',
      'hi-IN': 'हमारे साथ खरीदारी करने के लिए धन्यवाद! आपका दिन शुभ हो!',
    };

    return farewells[this.session?.language || 'en-IN'] || farewells['en-IN'];
  }

  private handleUnknown(): string {
    return `I'm here to help you shop by voice. You can search for products, add items to your cart, place orders, and track deliveries. What would you like to do?`;
  }

  /**
   * Get current cart
   */
  getCart(): CartItem[] {
    return [...this.cart];
  }

  /**
   * Clear cart
   */
  clearCart(): void {
    this.cart = [];
    this.emit('cart:cleared');
  }
}

/**
 * Factory function to create a Voice Commerce Agent
 */
export function createVoiceCommerceAgent(agent: VoiceAgent): VoiceCommerceAgent {
  return new VoiceCommerceAgent({ agent });
}
