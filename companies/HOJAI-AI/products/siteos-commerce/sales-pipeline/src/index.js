import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 5485;
const TAX_RATE = 0.18; // 18% GST
const COMMISSION_BASE = 0.05; // 5% base commission

// Pipeline stages configuration
export const PIPELINE_STAGES = [
  { id: 'lead', name: 'Lead', probability: 10, color: '#94A3B8' },
  { id: 'qualified', name: 'Qualified', probability: 25, color: '#3B82F6' },
  { id: 'proposal', name: 'Proposal Sent', probability: 50, color: '#F59E0B' },
  { id: 'negotiation', name: 'Negotiation', probability: 75, color: '#8B5CF6' },
  { id: 'won', name: 'Won', probability: 100, color: '#22C55E' },
  { id: 'lost', name: 'Lost', probability: 0, color: '#EF4444' }
];

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Authentication Middleware
const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  if (apiKey.length < 16) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  req.apiKey = apiKey;
  next();
};

// Helper: Get storage path for a company
const getStoragePath = (companyId) => {
  return `/tmp/siteos-sales-${companyId}.json`;
};

// Helper: Read data from file
const readData = async (companyId) => {
  try {
    const data = await fs.readFile(getStoragePath(companyId), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { deals: {}, quotes: {}, products: {}, quoteCounter: 0 };
    }
    throw error;
  }
};

// Helper: Write data to file
const writeData = async (companyId, data) => {
  await fs.writeFile(getStoragePath(companyId), JSON.stringify(data, null, 2));
};

// Helper: Calculate commission based on deal value
export const calculateCommission = (dealValue) => {
  if (dealValue >= 100000) return dealValue * 0.12;
  if (dealValue >= 50000) return dealValue * 0.10;
  if (dealValue >= 10000) return dealValue * 0.07;
  return dealValue * COMMISSION_BASE;
};

// Helper: Calculate quote totals
const calculateQuoteTotals = (items) => {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  items.forEach(item => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const discountAmount = lineSubtotal * (item.discount / 100);
    const taxableAmount = lineSubtotal - discountAmount;
    const taxAmount = taxableAmount * (item.tax / 100);

    item.total = Math.round((taxableAmount + taxAmount) * 100) / 100;
    subtotal += lineSubtotal;
    discountTotal += discountAmount;
    taxTotal += taxAmount;
  });

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total: Math.round((subtotal - discountTotal + taxTotal) * 100) / 100
  };
};

// Helper: Get stage config
const getStageConfig = (stageId) => {
  return PIPELINE_STAGES.find(s => s.id === stageId) || PIPELINE_STAGES[0];
};

// Helper: Generate quote number
const generateQuoteNumber = (counter) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(counter + 1).padStart(4, '0');
  return `QT-${year}${month}-${seq}`;
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sales-pipeline', port: PORT });
});

// ============================================
// PIPELINE ENDPOINTS
// ============================================

// Get pipeline view (grouped by stage)
app.get('/api/pipeline', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);

    const pipeline = {};
    PIPELINE_STAGES.forEach(stage => {
      pipeline[stage.id] = {
        ...stage,
        deals: []
      };
    });

    Object.values(data.deals).forEach(deal => {
      if (pipeline[deal.stage]) {
        pipeline[deal.stage].deals.push(deal);
      }
    });

    // Calculate summary stats
    let totalValue = 0;
    let totalWeightedValue = 0;
    let dealCount = 0;

    Object.values(data.deals).forEach(deal => {
      if (deal.stage !== 'won' && deal.stage !== 'lost') {
        totalValue += deal.value;
        totalWeightedValue += deal.value * (deal.probability / 100);
        dealCount++;
      }
    });

    res.json({
      stages: pipeline,
      summary: {
        totalValue,
        totalWeightedValue: Math.round(totalWeightedValue * 100) / 100,
        dealCount,
        avgDealSize: dealCount > 0 ? Math.round(totalValue / dealCount * 100) / 100 : 0
      }
    });
  } catch (error) {
    console.error('Error getting pipeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DEAL ENDPOINTS
// ============================================

// Create deal
app.post('/api/deals', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const {
      title,
      description,
      value,
      currency = 'INR',
      stage = 'lead',
      contactId,
      contactName,
      contactEmail,
      owner,
      products = [],
      expectedCloseDate
    } = req.body;

    // Validation
    if (!title || value === undefined || !contactName) {
      return res.status(400).json({ error: 'Missing required fields: title, value, contactName' });
    }
    if (value < 0) {
      return res.status(400).json({ error: 'Value cannot be negative' });
    }
    if (!['INR', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency. Must be INR or USD' });
    }
    if (!PIPELINE_STAGES.find(s => s.id === stage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    const stageConfig = getStageConfig(stage);
    const dealId = uuidv4();

    const deal = {
      dealId,
      companyId,
      title,
      description: description || '',
      value,
      currency,
      stage,
      probability: stageConfig.probability,
      contactId: contactId || null,
      contactName,
      contactEmail: contactEmail || null,
      owner: owner || 'system',
      products: products.map(p => ({
        productId: p.productId || uuidv4(),
        name: p.name,
        quantity: p.quantity || 1,
        unitPrice: p.unitPrice || 0,
        discount: p.discount || 0
      })),
      expectedCloseDate: expectedCloseDate || null,
      actualCloseDate: null,
      lostReason: null,
      notes: [],
      activities: [{
        type: 'created',
        description: 'Deal created',
        timestamp: new Date().toISOString()
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const data = await readData(companyId);
    data.deals[dealId] = deal;
    await writeData(companyId, data);

    res.status(201).json(deal);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List deals
app.get('/api/deals', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const { stage, owner, minValue, maxValue } = req.query;

    const data = await readData(companyId);
    let deals = Object.values(data.deals);

    // Filters
    if (stage) {
      deals = deals.filter(d => d.stage === stage);
    }
    if (owner) {
      deals = deals.filter(d => d.owner === owner);
    }
    if (minValue) {
      deals = deals.filter(d => d.value >= parseFloat(minValue));
    }
    if (maxValue) {
      deals = deals.filter(d => d.value <= parseFloat(maxValue));
    }

    // Sort by updatedAt desc
    deals.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ deals, count: deals.length });
  } catch (error) {
    console.error('Error listing deals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get deal
app.get('/api/deals/:id', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);
    const deal = data.deals[req.params.id];

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    console.error('Error getting deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update deal
app.put('/api/deals/:id', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);
    const deal = data.deals[req.params.id];

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const allowedFields = ['title', 'description', 'value', 'currency', 'contactId', 'contactName', 'contactEmail', 'owner', 'products', 'expectedCloseDate', 'notes'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(deal, updates);
    deal.updatedAt = new Date().toISOString();

    // Add activity
    deal.activities.push({
      type: 'updated',
      description: 'Deal updated',
      timestamp: deal.updatedAt
    });

    data.deals[req.params.id] = deal;
    await writeData(companyId, data);

    res.json(deal);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Move deal to stage
app.put('/api/deals/:id/stage', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const { stage } = req.body;

    if (!stage || !PIPELINE_STAGES.find(s => s.id === stage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    const data = await readData(companyId);
    const deal = data.deals[req.params.id];

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const oldStage = deal.stage;
    const stageConfig = getStageConfig(stage);

    deal.stage = stage;
    deal.probability = stageConfig.probability;
    deal.updatedAt = new Date().toISOString();

    // Add activity
    deal.activities.push({
      type: 'stage_change',
      description: `Moved from ${getStageConfig(oldStage).name} to ${stageConfig.name}`,
      timestamp: deal.updatedAt
    });

    // If moving to won/lost, set actualCloseDate
    if (stage === 'won' || stage === 'lost') {
      deal.actualCloseDate = deal.updatedAt;
    }

    data.deals[req.params.id] = deal;
    await writeData(companyId, data);

    res.json(deal);
  } catch (error) {
    console.error('Error moving deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close deal (won/lost)
app.put('/api/deals/:id/close', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const { status, lostReason } = req.body;

    if (!['won', 'lost'].includes(status)) {
      return res.status(400).json({ error: 'Status must be won or lost' });
    }

    const data = await readData(companyId);
    const deal = data.deals[req.params.id];

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const now = new Date().toISOString();
    deal.stage = status;
    deal.probability = status === 'won' ? 100 : 0;
    deal.actualCloseDate = now;
    deal.updatedAt = now;

    if (status === 'lost' && lostReason) {
      deal.lostReason = lostReason;
    }

    // Add activity
    deal.activities.push({
      type: status === 'won' ? 'won' : 'lost',
      description: status === 'won' ? 'Deal won!' : `Deal lost: ${lostReason || 'No reason provided'}`,
      timestamp: now
    });

    // Calculate commission if won
    if (status === 'won') {
      deal.commission = calculateCommission(deal.value);
    }

    data.deals[req.params.id] = deal;
    await writeData(companyId, data);

    res.json(deal);
  } catch (error) {
    console.error('Error closing deal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// QUOTE ENDPOINTS
// ============================================

// Create quote
app.post('/api/quotes', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const {
      dealId,
      contactId,
      contactName,
      contactEmail,
      items,
      validUntil,
      terms
    } = req.body;

    // Validation
    if (!contactName || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: contactName, items' });
    }

    const quoteId = uuidv4();
    const data = await readData(companyId);
    const quoteNumber = generateQuoteNumber(data.quoteCounter || 0);

    // Calculate totals
    const calculatedItems = items.map(item => ({
      productId: item.productId || null,
      name: item.name,
      description: item.description || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      discount: item.discount || 0,
      tax: item.tax || TAX_RATE * 100
    }));

    const totals = calculateQuoteTotals(calculatedItems);

    const quote = {
      quoteId,
      companyId,
      quoteNumber,
      dealId: dealId || null,
      contactId: contactId || null,
      contactName,
      contactEmail: contactEmail || null,
      items: calculatedItems,
      ...totals,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      terms: terms || 'Payment due within 30 days of invoice date.',
      status: 'draft',
      sentAt: null,
      respondedAt: null,
      createdAt: new Date().toISOString()
    };

    data.quotes[quoteId] = quote;
    data.quoteCounter = (data.quoteCounter || 0) + 1;
    await writeData(companyId, data);

    res.status(201).json(quote);
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List quotes
app.get('/api/quotes', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const { status, dealId, contactId } = req.query;

    const data = await readData(companyId);
    let quotes = Object.values(data.quotes);

    // Filters
    if (status) {
      quotes = quotes.filter(q => q.status === status);
    }
    if (dealId) {
      quotes = quotes.filter(q => q.dealId === dealId);
    }
    if (contactId) {
      quotes = quotes.filter(q => q.contactId === contactId);
    }

    // Sort by createdAt desc
    quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ quotes, count: quotes.length });
  } catch (error) {
    console.error('Error listing quotes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get quote
app.get('/api/quotes/:id', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);
    const quote = data.quotes[req.params.id];

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json(quote);
  } catch (error) {
    console.error('Error getting quote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update quote
app.put('/api/quotes/:id', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);
    const quote = data.quotes[req.params.id];

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quote.status !== 'draft') {
      return res.status(400).json({ error: 'Can only update draft quotes' });
    }

    const allowedFields = ['contactName', 'contactEmail', 'items', 'validUntil', 'terms'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        quote[field] = req.body[field];
      }
    });

    // Recalculate totals if items changed
    if (req.body.items) {
      const totals = calculateQuoteTotals(quote.items);
      Object.assign(quote, totals);
    }

    data.quotes[req.params.id] = quote;
    await writeData(companyId, data);

    res.json(quote);
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send quote
app.post('/api/quotes/:id/send', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);
    const quote = data.quotes[req.params.id];

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quote.status !== 'draft') {
      return res.status(400).json({ error: 'Can only send draft quotes' });
    }

    const now = new Date().toISOString();
    quote.status = 'sent';
    quote.sentAt = now;

    data.quotes[req.params.id] = quote;
    await writeData(companyId, data);

    res.json({ message: 'Quote sent successfully', quote });
  } catch (error) {
    console.error('Error sending quote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept quote
app.post('/api/quotes/:id/accept', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);
    const quote = data.quotes[req.params.id];

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (!['sent', 'viewed'].includes(quote.status)) {
      return res.status(400).json({ error: 'Quote must be sent or viewed before accepting' });
    }

    const now = new Date().toISOString();
    quote.status = 'accepted';
    quote.respondedAt = now;

    data.quotes[req.params.id] = quote;
    await writeData(companyId, data);

    res.json({ message: 'Quote accepted', quote });
  } catch (error) {
    console.error('Error accepting quote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject quote
app.post('/api/quotes/:id/reject', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const { reason } = req.body;
    const data = await readData(companyId);
    const quote = data.quotes[req.params.id];

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (!['sent', 'viewed'].includes(quote.status)) {
      return res.status(400).json({ error: 'Quote must be sent or viewed before rejecting' });
    }

    const now = new Date().toISOString();
    quote.status = 'rejected';
    quote.respondedAt = now;
    if (reason) {
      quote.rejectionReason = reason;
    }

    data.quotes[req.params.id] = quote;
    await writeData(companyId, data);

    res.json({ message: 'Quote rejected', quote });
  } catch (error) {
    console.error('Error rejecting quote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get PDF data
app.get('/api/quotes/:id/pdf', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);
    const quote = data.quotes[req.params.id];

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Return PDF-ready data structure
    const pdfData = {
      header: {
        quoteNumber: quote.quoteNumber,
        createdAt: quote.createdAt,
        validUntil: quote.validUntil,
        status: quote.status
      },
      company: {
        name: companyId,
        address: 'Company Address',
        phone: '+91-XXX-XXX-XXXX',
        email: 'contact@example.com'
      },
      customer: {
        name: quote.contactName,
        email: quote.contactEmail
      },
      items: quote.items.map(item => ({
        description: `${item.name}${item.description ? ': ' + item.description : ''}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        tax: item.tax,
        total: item.total
      })),
      totals: {
        subtotal: quote.subtotal,
        discountTotal: quote.discountTotal,
        taxTotal: quote.taxTotal,
        total: quote.total
      },
      terms: quote.terms
    };

    res.json(pdfData);
  } catch (error) {
    console.error('Error generating PDF data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PRODUCT ENDPOINTS
// ============================================

// Create product
app.post('/api/products', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const {
      name,
      description,
      sku,
      unitPrice,
      currency = 'INR',
      taxRate = TAX_RATE * 100,
      category
    } = req.body;

    if (!name || unitPrice === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, unitPrice' });
    }

    const productId = uuidv4();
    const product = {
      productId,
      companyId,
      name,
      description: description || '',
      sku: sku || `SKU-${productId.slice(0, 8).toUpperCase()}`,
      unitPrice,
      currency,
      taxRate,
      category: category || 'General',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const data = await readData(companyId);
    data.products[productId] = product;
    await writeData(companyId, data);

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List products
app.get('/api/products', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const { category, active } = req.query;

    const data = await readData(companyId);
    let products = Object.values(data.products);

    if (category) {
      products = products.filter(p => p.category === category);
    }
    if (active !== undefined) {
      products = products.filter(p => p.active === (active === 'true'));
    }

    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ products, count: products.length });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product
app.get('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);
    const product = data.products[req.params.id];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
app.put('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);
    const product = data.products[req.params.id];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const allowedFields = ['name', 'description', 'sku', 'unitPrice', 'currency', 'taxRate', 'category', 'active'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });
    product.updatedAt = new Date().toISOString();

    data.products[req.params.id] = product;
    await writeData(companyId, data);

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

// Pipeline analytics
app.get('/api/analytics/pipeline', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);

    const stageStats = {};
    let totalValue = 0;
    let totalWeightedValue = 0;
    let openDeals = 0;

    PIPELINE_STAGES.forEach(stage => {
      stageStats[stage.id] = {
        count: 0,
        value: 0,
        avgValue: 0
      };
    });

    Object.values(data.deals).forEach(deal => {
      const stage = deal.stage;
      if (stageStats[stage]) {
        stageStats[stage].count++;
        stageStats[stage].value += deal.value;
      }
      if (deal.stage !== 'won' && deal.stage !== 'lost') {
        totalValue += deal.value;
        totalWeightedValue += deal.value * (deal.probability / 100);
        openDeals++;
      }
    });

    // Calculate averages
    Object.keys(stageStats).forEach(stage => {
      const stats = stageStats[stage];
      stats.avgValue = stats.count > 0 ? Math.round(stats.value / stats.count * 100) / 100 : 0;
    });

    res.json({
      stages: stageStats,
      summary: {
        totalPipelineValue: totalValue,
        weightedValue: Math.round(totalWeightedValue * 100) / 100,
        openDeals,
        avgDealSize: openDeals > 0 ? Math.round(totalValue / openDeals * 100) / 100 : 0,
        wonDeals: stageStats.won.count,
        wonValue: stageStats.won.value,
        lostDeals: stageStats.lost.count,
        lostValue: stageStats.lost.value,
        winRate: (stageStats.won.count + stageStats.lost.count) > 0
          ? Math.round(stageStats.won.count / (stageStats.won.count + stageStats.lost.count) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Error getting pipeline analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sales rep performance
app.get('/api/analytics/sales', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);

    const repStats = {};

    Object.values(data.deals).forEach(deal => {
      const owner = deal.owner;
      if (!repStats[owner]) {
        repStats[owner] = {
          totalDeals: 0,
          openDeals: 0,
          wonDeals: 0,
          lostDeals: 0,
          totalValue: 0,
          wonValue: 0,
          lostValue: 0,
          totalCommission: 0,
          avgDealSize: 0,
          winRate: 0
        };
      }

      const stats = repStats[owner];
      stats.totalDeals++;
      stats.totalValue += deal.value;

      if (deal.stage === 'won') {
        stats.wonDeals++;
        stats.wonValue += deal.value;
        stats.totalCommission += deal.commission || 0;
      } else if (deal.stage === 'lost') {
        stats.lostDeals++;
        stats.lostValue += deal.value;
      } else {
        stats.openDeals++;
      }
    });

    // Calculate derived stats
    Object.keys(repStats).forEach(owner => {
      const stats = repStats[owner];
      stats.avgDealSize = stats.totalDeals > 0 ? Math.round(stats.totalValue / stats.totalDeals * 100) / 100 : 0;
      stats.winRate = (stats.wonDeals + stats.lostDeals) > 0
        ? Math.round(stats.wonDeals / (stats.wonDeals + stats.lostDeals) * 100)
        : 0;
    });

    res.json({ reps: repStats });
  } catch (error) {
    console.error('Error getting sales analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Quote conversion rates
app.get('/api/analytics/quotes', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || 'default';
    const data = await readData(companyId);

    const stats = {
      total: 0,
      draft: 0,
      sent: 0,
      viewed: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      totalValue: 0,
      acceptedValue: 0,
      conversionRate: 0,
      avgResponseTime: null
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    Object.values(data.quotes).forEach(quote => {
      stats.total++;
      stats[quote.status] = (stats[quote.status] || 0) + 1;
      stats.totalValue += quote.total;

      if (quote.status === 'accepted') {
        stats.acceptedValue += quote.total;
      }

      if (quote.sentAt && quote.respondedAt) {
        const responseTime = new Date(quote.respondedAt) - new Date(quote.sentAt);
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    stats.conversionRate = stats.sent > 0
      ? Math.round((stats.accepted / stats.sent) * 100)
      : 0;

    if (responseCount > 0) {
      stats.avgResponseTime = Math.round(totalResponseTime / responseCount / (1000 * 60)); // in minutes
    }

    res.json(stats);
  } catch (error) {
    console.error('Error getting quote analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.get('/ready', (_req, res) => {
    res.json({ ready: true, timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`Sales Pipeline Service running on port ${PORT}`);
  });
}

export default app;
export { app, PIPELINE_STAGES, TAX_RATE, COMMISSION_BASE, requireAuth, calculateCommission, calculateQuoteTotals };
