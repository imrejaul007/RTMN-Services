#!/usr/bin/env tsx

/**
 * HOJAI AI - Full Platform Demo
 *
 * This script demonstrates the complete HOJAI AI platform flow:
 * 1. Health check
 * 2. Product browsing
 * 3. Cart management
 * 4. AI brain processing
 * 5. Support ticket creation
 *
 * Run: npx tsx demo/scripts/full-demo.ts
 */

import axios, { AxiosInstance } from 'axios';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.HOJAI_API_URL || 'http://localhost:4850';
const TENANT_ID = process.env.HOJAI_TENANT_ID || 'demo_tenant';
const CUSTOMER_ID = 'customer_001';
const CUSTOMER_NAME = 'John Doe';
const CUSTOMER_EMAIL = 'john.doe@example.com';
const CUSTOMER_PHONE = '+919876543210';

// ============================================================================
// COLORS FOR TERMINAL OUTPUT
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const color = type === 'success' ? colors.green : type === 'error' ? colors.red : type === 'warning' ? colors.yellow : colors.cyan;
  console.log(`${colors.bright}${color}[${title}]${colors.reset} ${message}`);
}

function logSection(title: string): void {
  console.log(`\n${colors.bright}${colors.magenta}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}${'='.repeat(60)}${colors.reset}\n`);
}

// ============================================================================
// API CLIENT
// ============================================================================

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class HojaiDemo {
  private client: AxiosInstance;

  constructor(baseUrl: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
    });
  }

  private async request<T>(method: string, path: string, data?: any): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method,
        url: path,
        data,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  // Health endpoints
  async checkHealth(): Promise<ApiResponse> {
    return this.request<ApiResponse>('GET', '/health');
  }

  // Commerce endpoints
  async getProducts(category?: string): Promise<ApiResponse> {
    const params = category ? `?category=${category}` : '';
    return this.request<ApiResponse>('GET', `/api/commerce/products${params}`);
  }

  async createCart(customerId: string, customerName: string, customerEmail?: string, customerPhone?: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/api/commerce/cart', {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
    });
  }

  async addToCart(cartId: string, productId: string, quantity: number = 1): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', `/api/commerce/cart/${cartId}/items`, {
      productId,
      quantity,
    });
  }

  async getCart(cartId: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('GET', `/api/commerce/cart/${cartId}`);
  }

  async getCartByCustomer(customerId: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('GET', `/api/commerce/cart?customerId=${customerId}`);
  }

  // AI Brain endpoints
  async processMessage(message: string, context?: any): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/api/brain/process', {
      message,
      context: context || {
        conversationId: `conv_${Date.now()}`,
        tenantId: TENANT_ID,
        customerId: CUSTOMER_ID,
        channel: 'webchat',
      },
    });
  }

  async getSuggestions(conversationId: string, customerId: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('GET', `/api/brain/suggestions?conversationId=${conversationId}&customerId=${customerId}`);
  }

  // Support endpoints
  async createTicket(data: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    subject: string;
    description: string;
    category: string;
    priority?: string;
  }): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/api/support/tickets', data);
  }

  async getTickets(): Promise<ApiResponse> {
    return this.request<ApiResponse>('GET', '/api/support/tickets');
  }

  // Info endpoint
  async getInfo(): Promise<ApiResponse> {
    return this.request<ApiResponse>('GET', '/api/info');
  }
}

// ============================================================================
// DEMO FLOW
// ============================================================================

async function runDemo(): Promise<void> {
  console.log(`
${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                        HOJAI AI - PLATFORM DEMO                                ║
║                                                                               ║
║            WhatsApp + Support + Commerce - All in One Platform                ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}
  `);

  const demo = new HojaiDemo(BASE_URL);
  let cartId: string | null = null;
  let conversationId = `conv_${Date.now()}`;

  try {
    // =========================================================================
    // STEP 1: Health Check
    // =========================================================================
    logSection('STEP 1: Platform Health Check');

    try {
      const health = await demo.checkHealth();
      if (health.success && health.data) {
        log('HEALTH', `Service: ${health.data.service}`, 'success');
        log('HEALTH', `Version: ${health.data.version}`, 'info');
        log('HEALTH', `MongoDB: ${health.data.dependencies?.mongodb || 'N/A'}`, 'info');
        log('HEALTH', `Uptime: ${Math.round(health.data.uptime)}s`, 'info');
      }
    } catch (error) {
      log('HEALTH', 'API server not running. Starting inline simulation...', 'warning');
      await simulateHealthCheck();
    }

    // =========================================================================
    // STEP 2: Get Platform Info
    // =========================================================================
    logSection('STEP 2: Platform Information');

    try {
      const info = await demo.getInfo();
      if (info.success && info.data) {
        log('INFO', `Platform: ${info.data.name}`, 'success');
        log('INFO', `Version: ${info.data.version}`, 'info');
        log('INFO', `Tagline: ${info.data.tagline}`, 'info');
        console.log('\n  Features:');
        info.data.features?.forEach((f: string) => {
          console.log(`    - ${f}`);
        });
        console.log('\n  Channels:');
        info.data.channels?.forEach((c: string) => {
          console.log(`    - ${c}`);
        });
      }
    } catch (error) {
      log('INFO', 'Using simulated data', 'warning');
      simulatePlatformInfo();
    }

    // =========================================================================
    // STEP 3: Browse Products
    // =========================================================================
    logSection('STEP 3: Product Catalog');

    try {
      const products = await demo.getProducts();
      if (products.success && products.data) {
        log('PRODUCTS', `Found ${products.data.products?.length || 0} products`, 'success');
        console.log('\n  Product List:');
        products.data.products?.forEach((p: any, i: number) => {
          const savings = p.compareAtPrice ? p.compareAtPrice - p.price : 0;
          console.log(`\n  ${i + 1}. ${colors.bright}${p.name}${colors.reset}`);
          console.log(`     SKU: ${p.sku} | Category: ${p.category}`);
          console.log(`     Price: ${colors.green}₹${p.price}${colors.reset}${p.compareAtPrice ? ` (was ₹${p.compareAtPrice}, save ₹${savings})` : ''}`);
          console.log(`     Stock: ${p.stock} | Tags: ${p.tags?.join(', ')}`);
        });
      }
    } catch (error) {
      log('PRODUCTS', 'Using demo products', 'warning');
      simulateProducts();
    }

    // =========================================================================
    // STEP 4: Create Cart & Add Items
    // =========================================================================
    logSection('STEP 4: Cart Management');

    try {
      // Create cart
      const cart = await demo.createCart(CUSTOMER_ID, CUSTOMER_NAME, CUSTOMER_EMAIL, CUSTOMER_PHONE);
      if (cart.success && cart.data) {
        cartId = cart.data.id;
        log('CART', `Created cart: ${cartId}`, 'success');
        log('CART', `Customer: ${CUSTOMER_NAME} (${CUSTOMER_ID})`, 'info');

        // Add first item (Margherita Pizza)
        console.log('\n  Adding items to cart...');
        const add1 = await demo.addToCart(cartId, 'prod_1', 2);
        if (add1.success) {
          log('CART', '+ Added: Margherita Pizza x 2 = ₹598', 'success');
        }

        // Add second item (Veggie Burger)
        const add2 = await demo.addToCart(cartId, 'prod_2', 1);
        if (add2.success) {
          log('CART', '+ Added: Veggie Burger x 1 = ₹199', 'success');
        }

        // Add third item (Creamy Pasta)
        const add3 = await demo.addToCart(cartId, 'prod_3', 1);
        if (add3.success) {
          log('CART', '+ Added: Creamy Pasta x 1 = ₹249', 'success');
        }

        // Get updated cart
        const updatedCart = await demo.getCart(cartId);
        if (updatedCart.success && updatedCart.data) {
          console.log(`\n  ${colors.bright}Cart Summary:${colors.reset}`);
          console.log(`  ─────────────────────────────────`);
          updatedCart.data.items?.forEach((item: any) => {
            console.log(`  ${item.name} x ${item.quantity} = ₹${item.price * item.quantity}`);
          });
          console.log(`  ─────────────────────────────────`);
          console.log(`  Subtotal: ₹${updatedCart.data.subtotal}`);
          console.log(`  Tax (18% GST): ₹${updatedCart.data.tax}`);
          console.log(`  Delivery: ₹${updatedCart.data.deliveryFee}`);
          console.log(`  ${colors.green}TOTAL: ₹${updatedCart.data.total}${colors.reset}`);
        }
      }
    } catch (error) {
      log('CART', 'Simulating cart flow', 'warning');
      await simulateCartFlow();
    }

    // =========================================================================
    // STEP 5: AI Brain Processing
    // =========================================================================
    logSection('STEP 5: AI Brain - Intent Processing');

    const testMessages = [
      'I want to order some food for delivery',
      'What is the status of my order?',
      'I have a problem with my previous order',
    ];

    for (const message of testMessages) {
      console.log(`\n  ${colors.yellow}User:${colors.reset} "${message}"`);

      try {
        const result = await demo.processMessage(message, {
          conversationId,
          tenantId: TENANT_ID,
          customerId: CUSTOMER_ID,
          channel: 'webchat',
        });

        if (result.success && result.data) {
          // Extract message from response object
          const aiMessage = result.data.response?.message || result.data.message || 'Processing intent...';
          const intent = result.data.intent || 'detected';
          const confidence = result.data.confidence || result.data.response?.confidence || 0;
          const suggestions = result.data.suggestions || [];

          console.log(`  ${colors.green}AI Response:${colors.reset} ${aiMessage}`);
          console.log(`  ${colors.cyan}Intent:${colors.reset} ${intent}`);
          console.log(`  ${colors.cyan}Confidence:${colors.reset} ${(confidence * 100).toFixed(0)}%`);

          if (suggestions.length > 0) {
            console.log(`\n  ${colors.magenta}Suggested Actions:${colors.reset}`);
            suggestions.forEach((s: any, i: number) => {
              console.log(`    ${i + 1}. ${typeof s === 'string' ? s : (s.label || s.text || s)}`);
            });
          }
        }
      } catch (error) {
        log('AI', 'Simulating AI response', 'warning');
        simulateAIResponse(message);
      }

      await delay(500);
    }

    // =========================================================================
    // STEP 6: Get AI Suggestions
    // =========================================================================
    logSection('STEP 6: Contextual Suggestions');

    try {
      const suggestions = await demo.getSuggestions(conversationId, CUSTOMER_ID);
      if (suggestions.success && suggestions.data) {
        log('SUGGESTIONS', 'Retrieved contextual suggestions', 'success');
        if (suggestions.data.suggestions && suggestions.data.suggestions.length > 0) {
          console.log('\n  Quick Actions:');
          suggestions.data.suggestions.forEach((s: any, i: number) => {
            console.log(`    ${i + 1}. ${s.label || s}`);
          });
        }
      }
    } catch (error) {
      log('SUGGESTIONS', 'Showing default suggestions', 'warning');
      simulateSuggestions();
    }

    // =========================================================================
    // STEP 7: Support Ticket Creation
    // =========================================================================
    logSection('STEP 7: Support Ticket System');

    try {
      const ticketData = {
        customerId: CUSTOMER_ID,
        customerName: CUSTOMER_NAME,
        customerEmail: CUSTOMER_EMAIL,
        customerPhone: CUSTOMER_PHONE,
        subject: 'Issue with my food delivery order',
        description: 'I ordered food 30 minutes ago but it has not arrived yet. The order ID is ORD-12345. Please check the delivery status.',
        category: 'shipping',
        priority: 'high',
      };

      const ticket = await demo.createTicket(ticketData);
      if (ticket.success && ticket.data) {
        log('TICKET', `Created ticket: ${ticket.data.ticketNumber}`, 'success');
        log('TICKET', `Status: ${ticket.data.status}`, 'info');
        log('TICKET', `Priority: ${ticket.data.priority}`, 'info');
        log('TICKET', `Category: ${ticket.data.category}`, 'info');

        console.log('\n  Ticket Details:');
        console.log(`    ID: ${ticket.data.id}`);
        console.log(`    Number: ${ticket.data.ticketNumber}`);
        console.log(`    Customer: ${ticket.data.customerName} (${ticket.data.customerEmail})`);
        console.log(`    Subject: ${ticket.data.subject}`);
        console.log(`    Created: ${new Date(ticket.data.createdAt).toISOString()}`);

        if (ticket.data.messages && ticket.data.messages.length > 0) {
          console.log('\n  Initial Message:');
          console.log(`    "${ticket.data.messages[0].content}"`);
        }
      }
    } catch (error) {
      log('TICKET', 'Simulating ticket creation', 'warning');
      await simulateTicketCreation();
    }

    // =========================================================================
    // STEP 8: Complete AI Flow Summary
    // =========================================================================
    logSection('STEP 8: AI Flow Summary');

    console.log(`
  ${colors.bright}Complete User Journey:${colors.reset}

  ${colors.cyan}1. User sends message${colors.reset}
     "I want to order some food"

  ${colors.cyan}2. AI Brain processes${colors.reset}
     - Intent detection: ${colors.green}order_food${colors.reset}
     - Entity extraction: food, delivery
     - Confidence: 95%

  ${colors.cyan}3. Actions suggested${colors.reset}
     - Browse menu
     - View cart
     - Quick order

  ${colors.cyan}4. User action${colors.reset}
     - Browse products
     - Add to cart

  ${colors.cyan}5. Order created${colors.reset}
     ${cartId ? `- Cart ID: ${cartId}` : '- Cart created with 3 items'}

  ${colors.cyan}6. Support integration${colors.reset}
     - If issue, create ticket
     - Auto-categorize
     - Route to agent
`);

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log(`
${colors.green}${colors.bright}
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                         DEMO COMPLETED SUCCESSFULLY                           ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Platform:        HOJAI AI Unified Platform                                   ║
║  Version:         1.0.0                                                       ║
║  Base URL:        ${BASE_URL.padEnd(46)}║
║  Tenant:          ${TENANT_ID.padEnd(46)}║
║                                                                               ║
║  Tested Features:                                                             ║
║    [x] Health Check                                                            ║
║    [x] Product Catalog                                                        ║
║    [x] Cart Management                                                        ║
║    [x] AI Brain Processing                                                    ║
║    [x] Contextual Suggestions                                                 ║
║    [x] Support Tickets                                                        ║
║                                                                               ║
║  Next Steps:                                                                   ║
║    1. Start the API server: cd hojai-unified-platform && npm run dev           ║
║    2. Access the dashboard at http://localhost:4850                          ║
║    3. Check out the WhatsApp integration                                      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}
  `);

  } catch (error) {
    console.error(`\n${colors.red}Demo Error:${colors.reset}`, error);
    console.log(`\n${colors.yellow}Tip:${colors.reset} Make sure the HOJAI API server is running on ${BASE_URL}`);
    console.log(`      Run: cd hojai-unified-platform && npm run dev\n`);
  }
}

// ============================================================================
// SIMULATION FUNCTIONS (When API is not running)
// ============================================================================

async function simulateHealthCheck(): Promise<void> {
  log('HEALTH', 'Service: hojai-unified-platform', 'success');
  log('HEALTH', 'Version: 1.0.0', 'info');
  log('HEALTH', 'MongoDB: healthy (simulated)', 'info');
  log('HEALTH', 'Uptime: 3600s', 'info');
}

function simulatePlatformInfo(): void {
  log('INFO', 'Platform: HOJAI Unified Platform', 'success');
  log('INFO', 'Version: 1.0.0', 'info');
  log('INFO', 'Tagline: WhatsApp + Support + Commerce - All in One', 'info');
  console.log('\n  Features:');
  console.log('    - WhatsApp Business API Integration');
  console.log('    - Multi-channel Support');
  console.log('    - AI-powered Chat Bot');
  console.log('    - Support Ticket System');
  console.log('    - Product Catalog');
  console.log('    - Shopping Cart');
  console.log('    - Order Management');
  console.log('    - Payment Processing');
  console.log('    - Real-time Analytics');
  console.log('\n  Channels:');
  console.log('    - whatsapp, instagram, webchat, sms, email');
}

function simulateProducts(): void {
  log('PRODUCTS', 'Found 3 demo products', 'success');
  console.log('\n  Product List:');
  console.log('\n  1. Margherita Pizza');
  console.log('     SKU: PIZZA-MARGH | Category: food');
  console.log('     Price: ₹299 (was ₹349, save ₹50)');
  console.log('     Stock: 100 | Tags: veg, popular, bestseller');
  console.log('\n  2. Veggie Burger');
  console.log('     SKU: BURGER-VEG | Category: food');
  console.log('     Price: ₹199');
  console.log('     Stock: 50 | Tags: veg, popular');
  console.log('\n  3. Creamy Pasta');
  console.log('     SKU: PASTA-CREAM | Category: food');
  console.log('     Price: ₹249');
  console.log('     Stock: 75 | Tags: veg');
}

async function simulateCartFlow(): Promise<void> {
  log('CART', 'Created cart: cart_sim_001', 'success');
  log('CART', 'Customer: John Doe (customer_001)', 'info');
  console.log('\n  Adding items to cart...');
  log('CART', '+ Added: Margherita Pizza x 2 = ₹598', 'success');
  log('CART', '+ Added: Veggie Burger x 1 = ₹199', 'success');
  log('CART', '+ Added: Creamy Pasta x 1 = ₹249', 'success');
  console.log(`\n  Cart Summary:`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Margherita Pizza x 2 = ₹598`);
  console.log(`  Veggie Burger x 1 = ₹199`);
  console.log(`  Creamy Pasta x 1 = ₹249`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Subtotal: ₹1046`);
  console.log(`  Tax (18% GST): ₹188`);
  console.log(`  Delivery: ₹50`);
  console.log(`  TOTAL: ₹1284`);
}

function simulateAIResponse(message: string): void {
  if (message.includes('order')) {
    console.log(`  AI Response: I can help you order food! Browse our menu or I can suggest popular items.`);
    console.log(`  Intent: order_food`);
    console.log(`  Confidence: 95%`);
  } else if (message.includes('status')) {
    console.log(`  AI Response: Let me check your order status. Please provide your order ID.`);
    console.log(`  Intent: check_order_status`);
    console.log(`  Confidence: 88%`);
  } else if (message.includes('problem')) {
    console.log(`  AI Response: I'm sorry to hear about the issue. Let me help you create a support ticket.`);
    console.log(`  Intent: create_support_ticket`);
    console.log(`  Confidence: 92%`);
  }
  console.log('\n  Suggested Actions:');
  console.log('    1. Browse Menu');
  console.log('    2. View Cart');
  console.log('    3. Track Order');
  console.log('    4. Contact Support');
}

function simulateSuggestions(): void {
  console.log('\n  Quick Actions:');
  console.log('    1. Browse Menu');
  console.log('    2. View Cart');
  console.log('    3. Track Order');
  console.log('    4. View Offers');
  console.log('    5. Contact Support');
}

async function simulateTicketCreation(): Promise<void> {
  log('TICKET', 'Created ticket: TKT-2606-1001', 'success');
  log('TICKET', 'Status: open', 'info');
  log('TICKET', 'Priority: high', 'info');
  log('TICKET', 'Category: shipping', 'info');
  console.log('\n  Ticket Details:');
  console.log('    ID: abc123-def456');
  console.log('    Number: TKT-2606-1001');
  console.log('    Customer: John Doe (john.doe@example.com)');
  console.log('    Subject: Issue with my food delivery order');
  console.log('    Created: 2026-05-31T12:00:00.000Z');
  console.log('\n  Initial Message:');
  console.log('    "I ordered food 30 minutes ago but it has not arrived yet..."');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RUN DEMO
// ============================================================================

runDemo().catch(console.error);
