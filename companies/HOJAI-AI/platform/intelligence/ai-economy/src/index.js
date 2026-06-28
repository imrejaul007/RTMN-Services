// AI Economy OS - Agent marketplace, pricing, billing, micro-transactions
// Port 4894

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from './store.js';

const app = express();
const PORT = 4894;
app.use(express.json());

// --- Marketplace Listings ---

function loadListings() { return readJson('listings.json') || []; }
function saveListings(list) { writeJson('listings.json', list); }

function loadTransactions() { return readJson('transactions.json') || []; }
function saveTransactions(list) { writeJson('transactions.json', list); }

function loadWallets() { return readJson('wallets.json') || []; }
function saveWallets(list) { writeJson('wallets.json', list); }

// GET /api/listings
app.get('/api/listings', (req, res) => {
  const { category, minPrice, maxPrice, search } = req.query;
  let listings = loadListings();
  if (category) listings = listings.filter(l => l.category === category);
  if (minPrice) listings = listings.filter(l => l.price >= parseFloat(minPrice));
  if (maxPrice) listings = listings.filter(l => l.price <= parseFloat(maxPrice));
  if (search) {
    const q = search.toLowerCase();
    listings = listings.filter(l => l.name.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q));
  }
  res.json({ listings, count: listings.length });
});

// GET /api/listings/:id
app.get('/api/listings/:id', (req, res) => {
  const listing = loadListings().find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json(listing);
});

// POST /api/listings
app.post('/api/listings', (req, res) => {
  const { name, description, category, price, providerId, capabilities = [] } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'name and price required' });

  const listing = {
    id: uuidv4(),
    name,
    description,
    category: category || 'general',
    price: parseFloat(price),
    providerId,
    capabilities,
    status: 'active',
    views: 0,
    purchases: 0,
    rating: null,
    createdAt: new Date().toISOString(),
  };

  const listings = loadListings();
  listings.push(listing);
  saveListings(listings);
  res.status(201).json(listing);
});

// DELETE /api/listings/:id
app.delete('/api/listings/:id', (req, res) => {
  const listings = loadListings();
  const idx = listings.findIndex(l => l.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Listing not found' });
  listings.splice(idx, 1);
  saveListings(listings);
  res.json({ deleted: true });
});

// --- Pricing Engine ---

// GET /api/pricing/estimate
app.get('/api/pricing/estimate', (req, res) => {
  const { listingId, quantity = 1, duration = 1 } = req.query;
  const listings = loadListings();
  const listing = listings.find(l => l.id === listingId);

  if (listingId && !listing) return res.status(404).json({ error: 'Listing not found' });

  if (listing) {
    const basePrice = listing.price;
    const qty = parseInt(quantity);
    const dur = parseInt(duration);
    const subtotal = basePrice * qty * dur;
    const platformFee = subtotal * 0.05;
    const total = subtotal + platformFee;
    res.json({ basePrice, quantity: qty, duration: dur, subtotal, platformFee, total });
  } else {
    res.json({ message: 'Provide listingId for estimate' });
  }
});

// POST /api/pricing/quote
app.post('/api/pricing/quote', (req, res) => {
  const { listingId, buyerId, customTerms } = req.body;
  if (!listingId) return res.status(400).json({ error: 'listingId required' });

  const listing = loadListings().find(l => l.id === listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const quote = {
    id: uuidv4(),
    listingId,
    providerId: listing.providerId,
    buyerId,
    basePrice: listing.price,
    terms: customTerms || {},
    validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
    createdAt: new Date().toISOString(),
  };

  const quotes = readJson('quotes.json') || [];
  quotes.push(quote);
  writeJson('quotes.json', quotes);

  res.json(quote);
});

// --- Transactions ---

// POST /api/transactions
app.post('/api/transactions', (req, res) => {
  const { listingId, buyerId, sellerId, amount, type = 'purchase' } = req.body;
  if (!listingId || !buyerId || amount === undefined) {
    return res.status(400).json({ error: 'listingId, buyerId, amount required' });
  }

  const transaction = {
    id: uuidv4(),
    listingId,
    buyerId,
    sellerId: sellerId || null,
    amount: parseFloat(amount),
    type,
    status: 'pending',
    escrow: true,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const transactions = loadTransactions();
  transactions.push(transaction);
  saveTransactions(transactions);

  // Update listing purchase count
  const listings = loadListings();
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx >= 0) { listings[idx].purchases++; saveListings(listings); }

  res.status(201).json(transaction);
});

// GET /api/transactions/:id
app.get('/api/transactions/:id', (req, res) => {
  const tx = loadTransactions().find(t => t.id === req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

// POST /api/transactions/:id/complete
app.post('/api/transactions/:id/complete', (req, res) => {
  const transactions = loadTransactions();
  const idx = transactions.findIndex(t => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Transaction not found' });

  transactions[idx].status = 'completed';
  transactions[idx].completedAt = new Date().toISOString();
  transactions[idx].escrow = false;
  saveTransactions(transactions);
  res.json(transactions[idx]);
});

// --- Wallets ---

// GET /api/wallets/:ownerId
app.get('/api/wallets/:ownerId', (req, res) => {
  const wallets = loadWallets();
  let wallet = wallets.find(w => w.ownerId === req.params.ownerId);
  if (!wallet) {
    wallet = { ownerId: req.params.ownerId, balance: 0, currency: 'credits', transactions: [] };
    wallets.push(wallet);
    saveWallets(wallets);
  }
  res.json(wallet);
});

// POST /api/wallets/:ownerId/topup
app.post('/api/wallets/:ownerId/topup', (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'positive amount required' });

  const wallets = loadWallets();
  let wallet = wallets.find(w => w.ownerId === req.params.ownerId);
  if (!wallet) {
    wallet = { ownerId: req.params.ownerId, balance: 0, currency: 'credits', transactions: [] };
    wallets.push(wallet);
  }
  wallet.balance += parseFloat(amount);
  wallet.transactions.push({ type: 'credit', amount: parseFloat(amount), timestamp: new Date().toISOString() });
  saveWallets(wallets);
  res.json(wallet);
});

// --- Analytics ---

// GET /api/analytics/marketplace
app.get('/api/analytics/marketplace', (req, res) => {
  const listings = loadListings();
  const transactions = loadTransactions();
  const wallets = loadWallets();
  const totalVolume = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  res.json({
    totalListings: listings.length,
    activeListings: listings.filter(l => l.status === 'active').length,
    totalTransactions: transactions.length,
    completedTransactions: transactions.filter(t => t.status === 'completed').length,
    totalVolume,
    totalWallets: wallets.length,
    avgPrice: listings.length ? listings.reduce((s, l) => s + l.price, 0) / listings.length : 0,
  });
});

// --- Health ---
app.get('/health', (req, res) => res.json({ service: 'ai-economy-os', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => {
  console.log(`AI Economy OS running on port ${PORT}`);
});

export default server;