/**
 * AI Waiter - Restaurant Employee Agent
 * Handles orders, reservations, and customer support via WhatsApp/Chat
 *
 * Connected to:
 * - REZ Menu Service (Port 4030)
 * - REZ POS Service (Port 4081)
 * - REZ Table Booking Service (Port 4070)
 * - HOJAI Memory Service (Port 4520)
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { MenuService } from './services/menu-service';
import { OrderService } from './services/order-service';
import { ReservationService } from './services/reservation-service';
import { MemoryService } from './services/memory-service';

// =============================================================================
// TYPES
// =============================================================================

interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  customizations: string[];
  price: number;
}

interface Order {
  id: string;
  orderNumber?: string;
  customerId: string;
  tableId?: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
}

interface Reservation {
  customerId: string;
  customerName: string;
  guestCount: number;
  dateTime: Date;
  occasion?: string;
  phone: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface WhatsAppMessage {
  from: string;
  body: string;
  timestamp: string;
}

interface Context {
  tableId?: string;
  guestId?: string;
  restaurantId?: string;
}

// =============================================================================
// AI WAITER CLASS
// =============================================================================

export class AIWaiter {
  private menuService: MenuService;
  private orderService: OrderService;
  private reservationService: ReservationService;
  private activeOrders: Map<string, Order> = new Map();
  private cartSessions: Map<string, OrderItem[]> = new Map();
  private customerInfo: Map<string, { name?: string; phone?: string }> = new Map();

  constructor() {
    this.menuService = new MenuService();
    this.orderService = new OrderService();
    this.reservationService = new ReservationService();
  }

  /**
   * Main intent handler
   */
  async handleIntent(customerId: string, message: string, context?: Context): Promise<string> {
    // Detect intent
    const intent = await this.detectIntent(message);

    switch (intent) {
      case 'order':
        return await this.handleOrder(customerId, message, context);
      case 'reservation':
        return await this.handleReservation(customerId, message, context);
      case 'menu_query':
        return await this.handleMenuQuery(message);
      case 'dietary':
        return await this.handleDietaryQuery(message);
      case 'hours':
        return this.getOperatingHours();
      case 'location':
        return this.getLocation();
      case 'cancel':
        return await this.handleCancellation(customerId);
      case 'modify':
        return await this.handleModification(customerId, message);
      default:
        return this.getDefaultResponse();
    }
  }

  /**
   * Intent detection using keyword matching
   */
  private async detectIntent(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // Order intents
    if (lowerMessage.match(/\b(order|buy|want|need|get|have)\b/) &&
        !lowerMessage.match(/\bcancel\b|\bchange\b|\bmodify\b/)) {
      return 'order';
    }

    // Reservation intents
    if (lowerMessage.match(/\b(book|reserve|reservation|table|tonight| tomorrow|date|dinner|lunch)\b/)) {
      return 'reservation';
    }

    // Menu queries
    if (lowerMessage.match(/\b(menu|what.*have|what.*serve|items|dishes|options)\b/)) {
      return 'menu_query';
    }

    // Dietary queries
    if (lowerMessage.match(/\b(veg|vegan|vegetarian|jain|allergy|allergen|gluten|nut)\b/)) {
      return 'dietary';
    }

    // Hours
    if (lowerMessage.match(/\b(open|close|hour|time)\b/)) {
      return 'hours';
    }

    // Location
    if (lowerMessage.match(/\b(address|where|location|directions|map|parking)\b/)) {
      return 'location';
    }

    // Cancel
    if (lowerMessage.match(/\bcancel\b/)) {
      return 'cancel';
    }

    // Modify
    if (lowerMessage.match(/\bchange|modify|update|edit\b/)) {
      return 'modify';
    }

    return 'unknown';
  }

  /**
   * Handle order flow
   */
  private async handleOrder(customerId: string, message: string, context?: Context): Promise<string> {
    const tableId = context?.tableId;

    // Initialize cart if not exists
    if (!this.cartSessions.has(customerId)) {
      this.cartSessions.set(customerId, []);
    }

    // Parse items from message
    const items = await this.parseOrderItems(message);

    if (items.length === 0) {
      return this.askForItem();
    }

    // Add to cart
    const cart = this.cartSessions.get(customerId)!;
    cart.push(...items);
    this.cartSessions.set(customerId, cart);

    // Calculate total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Format cart
    const cartText = this.formatCart(cart, total);

    // Check if ready to confirm
    if (this.isConfirmation(message)) {
      return await this.confirmOrder(customerId, tableId);
    }

    return `${cartText}\n\nWould you like to add anything else?`;
  }

  /**
   * Parse order items from message
   */
  private async parseOrderItems(message: string): Promise<OrderItem[]> {
    const items: OrderItem[] = [];
    const menu = await this.menuService.getFullMenu();
    const lowerMessage = message.toLowerCase();

    for (const category of menu.categories) {
      for (const item of category.items) {
        const itemName = item.name.toLowerCase();
        if (lowerMessage.includes(itemName)) {
          const quantity = this.extractQuantity(lowerMessage, itemName);
          const customizations = this.extractCustomizations(lowerMessage);

          items.push({
            itemId: item.id,
            name: item.name,
            quantity,
            customizations,
            price: item.price
          });
        }
      }
    }

    return items;
  }

  /**
   * Extract quantity from message
   */
  private extractQuantity(message: string, itemName: string): number {
    const match = message.match(new RegExp(`(\\d+)\\s*${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Extract customizations
   */
  private extractCustomizations(message: string): string[] {
    const customizations: string[] = [];
    const customizationKeywords = [
      'extra cheese', 'no onion', 'less oil', 'well done',
      'mild', 'spicy', 'jain', 'gluten free', 'no garlic'
    ];

    for (const keyword of customizationKeywords) {
      if (message.includes(keyword)) {
        customizations.push(keyword);
      }
    }

    return customizations;
  }

  /**
   * Format cart for display
   */
  private formatCart(items: OrderItem[], total: number): string {
    let text = '🛒 *Your Order:*\n\n';

    items.forEach((item, index) => {
      const customText = item.customizations.length > 0
        ? ` (${item.customizations.join(', ')})`
        : '';
      text += `${index + 1}. ${item.name}${customText}\n`;
      text += `   Qty: ${item.quantity} × ₹${item.price} = ₹${item.price * item.quantity}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━\n`;
    text += `*Total: ₹${total}*\n`;
    text += `━━━━━━━━━━━━━━━`;

    return text;
  }

  /**
   * Check if message is a confirmation
   */
  private isConfirmation(message: string): boolean {
    const confirmWords = ['yes', 'yeah', 'yup', 'confirm', 'order', 'done', 'place order', "that's all", 'nothing else', 'place'];
    return confirmWords.some(word => message.toLowerCase().includes(word));
  }

  /**
   * Confirm and place order
   */
  private async confirmOrder(customerId: string, tableId?: string): Promise<string> {
    const cart = this.cartSessions.get(customerId) || [];

    if (cart.length === 0) {
      return "Your cart is empty. What would you like to order?";
    }

    // Get customer info if available
    const customerInfo = this.customerInfo.get(customerId) || {};

    // Create order in POS
    const order = await this.orderService.createOrder({
      customerId,
      tableId,
      items: cart,
      total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      status: 'confirmed',
      guestName: customerInfo.name,
      guestPhone: customerInfo.phone,
    });

    // Store order
    this.activeOrders.set(customerId, order);

    // Clear cart
    this.cartSessions.delete(customerId);

    // Notify kitchen
    await this.notifyKitchen(order);

    // Generate payment link
    const paymentLink = await this.orderService.generatePaymentLink(order.id);

    return `✅ *Order Confirmed!*\n\n` +
           `Order #${order.orderNumber || order.id}\n` +
           `Items: ${cart.map(i => i.name).join(', ')}\n` +
           `Total: ₹${order.total}\n\n` +
           `Payment: ${paymentLink}\n` +
           `Kitchen has been notified.\n` +
           `Estimated time: 15-20 minutes\n\n` +
           `Enjoy your meal! 🍽️`;
  }

  /**
   * Notify kitchen display
   */
  private async notifyKitchen(order: Order): Promise<void> {
    try {
      await this.orderService.sendToKDS({
        orderId: order.id,
        tableId: order.tableId,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          station: 'grill',
          modifiers: item.customizations,
        })),
        priority: 'normal',
        notes: order.items.flatMap(i => i.customizations).join(', ')
      });
    } catch (error) {
      console.error('Failed to notify kitchen:', error);
    }
  }

  /**
   * Handle reservation
   */
  private async handleReservation(customerId: string, message: string, context?: Context): Promise<string> {
    const guestCount = this.extractGuestCount(message);
    const dateTime = this.extractDateTime(message);
    const occasion = this.extractOccasion(message);

    if (!guestCount) {
      return "How many guests will be joining?";
    }

    if (!dateTime) {
      return "What date and time would you like?";
    }

    // Get stored customer info
    const customerInfo = this.customerInfo.get(customerId);
    if (!customerInfo?.name) {
      return "May I have your name for the reservation?";
    }

    // Create reservation
    const reservation = await this.reservationService.create({
      customerId,
      customerName: customerInfo.name,
      guestCount,
      dateTime,
      occasion,
      phone: customerInfo.phone,
      status: 'confirmed'
    });

    return `✅ *Reservation Confirmed!*\n\n` +
           `📅 ${dateTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}\n` +
           `🕐 ${dateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n` +
           `👥 ${guestCount} guests\n` +
           `📛 ${customerInfo.name}\n` +
           (occasion ? `🎂 ${occasion}\n` : '') +
           `\nSee you soon! 🌟`;
  }

  /**
   * Extract guest count
   */
  private extractGuestCount(message: string): number | null {
    const match = message.match(/(\d+)\s*(?:people|person|guests?|table)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract date/time
   */
  private extractDateTime(message: string): Date | null {
    const now = new Date();

    if (message.toLowerCase().includes('tonight')) {
      now.setHours(20, 0, 0, 0);
      return now;
    }

    if (message.toLowerCase().includes('tomorrow')) {
      now.setDate(now.getDate() + 1);
      now.setHours(20, 0, 0, 0);
      return now;
    }

    const timeMatch = message.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      const period = timeMatch[3]?.toLowerCase();

      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;

      now.setHours(hours, minutes, 0, 0);
      return now;
    }

    return null;
  }

  /**
   * Extract occasion
   */
  private extractOccasion(message: string): string | null {
    const occasions = ['birthday', 'anniversary', 'engagement', 'wedding', 'promotion', 'graduation'];
    const lowerMessage = message.toLowerCase();

    for (const occasion of occasions) {
      if (lowerMessage.includes(occasion)) {
        return occasion.charAt(0).toUpperCase() + occasion.slice(1);
      }
    }

    return null;
  }

  /**
   * Handle menu query
   */
  private async handleMenuQuery(message: string): Promise<string> {
    const menu = await this.menuService.getFullMenu();

    let response = "🍽️ *Our Menu:*\n\n";

    for (const category of menu.categories) {
      response += `*${category.name}:*\n`;
      for (const item of category.items.slice(0, 5)) {
        const vegIcon = item.isVeg !== false ? '🟢' : '🔴';
        response += `${vegIcon} ${item.name} - ₹${item.price}\n`;
      }
      response += "\n";
    }

    response += "What would you like to order?";

    return response;
  }

  /**
   * Handle dietary query
   */
  private async handleDietaryQuery(message: string): Promise<string> {
    const menuItems = await this.menuService.getMenuByDietary(message);

    if (menuItems.length === 0) {
      return "I couldn't find any items matching your dietary requirement. Would you like me to suggest alternatives?";
    }

    let response = "🌿 *Suitable Options:*\n\n";
    for (const item of menuItems.slice(0, 10)) {
      const vegIcon = item.isVeg !== false ? '🟢' : '🔴';
      response += `${vegIcon} ${item.name} - ₹${item.price}\n`;
    }

    return response;
  }

  /**
   * Get operating hours
   */
  private getOperatingHours(): string {
    return `🕐 *Operating Hours:*\n\n` +
           `Monday - Thursday: 11 AM - 10 PM\n` +
           `Friday - Saturday: 11 AM - 11 PM\n` +
           `Sunday: 12 PM - 10 PM\n\n` +
           `Kitchen closes 30 mins before.`;
  }

  /**
   * Get location
   */
  private getLocation(): string {
    return `📍 *Location:*\n\n` +
           `Pentouz Rooftop Restaurant\n` +
           `Indiranagar, Bangalore\n\n` +
           `📱 [Google Maps Link]\n\n` +
           `🚗 Valet parking available.\n` +
           `Nearest metro: Indiranagar Station (500m)`;
  }

  /**
   * Handle cancellation
   */
  private async handleCancellation(customerId: string): Promise<string> {
    const order = this.activeOrders.get(customerId);

    if (!order) {
      return "I don't see any active orders to cancel.";
    }

    if (order.status === 'preparing' || order.status === 'ready') {
      return "Sorry, your order is already being prepared and cannot be cancelled.";
    }

    await this.orderService.cancelOrder(order.id);
    this.activeOrders.delete(customerId);

    return "Your order has been cancelled. No charges will be made.";
  }

  /**
   * Handle modification
   */
  private async handleModification(customerId: string, message: string): Promise<string> {
    const order = this.activeOrders.get(customerId);

    if (!order) {
      return "I don't see any active orders to modify.";
    }

    if (order.status !== 'pending') {
      return "Your order cannot be modified as it's already being prepared.";
    }

    const modifications = await this.parseOrderItems(message);

    if (modifications.length > 0) {
      order.items = modifications;
      order.total = modifications.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return this.formatCart(order.items, order.total) +
             "\n\nSay *yes* to confirm the changes.";
    }

    return "What would you like to change about your order?";
  }

  /**
   * Ask for item
   */
  private askForItem(): string {
    return "🍽️ What would you like to order?\n\n" +
           "You can say things like:\n" +
           "• \"One masala dosa\"\n" +
           "• \"2 butter chicken with naan\"\n" +
           "• \"Veg biryani for tonight\"\n" +
           "• \"One cappuccino please\"";
  }

  /**
   * Default response
   */
  private getDefaultResponse(): string {
    return "I'm your AI waiter! 🍽️\n\n" +
           "I can help you with:\n" +
           "• Placing orders\n" +
           "• Making reservations\n" +
           "• Questions about our menu\n" +
           "• Dietary requirements\n\n" +
           "What would you like to do?";
  }

  /**
   * Set customer info
   */
  setCustomerInfo(customerId: string, info: { name?: string; phone?: string }): void {
    const existing = this.customerInfo.get(customerId) || {};
    this.customerInfo.set(customerId, { ...existing, ...info });
  }
}

// =============================================================================
// HTTP SERVER (Express)
// =============================================================================

const app: Express = express();
const PORT = process.env.AI_WAITER_PORT || 5600;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  res.setHeader('X-Request-ID', requestId);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${requestId}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ai-waiter',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Initialize AI Waiter
const aiWaiter = new AIWaiter();

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * POST /api/chat
 * Handle incoming chat message
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { customerId, message, context } = req.body;

    if (!customerId || !message) {
      res.status(400).json({ error: 'customerId and message are required' });
      return;
    }

    const response = await aiWaiter.handleIntent(customerId, message, context);
    res.json({ response, customerId });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/whatsapp/webhook
 * Handle incoming WhatsApp messages
 */
app.post('/api/whatsapp/webhook', async (req: Request, res: Response) => {
  try {
    const { from, body } = req.body as WhatsAppMessage;

    if (!from || !body) {
      res.sendStatus(400);
      return;
    }

    const response = await aiWaiter.handleIntent(from, body);
    res.json({ response });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.sendStatus(500);
  }
});

/**
 * POST /api/reservations
 * Create a reservation
 */
app.post('/api/reservations', async (req: Request, res: Response) => {
  try {
    const { customerId, customerName, phone, guestCount, dateTime, occasion } = req.body;

    // Store customer info
    if (customerId) {
      aiWaiter.setCustomerInfo(customerId, { name: customerName, phone });
    }

    const reservationService = new ReservationService();
    const reservation = await reservationService.create({
      customerId,
      customerName,
      guestCount,
      dateTime: new Date(dateTime),
      occasion,
      phone,
      status: 'confirmed'
    });

    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('Reservation error:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

/**
 * POST /api/orders
 * Create an order
 */
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { customerId, tableId, items, guestName, guestPhone } = req.body;

    // Store customer info
    if (customerId) {
      aiWaiter.setCustomerInfo(customerId, { name: guestName, phone: guestPhone });
    }

    const orderService = new OrderService();
    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    const order = await orderService.createOrder({
      customerId,
      tableId,
      items,
      total,
      status: 'confirmed',
      guestName,
      guestPhone,
    });

    // Notify kitchen
    await orderService.sendToKDS({
      orderId: order.id,
      tableId,
      items: items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        station: 'grill',
        modifiers: item.customizations,
      })),
      priority: 'normal',
    });

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * GET /api/menu
 * Get full menu
 */
app.get('/api/menu', async (req: Request, res: Response) => {
  try {
    const menuService = new MenuService();
    const menu = await menuService.getFullMenu();
    res.json({ success: true, data: menu });
  } catch (error) {
    console.error('Menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

/**
 * GET /api/menu/dietary
 * Get menu items by dietary preference
 */
app.get('/api/menu/dietary', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    if (!type) {
      res.status(400).json({ error: 'dietary type is required' });
      return;
    }

    const menuService = new MenuService();
    const items = await menuService.getMenuByDietary(type as string);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Dietary menu error:', error);
    res.status(500).json({ error: 'Failed to fetch dietary options' });
  }
});

/**
 * GET /api/orders/active
 * Get active orders
 */
app.get('/api/orders/active', async (req: Request, res: Response) => {
  try {
    const orderService = new OrderService();
    const orders = await orderService.getActiveOrders();
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Active orders error:', error);
    res.status(500).json({ error: 'Failed to fetch active orders' });
  }
});

/**
 * POST /api/customer/info
 * Set customer information
 */
app.post('/api/customer/info', (req: Request, res: Response) => {
  try {
    const { customerId, name, phone } = req.body;

    if (!customerId) {
      res.status(400).json({ error: 'customerId is required' });
      return;
    }

    aiWaiter.setCustomerInfo(customerId, { name, phone });
    res.json({ success: true });
  } catch (error) {
    console.error('Customer info error:', error);
    res.status(500).json({ error: 'Failed to set customer info' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🍽️  AI Waiter Service                                       ║
║                                                                ║
║   Server running on port ${PORT}                               ║
║   API Base URL: http://localhost:${PORT}/api                     ║
║   Health Check: http://localhost:${PORT}/health                 ║
║                                                                ║
║   Connected Services:                                          ║
║   • REZ Menu Service: ${process.env.MENU_SERVICE_URL || 'localhost:4030'}  ║
║   • REZ POS Service: ${process.env.POS_SERVICE_URL || 'localhost:4081'}    ║
║   • REZ Table Booking: ${process.env.TABLE_BOOKING_URL || 'localhost:4070'}║
║   • HOJAI Memory: ${process.env.MEMORY_SERVICE_URL || 'localhost:4520'}    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
export { AIWaiter };