// AI Economy OS - Agent marketplace, pricing, billing, micro-transactions. Port 4894
import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from './store.js';

const app = express();
const PORT = 4894;
app.use(express.json());

// Listings
app.get('/api/listings', (req, res) => {
  const { category, minPrice, maxPrice, search } = req.query;
  let listings = readJson('listings.json') || [];
  if (category) listings = listings.filter(l => l.category === category);
  if (minPrice) listings = listings.filter(l => l.price >= parseFloat(minPrice));
  if (maxPrice) listings = listings.filter(l => l.price <= parseFloat(maxPrice));
  if (search) { const q = search.toLowerCase(); listings = listings.filter(l => l.name.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)); }
  res.json({ listings, count: listings.length });
});

app.get('/api/listings/:id', (req, res) => {
  const listing = (readJson('listings.json') || []).find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json(listing);
});

app.post('/api/listings',requireAuth,  (req, res) => {
  const { name, description, category, price, providerId, capabilities = [] } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'name and price required' });
  const listing = { id: uuidv4(), name, description, category: category || 'general', price: parseFloat(price), providerId, capabilities, status: 'active', views: 0, purchases: 0, rating: null, createdAt: new Date().toISOString() };
  const listings = readJson('listings.json') || [];
  listings.push(listing);
  writeJson('listings.json', listings);
  res.status(201).json(listing);
});

app.delete('/api/listings/:id',requireAuth,  (req, res) => {
  const listings = readJson('listings.json') || [];
  const idx = listings.findIndex(l => l.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Listing not found' });
  listings.splice(idx, 1);
  writeJson('listings.json', listings);
  res.json({ deleted: true });
});

// Pricing
app.get('/api/pricing/estimate', (req, res) => {
  const { listingId, quantity = 1, duration = 1 } = req.query;
  const listings = readJson('listings.json') || [];
  const listing = listings.find(l => l.id === listingId);
  if (listingId && !listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing) {
    const basePrice = listing.price, qty = parseInt(quantity), dur = parseInt(duration);
    const subtotal = basePrice * qty * dur;
    const platformFee = subtotal * 0.05;
    res.json({ basePrice, quantity: qty, duration: dur, subtotal, platformFee, total: subtotal + platformFee });
  } else {
    res.json({ message: 'Provide listingId for estimate' });
  }
});

app.post('/api/pricing/quote',requireAuth,  (req, res) => {
  const { listingId, buyerId, customTerms } = req.body;
  if (!listingId) return res.status(400).json({ error: 'listingId required' });
  const listing = (readJson('listings.json') || []).find(l => l.id === listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  const quote = { id: uuidv4(), listingId, providerId: listing.providerId, buyerId, basePrice: listing.price, terms: customTerms || {}, validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), createdAt: new Date().toISOString() };
  const quotes = readJson('quotes.json') || [];
  quotes.push(quote);
  writeJson('quotes.json', quotes);
  res.json(quote);
});

// Transactions
app.post('/api/transactions',requireAuth,  (req, res) => {
  const { listingId, buyerId, sellerId, amount, type = 'purchase' } = req.body;
  if (!listingId || !buyerId || amount === undefined) return res.status(400).json({ error: 'listingId, buyerId, amount required' });
  const tx = { id: uuidv4(), listingId, buyerId, sellerId: sellerId || null, amount: parseFloat(amount), type, status: 'pending', escrow: true, createdAt: new Date().toISOString(), completedAt: null };
  const transactions = readJson('transactions.json') || [];
  transactions.push(tx);
  writeJson('transactions.json', transactions);
  const listings = readJson('listings.json') || [];
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx >= 0) { listings[idx].purchases++; writeJson('listings.json', listings); }
  res.status(201).json(tx);
});

app.get('/api/transactions/:id', (req, res) => {
  const tx = (readJson('transactions.json') || []).find(t => t.id === req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

app.post('/api/transactions/:id/complete',requireAuth,  (req, res) => {
  const transactions = readJson('transactions.json') || [];
  const idx = transactions.findIndex(t => t.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Transaction not found' });
  transactions[idx].status = 'completed';
  transactions[idx].completedAt = new Date().toISOString();
  transactions[idx].escrow = false;
  writeJson('transactions.json', transactions);
  res.json(transactions[idx]);
});

// Wallets
app.get('/api/wallets/:ownerId', (req, res) => {
  const wallets = readJson('wallets.json') || [];
  let wallet = wallets.find(w => w.ownerId === req.params.ownerId);
  if (!wallet) { wallet = { ownerId: req.params.ownerId, balance: 0, currency: 'credits', transactions: [] }; wallets.push(wallet); writeJson('wallets.json', wallets); }
  res.json(wallet);
});

app.post('/api/wallets/:ownerId/topup',requireAuth,  (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'positive amount required' });
  const wallets = readJson('wallets.json') || [];
  let wallet = wallets.find(w => w.ownerId === req.params.ownerId);
  if (!wallet) { wallet = { ownerId: req.params.ownerId, balance: 0, currency: 'credits', transactions: [] }; wallets.push(wallet); }
  wallet.balance += parseFloat(amount);
  wallet.transactions.push({ type: 'credit', amount: parseFloat(amount), timestamp: new Date().toISOString() });
  writeJson('wallets.json', wallets);
  res.json(wallet);
});

// Analytics
app.get('/api/analytics/marketplace', (req, res) => {
  const listings = readJson('listings.json') || [];
  const transactions = readJson('transactions.json') || [];
  const wallets = readJson('wallets.json') || [];
  const completed = transactions.filter(t => t.status === 'completed');
  res.json({
    totalListings: listings.length,
    activeListings: listings.filter(l => l.status === 'active').length,
    totalTransactions: transactions.length,
    completedTransactions: completed.length,
    totalVolume: completed.reduce((s, t) => s + t.amount, 0),
    totalWallets: wallets.length,
    avgPrice: listings.length ? listings.reduce((s, l) => s + l.price, 0) / listings.length : 0,
  });
});

app.get('/health', (req, res) => res.json({ service: 'ai-economy-os', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => { console.log(`AI Economy OS running on port ${PORT}`); });
export default server;
