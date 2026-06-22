import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';

const app: Express = express();
const PORT = process.env.PORT || 4256;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovery-engine';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================
// AGENT/CAPABILITY REGISTRY
// ============================================

const agentSchema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true, index: true },
  name: String,
  type: { type: String, enum: ['supplier', 'buyer', 'service', 'logistics', 'manufacturer', 'distributor'], required: true },
  industry: [String],
  capabilities: [String],
  location: {
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    coordinates: { lat: Number, lng: Number }
  },
  rating: { type: Number, default: 3.0 },
  reviews: Number,
  trustScore: Number,
  verified: { type: Boolean, default: false },
  pricing: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'INR' }
  },
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
  tenantId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

agentSchema.index({ tenantId: 1, type: 1 });
agentSchema.index({ capabilities: 1 });
agentSchema.index({ industry: 1 });
agentSchema.index({ 'location.city': 1 });
agentSchema.index({ rating: -1 });
agentSchema.index({ trustScore: -1 });

const Agent = mongoose.model('Agent', agentSchema);

// ============================================
// DISCOVERY LOG
// ============================================

const discoveryLogSchema = new mongoose.Schema({
  queryId: String,
  query: String,
  filters: mongoose.Schema.Types.Mixed,
  results: Number,
  selectedAgent: String,
  tenantId: String,
  createdAt: { type: Date, default: Date.now }
});

const DiscoveryLog = mongoose.model('DiscoveryLog', discoveryLogSchema);

// Health
app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'discovery-engine', version: '1.0.0', timestamp: new Date().toISOString() }));
app.get('/health/ready', async (_, res) => {
  const status = mongoose.connection.readyState === 1 ? 'ready' : 'not_ready';
  res.status(status === 'ready' ? 200 : 503).json({ status });
});

app.get('/api/info', (_, res) => {
  res.json({
    service: 'discovery-engine',
    version: '1.0.0',
    description: 'Agent Discovery - Category, Capability, Location, Trust, Price matching',
    matchTypes: ['category', 'capability', 'location', 'trust', 'price']
  });
});

// ============================================
// AGENT REGISTRY
// ============================================

/**
 * Register agent
 */
app.post('/api/agents', async (req: Request, res: Response) => {
  try {
    const { agentId, name, type, industry, capabilities, location, pricing, tags, tenantId, metadata } = req.body;

    const agent = new Agent({
      agentId,
      name,
      type,
      industry: industry || [],
      capabilities: capabilities || [],
      location: location || {},
      pricing: pricing || {},
      tags: tags || [],
      metadata: metadata || {},
      tenantId
    });

    await agent.save();
    res.status(201).json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * List agents
 */
app.get('/api/agents', async (req: Request, res: Response) => {
  try {
    const { tenantId, type, industry, capabilities, city, minRating, minTrust, page = 1, limit = 20 } = req.query;
    const filter: any = { tenantId };

    if (type) filter.type = type;
    if (industry) filter.industry = industry;
    if (city) filter['location.city'] = city;
    if (minRating) filter.rating = { $gte: Number(minRating) };
    if (minTrust) filter.trustScore = { $gte: Number(minTrust) };

    const agents = await Agent.find(filter)
      .sort({ rating: -1, trustScore: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Agent.countDocuments(filter);

    res.json({
      success: true,
      data: agents,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Get agent
 */
app.get('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.id });
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    res.json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Update agent
 */
app.put('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const agent = await Agent.findOneAndUpdate(
      { agentId: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    res.json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// DISCOVERY ENDPOINTS
// ============================================

/**
 * Search agents
 */
app.post('/api/discover', async (req: Request, res: Response) => {
  try {
    const { query, type, capabilities, industry, location, maxDistance, minRating, minTrust, priceRange, verified, limit = 10, tenantId } = req.body;
    const queryId = `DQ-${Date.now().toString(36).toUpperCase()}`;

    const filter: any = { tenantId };

    if (type) filter.type = type;
    if (industry) filter.industry = industry;
    if (verified !== undefined) filter.verified = verified;
    if (minRating) filter.rating = { $gte: minRating };
    if (minTrust) filter.trustScore = { $gte: minTrust };

    // Capability match
    if (capabilities && capabilities.length > 0) {
      filter.capabilities = { $in: capabilities };
    }

    // Price range
    if (priceRange) {
      filter['pricing.min'] = { $lte: priceRange.max || 999999999 };
      filter['pricing.max'] = { $gte: priceRange.min || 0 };
    }

    // Location filter (simple - just city match for now)
    if (location?.city) {
      filter['location.city'] = location.city;
    }

    // Execute query
    let agents = await Agent.find(filter)
      .sort({ trustScore: -1, rating: -1 })
      .limit(limit);

    // Re-rank by match score
    agents = agents.map(agent => {
      let matchScore = agent.trustScore || 50;

      // Boost verified agents
      if (agent.verified) matchScore += 20;

      // Capability match boost
      if (capabilities) {
        const matchCount = capabilities.filter((c: string) =>
          agent.capabilities.includes(c)
        ).length;
        matchScore += matchCount * 5;
      }

      return { ...agent.toObject(), matchScore };
    });

    agents.sort((a, b) => b.matchScore - a.matchScore);

    // Log discovery
    const log = new DiscoveryLog({
      queryId,
      query: query || '',
      filters: { type, capabilities, industry, location, priceRange },
      results: agents.length,
      selectedAgent: agents[0]?.agentId,
      tenantId
    });
    await log.save();

    res.json({
      success: true,
      data: {
        queryId,
        total: agents.length,
        agents: agents.slice(0, limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Match by capability
 */
app.post('/api/match/capability', async (req: Request, res: Response) => {
  try {
    const { capabilities, type, tenantId } = req.body;

    const agents = await Agent.find({
      tenantId,
      type,
      capabilities: { $in: capabilities }
    }).sort({ matchScore: -1, trustScore: -1 });

    // Calculate match percentage
    const results = agents.map(agent => {
      const matchCount = capabilities.filter((c: string) =>
        agent.capabilities.includes(c)
      ).length;
      const matchPercentage = Math.round((matchCount / capabilities.length) * 100);

      return {
        ...agent.toObject(),
        matchPercentage,
        missingCapabilities: capabilities.filter((c: string) =>
          !agent.capabilities.includes(c)
        )
      };
    });

    results.sort((a, b) => b.matchPercentage - a.matchPercentage);

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Match by location
 */
app.post('/api/match/location', async (req: Request, res: Response) => {
  try {
    const { city, state, country, type, tenantId, radius = 100 } = req.body;

    const filter: any = { tenantId };
    if (type) filter.type = type;
    if (city) filter['location.city'] = city;
    if (state) filter['location.state'] = state;
    if (country) filter['location.country'] = country;

    const agents = await Agent.find(filter).sort({ trustScore: -1 });

    res.json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Match by trust
 */
app.post('/api/match/trust', async (req: Request, res: Response) => {
  try {
    const { minScore = 70, type, tenantId } = req.body;

    const agents = await Agent.find({
      tenantId,
      type,
      trustScore: { $gte: minScore },
      verified: true
    }).sort({ trustScore: -1 });

    res.json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Match by price
 */
app.post('/api/match/price', async (req: Request, res: Response) => {
  try {
    const { minPrice, maxPrice, type, tenantId } = req.body;

    const filter: any = { tenantId };
    if (type) filter.type = type;

    const agents = await Agent.find(filter);

    // Filter by price range
    const results = agents.filter(agent => {
      const min = agent.pricing?.min || 0;
      const max = agent.pricing?.max || 999999999;
      return min <= (maxPrice || 999999999) && max >= (minPrice || 0);
    }).sort((a, b) => (a.pricing?.min || 0) - (b.pricing?.min || 0));

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Error handling
app.use((_, res) => res.status(404).json({ success: false, error: 'Not found' }));
app.use((err: Error, _, res: Response, _next: any) => {
  res.status(500).json({ success: false, error: err.message });
});

mongoose.connect(MONGODB_URI).then(() => {
  app.listen(PORT, () => {
    console.log(`Discovery Engine running on port ${PORT}`);
  });
}).catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});

export default app;
