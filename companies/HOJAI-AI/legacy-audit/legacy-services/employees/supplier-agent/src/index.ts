/**
 * Supplier Agent - Autonomous RFQ Response
 *
 * This agent:
 * 1. Receives RFQ notifications from Procurement Agent
 * 2. Evaluates RFQ requirements
 * 3. Generates quotes automatically
 * 4. Handles negotiation
 * 5. Manages contracts
 *
 * Part of the autonomous procurement ecosystem:
 * Procurement Agent → RFQ → Supplier Agent → Quote → Negotiation → Contract
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const app: Express = express();
const PORT = parseInt(process.env.PORT || '4850', 10);

// Service URLs
const SERVICES = {
  procurementAgent: process.env.PROCUREMENT_AGENT_URL || 'http://localhost:4786',
  nexha: process.env.NEXHA_URL || 'http://localhost:4320',
  sutar: process.env.SUTAR_URL || 'http://localhost:4518',
  payment: process.env.PAYMENT_URL || 'http://localhost:4001',
};

// Supplier Configuration
const SUPPLIER_CONFIG = {
  id: process.env.SUPPLIER_ID || 'sup-ac-1',
  name: process.env.SUPPLIER_NAME || 'CoolAir Solutions',
  categories: ['ac', 'hvac', 'maintenance', 'parts'],
  location: 'Bangalore',
  rating: 4.5,
  responseTime: '2h', // Average response time
  paymentTerms: 'Net 30',
  baseDiscount: 0.08,
  volumeDiscount: 0.15,
  loyaltyDiscount: 0.05,
};

// In-memory stores
const quotes: Map<string, any> = new Map();
const negotiations: Map<string, any> = new Map();
const contracts: Map<string, any> = new Map();
const rfqSubscriptions: Set<string> = new Set(['ac', 'hvac', 'parts', 'maintenance']);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  res.setHeader('X-Request-ID', requestId);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${requestId}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'supplier-agent',
    supplierId: SUPPLIER_CONFIG.id,
    supplierName: SUPPLIER_CONFIG.name,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// RFQ HANDLING
// ============================================================================

/**
 * POST /api/rfq/receive
 * Receive an RFQ from Procurement Agent
 *
 * This is the entry point for autonomous RFQ handling
 */
app.post('/api/rfq/receive', async (req: Request, res: Response) => {
  try {
    const { rfqId, item, quantity, category, deadline, buyerId, buyerName } = req.body;

    console.log(`[RFQ RECEIVED] ${rfqId}: ${quantity}x ${item}`);

    // Validate RFQ
    if (!rfqId || !item || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: rfqId, item, quantity'
      });
    }

    // Check if we can fulfill this category
    if (!SUPPLIER_CONFIG.categories.includes(category)) {
      return res.json({
        success: true,
        canFulfill: false,
        reason: `We don't supply ${category} items`
      });
    }

    // Generate quote automatically
    const quote = await generateQuote(rfqId, item, quantity, category, buyerId);

    // Store quote
    quotes.set(rfqId, quote);

    // Send quote back to procurement agent
    await sendQuoteToProcurement(rfqId, quote);

    res.json({
      success: true,
      rfqId,
      quoteId: quote.quoteId,
      status: 'quote_sent',
      expectedResponseTime: SUPPLIER_CONFIG.responseTime
    });
  } catch (error) {
    console.error('RFQ receive error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process RFQ'
    });
  }
});

/**
 * POST /api/rfq/auto-respond
 * Automatically respond to RFQ (simulates event-driven response)
 *
 * In production, this would be triggered by a message queue or webhook
 */
app.post('/api/rfq/auto-respond', async (req: Request, res: Response) => {
  try {
    const { rfqId, item, quantity, category, price Ceiling } = req.body;

    // Generate competitive quote
    const quote = await generateQuote(rfqId, item, quantity, category, 'auto-procurement');

    quotes.set(rfqId, quote);

    res.json({
      success: true,
      message: 'Quote generated and sent',
      quote: {
        quoteId: quote.quoteId,
        price: quote.unitPrice,
        total: quote.totalPrice,
        deliveryDate: quote.deliveryDate
      }
    });
  } catch (error) {
    console.error('Auto-respond error:', error);
    res.status(500).json({ success: false, error: 'Auto-response failed' });
  }
});

// ============================================================================
// QUOTE MANAGEMENT
// ============================================================================

/**
 * GET /api/quotes/:quoteId
 * Get quote details
 */
app.get('/api/quotes/:quoteId', (req: Request, res: Response) => {
  const { quoteId } = req.params;

  for (const [rfqId, quote] of quotes.entries()) {
    if (quote.quoteId === quoteId) {
      return res.json({ success: true, data: quote });
    }
  }

  res.status(404).json({
    success: false,
    error: 'Quote not found'
  });
});

/**
 * GET /api/quotes
 * List all quotes
 */
app.get('/api/quotes', (req: Request, res: Response) => {
  const allQuotes = Array.from(quotes.values());
  res.json({
    success: true,
    count: allQuotes.length,
    data: allQuotes
  });
});

/**
 * PUT /api/quotes/:quoteId/accept
 * Accept a quote
 */
app.put('/api/quotes/:quoteId/accept', async (req: Request, res: Response) => {
  try {
    const { quoteId } = req.params;
    const { buyerId, terms } = req.body;

    let quote = null;
    let rfqId = null;

    for (const [rfq, q] of quotes.entries()) {
      if (q.quoteId === quoteId) {
        quote = q;
        rfqId = rfq;
        break;
      }
    }

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    // Generate contract
    const contract = await generateContract(quote, buyerId, terms);

    // Notify procurement
    await notifyContractGenerated(contract);

    res.json({
      success: true,
      message: 'Quote accepted, contract generated',
      contract
    });
  } catch (error) {
    console.error('Accept quote error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept quote' });
  }
});

// ============================================================================
// NEGOTIATION
// ============================================================================

/**
 * POST /api/negotiate
 * Handle negotiation request
 */
app.post('/api/negotiate', async (req: Request, res: Response) => {
  try {
    const { rfqId, counterPrice, currentPrice, message, round } = req.body;

    console.log(`[NEGOTIATION] ${rfqId}: Counter at ₹${counterPrice}`);

    // Get original quote
    const originalQuote = quotes.get(rfqId);
    if (!originalQuote) {
      return res.status(404).json({ success: false, error: 'RFQ not found' });
    }

    // Calculate counter offer
    const negotiation = await handleNegotiation(rfqId, originalQuote, counterPrice, currentPrice, round);

    // Store negotiation
    negotiations.set(rfqId, negotiation);

    res.json({
      success: true,
      negotiation: {
        id: negotiation.id,
        round: negotiation.currentRound,
        ourPrice: negotiation.ourPrice,
        theirPrice: counterPrice,
        status: negotiation.status,
        message: negotiation.message,
        canAccept: negotiation.canAccept
      }
    });
  } catch (error) {
    console.error('Negotiation error:', error);
    res.status(500).json({ success: false, error: 'Negotiation failed' });
  }
});

/**
 * GET /api/negotiations/:rfqId
 * Get negotiation status
 */
app.get('/api/negotiations/:rfqId', (req: Request, res: Response) => {
  const { rfqId } = req.params;
  const negotiation = negotiations.get(rfqId);

  if (!negotiation) {
    return res.status(404).json({ success: false, error: 'Negotiation not found' });
  }

  res.json({ success: true, data: negotiation });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a quote based on RFQ
 */
async function generateQuote(
  rfqId: string,
  item: string,
  quantity: number,
  category: string,
  buyerId: string
): Promise<any> {
  // Calculate base price (in production, this would query inventory/pricing)
  const basePrice = getBasePrice(item, category);
  const unitPrice = basePrice;

  // Apply volume discount
  const volumeDiscount = quantity >= 100 ? SUPPLIER_CONFIG.volumeDiscount :
                          quantity >= 50 ? 0.10 :
                          quantity >= 20 ? 0.05 : 0;

  // Calculate final price
  const discountAmount = unitPrice * quantity * volumeDiscount;
  const totalPrice = (unitPrice * quantity) - discountAmount;

  // Calculate delivery date (3-7 days based on quantity)
  const deliveryDays = quantity > 100 ? 7 : quantity > 50 ? 5 : 3;
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

  const quote = {
    quoteId: `QUOTE-${Date.now()}`,
    rfqId,
    supplierId: SUPPLIER_CONFIG.id,
    supplierName: SUPPLIER_CONFIG.name,
    item,
    quantity,
    category,
    unitPrice,
    volumeDiscount,
    discountAmount,
    totalPrice,
    currency: 'INR',
    deliveryDate: deliveryDate.toISOString(),
    deliveryTerms: 'CIF',
    paymentTerms: SUPPLIER_CONFIG.paymentTerms,
    validity: '7 days',
    specifications: getSpecifications(item, category),
    warranty: '12 months standard',
    createdAt: new Date().toISOString(),
    status: 'sent'
  };

  console.log(`[QUOTE GENERATED] ${quote.quoteId}: ₹${totalPrice} for ${quantity}x ${item}`);

  return quote;
}

/**
 * Get base price for item
 */
function getBasePrice(item: string, category: string): number {
  const prices: Record<string, number> = {
    // AC related
    'ac unit': 25000,
    'ac repair': 5000,
    'ac filter': 800,
    'ac gas refill': 2500,
    'ac compressor': 12000,
    // HVAC
    'hvac service': 15000,
    'duct cleaning': 8000,
    // Maintenance
    'maintenance service': 10000,
    'repair service': 5000,
    // General parts
    'parts': 1000,
    'supplies': 500,
  };

  const itemLower = item.toLowerCase();
  for (const [key, price] of Object.entries(prices)) {
    if (itemLower.includes(key)) {
      return price;
    }
  }

  return 5000; // Default price
}

/**
 * Get specifications for item
 */
function getSpecifications(item: string, category: string): any {
  return {
    brand: 'Premium',
    model: 'Standard Commercial',
    capacity: 'As required',
    energyRating: '5 Star',
    warranty: '12 months',
    certification: 'ISO 9001',
    compliance: 'BIS certified'
  };
}

/**
 * Send quote to procurement agent
 */
async function sendQuoteToProcurement(rfqId: string, quote: any): Promise<void> {
  try {
    await axios.post(`${SERVICES.procurementAgent}/api/quotes/receive`, {
      rfqId,
      quote: {
        quoteId: quote.quoteId,
        supplierId: quote.supplierId,
        supplierName: quote.supplierName,
        unitPrice: quote.unitPrice,
        totalPrice: quote.totalPrice,
        deliveryDate: quote.deliveryDate,
        paymentTerms: quote.paymentTerms,
        validity: quote.validity
      }
    });
    console.log(`[QUOTE SENT] ${quote.quoteId} to Procurement Agent`);
  } catch (error) {
    console.error('Failed to send quote to procurement:', error);
  }
}

/**
 * Handle negotiation
 */
async function handleNegotiation(
  rfqId: string,
  originalQuote: any,
  counterPrice: number,
  currentPrice: number,
  round: number
): Promise<any> {
  const maxRounds = 5;
  const targetDiscount = SUPPLIER_CONFIG.baseDiscount;

  // Calculate our acceptable range
  const minAcceptablePrice = originalQuote.unitPrice * (1 - targetDiscount - 0.05);
  const idealPrice = originalQuote.unitPrice * (1 - targetDiscount / 2);

  let status = 'negotiating';
  let message = '';
  let ourPrice = originalQuote.unitPrice * (1 - targetDiscount / (round + 1));
  let canAccept = false;

  // If counter is within acceptable range, accept
  if (counterPrice >= minAcceptablePrice) {
    status = 'accepted';
    message = 'Price accepted! Order confirmed.';
    ourPrice = counterPrice;
    canAccept = true;
  }
  // If we've reached max rounds, make final offer
  else if (round >= maxRounds - 1) {
    status = 'final_offer';
    ourPrice = (minAcceptablePrice + counterPrice) / 2;
    message = 'Final offer. Accept to proceed.';
    canAccept = true;
  }
  // Counter offer
  else {
    const reduction = Math.min(0.03, (idealPrice - counterPrice) / currentPrice);
    ourPrice = currentPrice * (1 - reduction);
    message = `Counter offer: ₹${ourPrice.toFixed(2)} per unit. Volume discount may apply.`;
  }

  return {
    id: `NEG-${Date.now()}`,
    rfqId,
    quoteId: originalQuote.quoteId,
    currentRound: round + 1,
    maxRounds,
    ourPrice,
    theirLastPrice: counterPrice,
    status,
    message,
    canAccept,
    minAcceptablePrice,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Generate contract
 */
async function generateContract(quote: any, buyerId: string, terms: any): Promise<any> {
  const contractId = `CONTRACT-${Date.now()}`;

  const contract = {
    contractId,
    quoteId: quote.quoteId,
    rfqId: quote.rfqId,
    supplierId: SUPPLIER_CONFIG.id,
    supplierName: SUPPLIER_CONFIG.name,
    buyerId,
    item: quote.item,
    quantity: quote.quantity,
    unitPrice: quote.unitPrice,
    totalPrice: quote.totalPrice,
    currency: 'INR',
    deliveryDate: quote.deliveryDate,
    paymentTerms: terms?.paymentTerms || quote.paymentTerms,
    status: 'generated',
    terms: {
      delivery: 'Within specified date',
      warranty: quote.warranty,
      returnPolicy: '14 days',
      disputeResolution: 'Arbitration'
    },
    createdAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  contracts.set(contractId, contract);

  console.log(`[CONTRACT GENERATED] ${contractId}: ₹${totalPrice}`);

  return contract;
}

/**
 * Notify contract generated
 */
async function notifyContractGenerated(contract: any): Promise<void> {
  try {
    await axios.post(`${SERVICES.procurementAgent}/api/contracts/notification`, {
      contractId: contract.contractId,
      status: 'generated',
      supplierName: contract.supplierName,
      totalPrice: contract.totalPrice
    });

    // Also notify SUTAR for trust validation
    await axios.post(`${SERVICES.sutar}/api/contracts/validate`, {
      contractId: contract.contractId,
      parties: [contract.supplierId, contract.buyerId],
      value: contract.totalPrice
    });

    console.log(`[CONTRACT NOTIFIED] ${contract.contractId}`);
  } catch (error) {
    console.error('Failed to notify contract:', error);
  }
}

// ============================================================================
// SUPPLIER MANAGEMENT
// ============================================================================

/**
 * GET /api/supplier/profile
 * Get supplier profile
 */
app.get('/api/supplier/profile', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      ...SUPPLIER_CONFIG,
      activeQuotes: quotes.size,
      activeNegotiations: negotiations.size,
      totalContracts: contracts.size
    }
  });
});

/**
 * PUT /api/supplier/categories
 * Update supplier categories
 */
app.put('/api/supplier/categories', (req: Request, res: Response) => {
  const { categories } = req.body;

  if (Array.isArray(categories)) {
    SUPPLIER_CONFIG.categories = categories;
    res.json({
      success: true,
      message: 'Categories updated',
      categories: SUPPLIER_CONFIG.categories
    });
  } else {
    res.status(400).json({ success: false, error: 'Categories must be an array' });
  }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   📦 Supplier Agent                                           ║
║                                                                ║
║   Server running on port ${PORT}                               ║
║                                                                ║
║   Supplier: ${SUPPLIER_CONFIG.name}                             ║
║   ID: ${SUPPLIER_CONFIG.id}                                         ║
║                                                                ║
║   Categories: ${SUPPLIER_CONFIG.categories.join(', ')}        ║
║                                                                ║
║   Connected to:                                                ║
║   • Procurement Agent: ${SERVICES.procurementAgent}  ║
║   • Nexha: ${SERVICES.nexha}                             ║
║   • SUTAR: ${SERVICES.sutar}                                 ║
║                                                                ║
║   Features:                                                    ║
║   • Autonomous RFQ response                                    ║
║   • Auto quote generation                                      ║
║   • Negotiation handling                                       ║
║   • Contract generation                                       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
