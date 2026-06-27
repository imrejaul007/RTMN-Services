import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import axios from 'axios';
import 'dotenv/config';

const PORT = parseInt(process.env.PORT || '8200', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// SECURITY FIX (HOJAI C-5): No insecure fallbacks in production.
// JWT_SECRET must be set and >= 32 chars. INTERNAL_SERVICE_TOKEN must be set.
const JWT_SECRET = process.env.JWT_SECRET;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
if (IS_PRODUCTION) {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('[salar] JWT_SECRET (>= 32 chars) is required in production');
  }
  if (!INTERNAL_TOKEN || INTERNAL_TOKEN.length < 32) {
    throw new Error('[salar] INTERNAL_SERVICE_TOKEN (>= 32 chars) is required in production');
  }
} else if (!JWT_SECRET || !INTERNAL_TOKEN) {
  console.warn('[salar] WARNING: JWT_SECRET or INTERNAL_SERVICE_TOKEN not set; dev-only behavior');
}
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:7001';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('tiny'));
app.use(express.json({ limit: '2mb' }));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const err = (res, s, c, m) => res.status(s).json({ success: false, error: { code: c, message: m }, meta: { timestamp: new Date().toISOString() } });
const reqI = (req, res, next) => {
  const presented = req.headers['x-internal-token'];
  if (!INTERNAL_TOKEN || !presented) return res.status(401).json({ success: false });
  if (presented.length !== INTERNAL_TOKEN.length) return res.status(401).json({ success: false });
  // SECURITY FIX: timing-safe compare for the internal token.
  let mismatch = 0;
  for (let i = 0; i < INTERNAL_TOKEN.length; i++) {
    mismatch |= presented.charCodeAt(i) ^ INTERNAL_TOKEN.charCodeAt(i);
  }
  if (mismatch !== 0) return res.status(401).json({ success: false });
  next();
};
const callInternal = async (url, method, body) => { try { const r = await axios({ method, url, data: body, headers: { 'x-internal-token': INTERNAL_TOKEN || '' }, timeout: 5000 }); return r.data; } catch { return null; } };

// MODELS
const ProviderSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  company: String,
  bio: String,
  website: String,
  corpId: String,
  verified: { type: Boolean, default: false },
  totalListings: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
}, { timestamps: true });
const Provider = mongoose.model('SalarProvider', ProviderSchema);

const ProviderSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  providerId: mongoose.Types.ObjectId,
  token: { type: String, index: true },
  expiresAt: Date,
}, { timestamps: true });
const ProviderSession = mongoose.model('SalarProviderSession', ProviderSessionSchema);

const ListingSchema = new mongoose.Schema({
  listingId: { type: String, required: true, unique: true, index: true },
  providerId: { type: mongoose.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true, index: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['agent', 'skill', 'twin', 'workflow', 'knowledge', 'service', 'product'], required: true, index: true },
  tags: [String],
  pricing: {
    model: { type: String, enum: ['free', 'one_time', 'subscription', 'usage_based'], required: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    usageUnit: String,
    trialDays: { type: Number, default: 0 },
  },
  media: { thumbnail: String, screenshots: [String] },
  stats: { views: { type: Number, default: 0 }, purchases: { type: Number, default: 0 }, rating: { type: Number, default: 0 }, reviewCount: { type: Number, default: 0 } },
  requirements: [String],
  version: { type: String, default: '1.0.0' },
  published: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
}, { timestamps: true });
ListingSchema.index({ title: 'text', description: 'text', tags: 'text' });
const Listing = mongoose.model('SalarListing', ListingSchema);

const ReviewSchema = new mongoose.Schema({
  reviewId: { type: String, required: true, unique: true, index: true },
  listingId: { type: String, required: true, index: true },
  providerId: { type: mongoose.Types.ObjectId, required: true, index: true },
  reviewerName: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  title: String,
  comment: String,
  verifiedPurchase: { type: Boolean, default: false },
}, { timestamps: true });
const Review = mongoose.model('SalarReview', ReviewSchema);

const PurchaseSchema = new mongoose.Schema({
  purchaseId: { type: String, required: true, unique: true, index: true },
  listingId: { type: String, required: true, index: true },
  providerId: { type: mongoose.Types.ObjectId, required: true, index: true },
  buyerName: String,
  buyerEmail: String,
  amount: Number,
  platformFee: Number,
  providerEarnings: Number,
  status: { type: String, enum: ['pending', 'completed', 'refunded', 'failed'], default: 'completed' },
  pricingModel: String,
}, { timestamps: true });
const Purchase = mongoose.model('SalarPurchase', PurchaseSchema);

// SCHEMAS
const signupSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1), company: z.string().optional(), bio: z.string().optional(), website: z.string().optional() });
const loginSchema = z.object({ email: z.string().email(), password: z.string() });
const listingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.enum(['agent', 'skill', 'twin', 'workflow', 'knowledge', 'service', 'product']),
  tags: z.array(z.string()).optional(),
  pricing: z.object({ model: z.enum(['free', 'one_time', 'subscription', 'usage_based']), price: z.number().nonnegative().default(0), currency: z.string().default('USD'), usageUnit: z.string().optional(), trialDays: z.number().int().nonnegative().default(0) }),
  requirements: z.array(z.string()).optional(),
});
const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), title: z.string().optional(), comment: z.string().optional(), reviewerName: z.string().min(1), reviewerEmail: z.string().email() });
const purchaseSchema = z.object({ buyerName: z.string().min(1), buyerEmail: z.string().email() });

function authProvider(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return err(res, 401, 'UNAUTHORIZED', 'No bearer token');
  try { req.providerId = jwt.verify(h.slice(7), JWT_SECRET).providerId; next(); }
  catch { return err(res, 401, 'UNAUTHORIZED', 'Invalid token'); }
}

app.get('/health', (req, res) => send(res, 200, { service: 'salar', status: 'healthy', version: '1.0.0' }));
app.get('/ready',  (req, res) => send(res, 200, { service: 'salar', status: 'ready',   version: '1.0.0' }));

// AUTH
app.post('/api/auth/signup', requireInternal, async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    if (await Provider.findOne({ email: data.email })) return err(res, 409, 'CONFLICT', 'Email exists');
    const corpRes = await callInternal(`${CORPID_URL}/api/identity/issue`, 'POST', { type: 'user', name: data.name });
    const hashed = await bcrypt.hash(data.password, 10);
    const provider = await Provider.create({ ...data, password: hashed, corpId: corpRes?.data?.corpId });
    const token = jwt.sign({ providerId: provider._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    const sessionId = `SES-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await ProviderSession.create({ sessionId, providerId: provider._id, token, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) });
    res.status(201).json({ success: true, data: { token, provider: { id: provider._id, email: provider.email, name: provider.name, company: provider.company, corpId: provider.corpId } }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.post('/api/auth/login', requireInternal, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const p = await Provider.findOne({ email });
    if (!p || !(await bcrypt.compare(password, p.password))) return err(res, 401, 'UNAUTHORIZED', 'Invalid credentials');
    const token = jwt.sign({ providerId: p._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    const sessionId = `SES-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await ProviderSession.create({ sessionId, providerId: p._id, token, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) });
    res.json({ success: true, data: { token, provider: { id: p._id, email: p.email, name: p.name, company: p.company, rating: p.rating, totalSales: p.totalSales } }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/auth/me', authProvider, async (req, res, next) => {
  try {
    const p = await Provider.findById(req.providerId);
    res.json({ success: true, data: { id: p._id, email: p.email, name: p.name, company: p.company, bio: p.bio, website: p.website, verified: p.verified, totalListings: p.totalListings, totalSales: p.totalSales, totalEarnings: p.totalEarnings, rating: p.rating }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

// LISTINGS
app.post('/api/listings', authProvider, async (req, res, next) => {
  try {
    const data = listingSchema.parse(req.body);
    const listingId = `LST-${Date.now().toString(36).toUpperCase()}`;
    const l = await Listing.create({ ...data, listingId, providerId: req.providerId });
    await Provider.updateOne({ _id: req.providerId }, { $inc: { totalListings: 1 } });
    res.status(201).json({ success: true, data: { listingId, title: l.title, category: l.category, pricing: l.pricing }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/listings', async (req, res, next) => {
  try {
    const { category, q, featured, limit = 50, sort = '-createdAt' } = req.query;
    const filter = { published: true };
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (q) filter.$or = [{ title: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }, { tags: { $regex: q, $options: 'i' } }];
    const items = await Listing.find(filter).sort(sort).limit(parseInt(limit)).populate('providerId', 'name company rating');
    res.json({ success: true, data: { count: items.length, items: items.map(l => ({ listingId: l.listingId, title: l.title, description: l.description, category: l.category, tags: l.tags, pricing: l.pricing, stats: l.stats, provider: l.providerId?.name, company: l.providerId?.company, providerRating: l.providerId?.rating, featured: l.featured, createdAt: l.createdAt })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/listings/featured', async (req, res, next) => {
  try {
    const items = await Listing.find({ published: true, featured: true }).limit(10);
    res.json({ success: true, data: { count: items.length, items }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/listings/categories', async (req, res, next) => {
  try {
    const categories = await Listing.aggregate([{ $match: { published: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    res.json({ success: true, data: { categories: categories.map(c => ({ name: c._id, count: c.count })) }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/listings/:listingId', async (req, res, next) => {
  try {
    const l = await Listing.findOneAndUpdate({ listingId: req.params.listingId }, { $inc: { 'stats.views': 1 } }, { new: true }).populate('providerId', 'name company rating bio');
    if (!l) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    const reviews = await Review.find({ listingId: l.listingId }).sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, data: { listingId: l.listingId, title: l.title, description: l.description, category: l.category, tags: l.tags, pricing: l.pricing, media: l.media, stats: l.stats, requirements: l.requirements, version: l.version, provider: l.providerId, reviews }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/providers/:providerId/listings', async (req, res, next) => {
  try {
    const items = await Listing.find({ providerId: req.params.providerId, published: true });
    res.json({ success: true, data: { count: items.length, items }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

// REVIEWS
app.post('/api/listings/:listingId/reviews', requireInternal, async (req, res, next) => {
  try {
    const data = reviewSchema.parse(req.body);
    const listing = await Listing.findOne({ listingId: req.params.listingId });
    if (!listing) return err(res, 404, 'NOT_FOUND', 'Listing not found');
    const reviewId = `REV-${Date.now().toString(36).toUpperCase()}`;
    const r = await Review.create({ reviewId, listingId: req.params.listingId, providerId: listing.providerId, ...data });
    const reviews = await Review.find({ listingId: req.params.listingId });
    const avg = reviews.reduce((s, x) => s + x.rating, 0) / reviews.length;
    await Listing.updateOne({ listingId: req.params.listingId }, { $set: { 'stats.rating': Math.round(avg * 10) / 10, 'stats.reviewCount': reviews.length } });
    res.status(201).json({ success: true, data: { reviewId, rating: r.rating, newAverage: Math.round(avg * 10) / 10, totalReviews: reviews.length }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

// PURCHASES
app.post('/api/listings/:listingId/purchase', requireInternal, async (req, res, next) => {
  try {
    const data = purchaseSchema.parse(req.body);
    const listing = await Listing.findOne({ listingId: req.params.listingId, published: true });
    if (!listing) return err(res, 404, 'NOT_FOUND', 'Listing not found');
    const amount = listing.pricing.model === 'free' ? 0 : listing.pricing.price;
    const platformFee = Math.round(amount * 0.15 * 100) / 100;
    const providerEarnings = amount - platformFee;
    const purchaseId = `PUR-${Date.now().toString(36).toUpperCase()}`;
    const purchase = await Purchase.create({ purchaseId, listingId: req.params.listingId, providerId: listing.providerId, ...data, amount, platformFee, providerEarnings, pricingModel: listing.pricing.model });
    await Listing.updateOne({ listingId: req.params.listingId }, { $inc: { 'stats.purchases': 1 } });
    await Provider.updateOne({ _id: listing.providerId }, { $inc: { totalSales: 1, totalEarnings: providerEarnings } });
    res.status(201).json({ success: true, data: { purchaseId, amount, platformFee, providerEarnings, status: purchase.status, pricingModel: listing.pricing.model }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

// DASHBOARD
app.get('/api/dashboard', authProvider, async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.providerId);
    const listings = await Listing.find({ providerId: req.providerId });
    const purchases = await Purchase.find({ providerId: req.providerId }).sort({ createdAt: -1 }).limit(20);
    const totalViews = listings.reduce((s, l) => s + l.stats.views, 0);
    const totalPurchases = listings.reduce((s, l) => s + l.stats.purchases, 0);
    res.json({ success: true, data: { provider: { name: provider.name, company: provider.company, rating: provider.rating, totalEarnings: provider.totalEarnings }, stats: { totalListings: listings.length, totalViews, totalPurchases, totalEarnings: provider.totalEarnings, conversionRate: totalViews > 0 ? Math.round((totalPurchases / totalViews) * 1000) / 10 : 0 }, recentPurchases: purchases }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

app.get('/api/marketplace/stats', async (req, res, next) => {
  try {
    const totalListings = await Listing.countDocuments({ published: true });
    const totalProviders = await Provider.countDocuments();
    const totalPurchases = await Purchase.countDocuments();
    const totalRevenue = await Purchase.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const topCategories = await Listing.aggregate([{ $match: { published: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]);
    res.json({ success: true, data: { totalListings, totalProviders, totalPurchases, totalRevenue: totalRevenue[0]?.total || 0, topCategories }, meta: { timestamp: new Date().toISOString() } });
  } catch (e) { next(e); }
});

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[salar] MongoDB connected`); }
  catch (err) { console.error(`[salar] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  app.listen(PORT, () => console.log(`[salar] listening on :${PORT}`));
}
start();
export { app };
