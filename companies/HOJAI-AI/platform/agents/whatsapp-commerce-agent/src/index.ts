/**
 * WhatsApp Commerce Agent
 * Commerce - Order Taking, Cart, Checkout, Support
 */

import { Agent, AgentContext, AgentResult } from '@hojai/agents';
import { MemoryOS } from '@hojai/memory';
import { TwinOS } from '@hojai/twins';

export interface WhatsAppMessage {
  from: string;
  message_id: string;
  type: 'text' | 'image' | 'document' | 'location' | 'button_reply';
  content: string;
  timestamp: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  category?: string;
  variants?: { name: string; price: number }[];
  available: boolean;
  stock?: number;
}

export interface CartItem {
  product_id: string;
  name: string;
  variant?: string;
  quantity: number;
  price: number;
}

export interface Order {
  id?: string;
  customer_phone: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total: number;
  address?: {
    street: string;
    city: string;
    pincode: string;
  };
  status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
}

export interface CommerceConfig {
  business_name: string;
  currency: string;
  catalog_id?: string;
  payment_methods: ('upi' | 'cod' | 'card')[];
  delivery_fee: number;
  min_order_value: number;
  welcome_message?: string;
  fallback_message?: string;
}

export class WhatsAppCommerceAgent extends Agent {
  private memory: MemoryOS;
  private twins: TwinOS;
  private config: CommerceConfig;
  private sessions: Map<string, {
    state: 'start' | 'browsing' | 'cart' | 'checkout' | 'address' | 'payment' | 'confirm';
    cart: CartItem[];
    customer?: any;
    context: any;
  }>;

  constructor(config: Partial<CommerceConfig> = {}) {
    super({
      id: 'whatsapp-commerce-agent',
      name: 'WhatsApp Commerce Agent',
      role: 'commerce',
      description: 'AI-powered WhatsApp commerce agent for order taking, cart management, and customer support',
      skills: [
        'intent_detection',
        'product_search',
        'cart_management',
        'order_processing',
        'payment_handling',
        'customer_support'
      ],
      memory: {
        required: ['order_history', 'customer_preferences', 'product_catalog'],
        updateOn: ['order_placed', 'cart_updated', 'support_resolved']
      },
      twins: ['customer_twin', 'order_twin', 'product_twin']
    });

    this.memory = new MemoryOS();
    this.twins = new TwinOS();
    this.sessions = new Map();

    this.config = {
      business_name: config.business_name || 'My Store',
      currency: config.currency || 'INR',
      catalog_id: config.catalog_id,
      payment_methods: config.payment_methods || ['upi', 'cod'],
      delivery_fee: config.delivery_fee || 50,
      min_order_value: config.min_order_value || 100,
      welcome_message: config.welcome_message || 'Hi! Welcome to {{business_name}}. How can I help you today?',
      fallback_message: config.fallback_message || "I'm not sure I understood that. Type *MENU* to see what I can help with."
    };
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const { input } = context;
    const message = input.message as WhatsAppMessage;

    // Get or create session
    let session = this.sessions.get(message.from);
    if (!session) {
      session = this.initSession(message.from);
      this.sessions.set(message.from, session);
    }

    // Detect intent
    const intent = await this.detectIntent(message, session);

    // Process based on intent
    let response: string;
    let actions: string[] = [];

    switch (intent.type) {
      case 'greeting':
        response = this.getWelcomeMessage();
        break;

      case 'browse':
        const products = await this.getProducts(intent.query);
        response = this.formatProductList(products);
        session.state = 'browsing';
        break;

      case 'add_to_cart':
        const addResult = await this.addToCart(session, intent.product_id!, intent.quantity || 1, intent.variant);
        response = addResult.message;
        actions.push(...addResult.actions);
        session.state = 'cart';
        break;

      case 'view_cart':
        response = this.formatCart(session.cart);
        session.state = 'cart';
        break;

      case 'update_cart':
        const updateResult = await this.updateCart(session, intent.product_id!, intent.quantity!);
        response = updateResult.message;
        session.state = 'cart';
        break;

      case 'checkout':
        response = this.startCheckout(session);
        session.state = 'checkout';
        break;

      case 'provide_address':
        const addressResult = await this.saveAddress(session, intent.address);
        response = addressResult.message;
        if (addressResult.success) {
          session.state = 'payment';
          response += '\n\n' + this.showPaymentOptions();
        }
        break;

      case 'select_payment':
        const paymentResult = await this.selectPayment(session, intent.payment_method!);
        response = paymentResult.message;
        if (paymentResult.success) {
          session.state = 'confirm';
          response += '\n\n' + this.showOrderSummary(session);
        }
        break;

      case 'confirm_order':
        const orderResult = await this.confirmOrder(session);
        response = orderResult.message;
        this.sessions.delete(message.from); // Clear session
        break;

      case 'track_order':
        const tracking = await this.trackOrder(intent.order_id!);
        response = this.formatOrderStatus(tracking);
        break;

      case 'support':
        const support = await this.handleSupport(message.content);
        response = support.message;
        break;

      case 'help':
      case 'menu':
        response = this.getHelpMenu();
        break;

      default:
        response = this.config.fallback_message!;
    }

    // Update customer twin
    await this.updateCustomerTwin(message.from, intent, session.cart);

    return {
      success: true,
      output: {
        response,
        actions,
        session_state: session.state,
        cart: session.cart
      }
    };
  }

  private initSession(phone: string) {
    return {
      state: 'start' as const,
      cart: [] as CartItem[],
      customer: { phone },
      context: {}
    };
  }

  private async detectIntent(message: WhatsAppMessage, session: any): Promise<{
    type: string;
    query?: string;
    product_id?: string;
    quantity?: number;
    variant?: string;
    address?: Order['address'];
    payment_method?: string;
    order_id?: string;
  }> {
    const text = message.content.toLowerCase();

    // Intent keywords
    const intents = [
      { type: 'greeting', keywords: ['hi', 'hello', 'hey', 'namaste', 'good morning'] },
      { type: 'browse', keywords: ['show', 'see', 'list', 'what do you have', 'catalog', 'menu', 'items'] },
      { type: 'add_to_cart', keywords: ['order', 'buy', 'add', 'want', 'get', 'need', '#'] },
      { type: 'view_cart', keywords: ['cart', 'basket', 'my order', 'see cart', 'view basket'] },
      { type: 'checkout', keywords: ['checkout', 'buy now', 'place order', 'order', 'confirm order'] },
      { type: 'track_order', keywords: ['track', 'where is', 'order status', 'delivery'] },
      { type: 'support', keywords: ['help', 'issue', 'problem', 'not received', 'refund', 'cancel'] },
      { type: 'help', keywords: ['menu', 'help', 'options', 'what can you do'] },
    ];

    for (const intent of intents) {
      if (intent.keywords.some(k => text.includes(k))) {
        // Extract product ID from #code or product name
        const productMatch = text.match(/#(\w+)|(\w+)/);
        const productId = productMatch ? productMatch[1] || productMatch[2] : undefined;

        // Extract quantity
        const qtyMatch = text.match(/(\d+)\s*(pcs|pieces|kg|items?|qty)?/);
        const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

        return {
          type: intent.type,
          query: intent.type === 'browse' ? text : undefined,
          product_id: productId,
          quantity
        };
      }
    }

    return { type: 'unknown' };
  }

  private getWelcomeMessage(): string {
    return `👋 ${this.config.welcome_message!.replace('{{business_name}}', this.config.business_name)}

*What I can help with:*
🛍️ Browse our ${this.config.catalog_id ? 'products' : 'items'}
🛒 Place orders
📦 Track deliveries
❓ Customer support

Type *MENU* anytime to see this list.`;
  }

  private getHelpMenu(): string {
    return `*📋 Available Options:*

1️⃣ *Browse Products* - Type "show items" or "menu"
2️⃣ *Order* - Type "order #PRODUCT_CODE" or "order PRODUCT_NAME"
3️⃣ *View Cart* - Type "cart"
4️⃣ *Checkout* - Type "checkout"
5️⃣ *Track Order* - Type "track ORDER_ID"
6️⃣ *Support* - Type your question

Example: *order Margherita Pizza*`;
  }

  private async getProducts(query?: string): Promise<Product[]> {
    // TODO: Integrate with product catalog
    // For demo, return sample products
    return [
      {
        id: 'pizza-001',
        name: 'Margherita Pizza',
        price: 299,
        currency: 'INR',
        available: true,
        variants: [
          { name: 'Regular', price: 299 },
          { name: 'Medium', price: 499 },
          { name: 'Large', price: 699 }
        ]
      },
      {
        id: 'pasta-001',
        name: 'Alfredo Pasta',
        price: 249,
        currency: 'INR',
        available: true
      },
      {
        id: 'beverage-001',
        name: 'Coke',
        price: 49,
        currency: 'INR',
        available: true
      }
    ];
  }

  private formatProductList(products: Product[]): string {
    let response = '*🛍️ Our Menu:*\n\n';

    products.forEach((p, i) => {
      const emoji = p.available ? '✅' : '❌';
      response += `${emoji} *${p.name}* - ₹${p.price}\n`;
      if (p.variants) {
        p.variants.forEach(v => {
          response += `   • ${v.name}: ₹${v.price}\n`;
        });
      }
      response += `   💬 Order: *order ${p.name}*\n\n`;
    });

    response += `---\n*🛒 Cart:* ${this.getCartSummary()}\n`;
    response += `*💰 Total:* ₹${this.getCartTotal()}\n`;

    return response;
  }

  private async addToCart(session: any, productId: string, quantity: number, variant?: string): Promise<{
    message: string;
    actions: string[];
  }> {
    // Find product
    const products = await this.getProducts();
    const product = products.find(p => p.id === productId || p.name.toLowerCase().includes(productId));

    if (!product) {
      return {
        message: `❌ Sorry, I couldn't find "${productId}". Type *MENU* to see available items.`,
        actions: []
      };
    }

    const price = variant
      ? product.variants?.find(v => v.name.toLowerCase() === variant.toLowerCase())?.price || product.price
      : product.price;

    const existing = session.cart.find(i => i.product_id === product.id && i.variant === variant);
    if (existing) {
      existing.quantity += quantity;
    } else {
      session.cart.push({
        product_id: product.id,
        name: product.name,
        variant,
        quantity,
        price
      });
    }

    return {
      message: `✅ Added *${quantity}x ${product.name}*${variant ? ` (${variant})` : ''} to cart!\n\n` +
        this.formatCart(session.cart),
      actions: ['cart_updated']
    };
  }

  private formatCart(cart: CartItem[]): string {
    if (cart.length === 0) {
      return '🛒 Your cart is empty.\n\nType *MENU* to browse products.';
    }

    let response = '*🛒 Your Cart:*\n\n';
    let subtotal = 0;

    cart.forEach((item, i) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      response += `${i + 1}. *${item.name}*${item.variant ? ` (${item.variant})` : ''}\n`;
      response += `   Qty: ${item.quantity} × ₹${item.price} = ₹${itemTotal}\n`;
    });

    const tax = Math.round(subtotal * 0.05);
    const delivery = subtotal >= 500 ? 0 : this.config.delivery_fee;
    const total = subtotal + tax + delivery;

    response += `\n---\n`;
    response += `Subtotal: ₹${subtotal}\n`;
    response += `Tax (5%): ₹${tax}\n`;
    response += `Delivery: ${delivery === 0 ? 'FREE' : `₹${delivery}`}\n`;
    response += `*TOTAL: ₹${total}*\n`;
    response += `---\n\n`;
    response += `Type *checkout* to place order.`;

    return response;
  }

  private getCartSummary(): string {
    return `${this.sessions.get('')?.cart.length || 0} items`;
  }

  private getCartTotal(): number {
    const session = Array.from(this.sessions.values())[0];
    if (!session) return 0;
    const subtotal = session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.05);
    const delivery = subtotal >= 500 ? 0 : this.config.delivery_fee;
    return subtotal + tax + delivery;
  }

  private async updateCart(session: any, productId: string, quantity: number): Promise<{ message: string }> {
    const index = session.cart.findIndex(i => i.product_id === productId);

    if (index === -1) {
      return { message: 'Item not in cart.' };
    }

    if (quantity <= 0) {
      session.cart.splice(index, 1);
      return { message: 'Item removed from cart.' };
    }

    session.cart[index].quantity = quantity;
    return { message: 'Cart updated.' };
  }

  private startCheckout(session: any): string {
    if (session.cart.length === 0) {
      return '❌ Your cart is empty. Add items first.\n\nType *MENU* to browse products.';
    }

    const subtotal = session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotal < this.config.min_order_value) {
      return `❌ Minimum order value is ₹${this.config.min_order_value}. Current: ₹${subtotal}`;
    }

    return `*📍 Delivery Address*

Please share your complete address:
- Street/House no.
- Landmark
- City
- PIN Code

Example: 123 MG Road, Near Metro, Bangalore, 560001`;
  }

  private async saveAddress(session: any, address: Order['address']): Promise<{ message: string; success: boolean }> {
    if (!address || !address.street || !address.city || !address.pincode) {
      return {
        message: '❌ Please provide complete address with street, city, and PIN code.',
        success: false
      };
    }

    session.address = address;
    return { message: '✅ Address saved!', success: true };
  }

  private showPaymentOptions(): string {
    let response = `*💳 Select Payment Method:*\n\n`;

    this.config.payment_methods.forEach((method, i) => {
      const names: Record<string, string> = {
        upi: '📱 UPI (Google Pay, PhonePe, Paytm)',
        cod: '💵 Cash on Delivery',
        card: '💳 Credit/Debit Card'
      };
      response += `${i + 1}. ${names[method] || method}\n`;
    });

    response += '\nType the number or name to select.';

    return response;
  }

  private async selectPayment(session: any, paymentMethod: string): Promise<{ message: string; success: boolean }> {
    const validMethods = ['upi', 'cod', 'card'];
    if (!validMethods.includes(paymentMethod)) {
      return {
        message: '❌ Invalid payment method. ' + this.showPaymentOptions(),
        success: false
      };
    }

    session.payment_method = paymentMethod;
    return { message: '✅ Payment method selected!', success: true };
  }

  private showOrderSummary(session: any): string {
    const subtotal = session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.05);
    const delivery = subtotal >= 500 ? 0 : this.config.delivery_fee;
    const total = subtotal + tax + delivery;

    let summary = `*📋 Order Summary:*\n\n`;
    summary += `📍 *Delivery:* ${session.address?.street}, ${session.address?.city} - ${session.address?.pincode}\n\n`;
    summary += `💳 *Payment:* ${session.payment_method?.toUpperCase()}\n\n`;
    summary += `*Items:*\n`;
    session.cart.forEach(item => {
      summary += `• ${item.quantity}x ${item.name}${item.variant ? ` (${item.variant})` : ''} - ₹${item.price * item.quantity}\n`;
    });
    summary += `\n*Total: ₹${total}*\n\n`;
    summary += `Reply *CONFIRM* to place order.`;

    return summary;
  }

  private async confirmOrder(session: any): Promise<{ message: string; order?: Order }> {
    // Create order
    const order: Order = {
      customer_phone: session.customer.phone,
      items: [...session.cart],
      subtotal: session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      tax: 0,
      delivery_fee: this.config.delivery_fee,
      total: 0,
      address: session.address,
      status: 'pending'
    };

    order.tax = Math.round(order.subtotal * 0.05);
    order.total = order.subtotal + order.tax + order.delivery_fee;

    // Save order
    await this.memory.save({
      type: 'order',
      order,
      createdAt: new Date().toISOString()
    });

    // Clear cart
    session.cart = [];

    return {
      message: `✅ *Order Placed Successfully!*\n\n` +
        `🧾 *Order ID:* #${Date.now().toString().slice(-8)}\n` +
        `💰 *Total:* ₹${order.total}\n` +
        `📍 *Delivery:* ${order.address?.street}, ${order.address?.city}\n\n` +
        `We'll send updates on WhatsApp. Thank you for ordering! 🎉`
    };
  }

  private async trackOrder(orderId: string): Promise<Order | null> {
    const orders = await this.memory.search({
      type: 'order',
      order_id: orderId
    });

    return orders[0] || null;
  }

  private formatOrderStatus(order: Order): string {
    if (!order) {
      return '❌ Order not found. Please check your Order ID.';
    }

    const statusEmojis: Record<string, string> = {
      pending: '⏳',
      confirmed: '✅',
      preparing: '👨‍🍳',
      delivered: '🎉',
      cancelled: '❌'
    };

    const statusMessages: Record<string, string> = {
      pending: 'Order received, processing',
      confirmed: 'Order confirmed, preparing',
      preparing: 'Being prepared',
      delivered: 'Delivered!',
      cancelled: 'Order cancelled'
    };

    return `*📦 Order Status*\n\n` +
      `🧾 *Order ID:* #${order.id || 'N/A'}\n` +
      `${statusEmojis[order.status]} *Status:* ${statusMessages[order.status]}\n\n` +
      `*Items:*\n` +
      order.items.map(i => `• ${i.quantity}x ${i.name}`).join('\n') + `\n\n` +
      `*Total:* ₹${order.total}`;
  }

  private async handleSupport(message: string): Promise<{ message: string }> {
    const text = message.toLowerCase();

    // Common support queries
    if (text.includes('refund')) {
      return {
        message: `💰 *Refund Process*\n\n` +
          `Refunds are processed within 5-7 business days.\n` +
          `For refunds, please share your Order ID and we'll help.`
      };
    }

    if (text.includes('cancel')) {
      return {
        message: `❌ *Cancel Order*\n\n` +
          `To cancel, please share your Order ID.\n` +
          `Note: Orders can only be cancelled before preparation begins.`
      };
    }

    if (text.includes('timing') || text.includes('hours')) {
      return {
        message: `🕐 *Store Hours*\n\n` +
          `We are open:\n` +
          `Monday - Sunday\n` +
          `11 AM - 11 PM\n\n` +
          `Same-day delivery orders close at 10 PM.`
      };
    }

    if (text.includes('contact') || text.includes('speak')) {
      return {
        message: `📞 *Contact Us*\n\n` +
          `For further assistance:\n` +
          `📧 support@${this.config.business_name.toLowerCase().replace(/\s/g, '')}.com\n` +
          `📱 +91 98765 43210\n\n` +
          `We reply within 2 hours during business hours.`
      };
    }

    return {
      message: `I'll connect you with our support team. Please share:\n` +
        `• Your Order ID\n` +
        `• Your question or concern\n\n` +
        `Or email us at support@yourstore.com`
    };
  }

  private async updateCustomerTwin(phone: string, intent: any, cart: CartItem[]): Promise<void> {
    await this.twins.upsert('customer_twin', {
      identity: { phone },
      data: {
        last_interaction: new Date().toISOString(),
        last_intent: intent.type,
        cart_items: cart.length,
        cart_value: cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)
      }
    });
  }
}

export default WhatsAppCommerceAgent;
