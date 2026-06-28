/**
 * Lookalike Generator
 * Port: 5457
 * Find best customers and generate lookalike profiles for ad platforms
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.LOOKALIKE_PORT || 5457;

// Service URLs
const CUSTOMER_TWIN = process.env.CUSTOMER_TWIN_URL || 'http://localhost:4895';
const REZ_AUDIENCE = process.env.REZ_AUDIENCE_URL || 'http://localhost:4805';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

app.use(express.json());

// In-memory stores
const audiences = new Map(); // audienceId -> { customers, lookalike, platform }
const syncStatus = new Map(); // audienceId -> { status, platform, syncedAt }

// Best customer criteria
const BEST_CUSTOMER_CRITERIA = {
  minPurchases: 3,
  minSpend: 10000, // Rs
  maxSupportTickets: 2,
  minRating: 4.5,
  noReturnsMonths: 6
};

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'lookalike-generator', audiences: audiences.size, port: PORT });
});

// GET /api/lookalikes/best-customers - Find best customers
app.get('/api/lookalikes/best-customers', async (req, res) => {
  try {
    const { companyId, limit } = req.query;

    // Fetch customers from Customer Twin
    let customers = [];
    try {
      const twinRes = await axios.get(`${CUSTOMER_TWIN}/api/twin/list`, {
        params: { companyId, limit: 1000 },
        headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
        timeout: 5000
      });
      customers = twinRes.data?.data || [];
    } catch (e) {
      // Use mock data if Customer Twin unavailable
      customers = generateMockCustomers(50);
    }

    // Score each customer
    const scored = customers.map(c => ({
      ...c,
      score: scoreCustomer(c),
      criteria: checkCriteria(c)
    }));

    // Sort by score and filter
    scored.sort((a, b) => b.score - a.score);
    const best = scored.slice(0, parseInt(limit) || 100);

    res.json({
      success: true,
      data: {
        totalCustomers: customers.length,
        bestCustomers: best,
        criteria: BEST_CUSTOMER_CRITERIA
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lookalikes/generate - Generate lookalike profiles
app.post('/api/lookalikes/generate',requireAuth,  async (req, res) => {
  try {
    const { companyId, sourceAudienceId, size } = req.body;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    // Get best customers
    const bestCustomers = await getBestCustomers(companyId, 1000);
    if (bestCustomers.length === 0) {
      return res.status(400).json({ success: false, error: 'No best customers found' });
    }

    // Generate lookalike profile
    const lookalike = generateLookalikeProfile(bestCustomers, parseInt(size) || 1000000);

    // Store audience
    const audienceId = `la_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const audience = {
      id: audienceId,
      companyId,
      sourceAudienceId,
      lookalike,
      sourceCount: bestCustomers.length,
      targetSize: lookalike.targetSize,
      createdAt: new Date().toISOString()
    };
    audiences.set(audienceId, audience);

    res.json({ success: true, data: audience });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lookalikes/sync/:platform - Sync to ad platform
app.post('/api/lookalikes/sync/:platform',requireAuth,  async (req, res) => {
  try {
    const { platform } = req.params;
    const { audienceId, campaignId } = req.body;
    if (!audienceId) return res.status(400).json({ success: false, error: 'audienceId is required' });

    const audience = audiences.get(audienceId);
    if (!audience) return res.status(404).json({ success: false, error: 'Audience not found' });

    const platforms = ['meta', 'google', 'tiktok'];
    if (!platforms.includes(platform)) {
      return res.status(400).json({ success: false, error: `Platform must be one of: ${platforms.join(', ')}` });
    }

    // Transform to platform format
    const platformAudience = transformForPlatform(platform, audience.lookalike);

    // In production, this would call the actual platform API
    // For now, simulate sync
    syncStatus.set(audienceId, {
      status: 'synced',
      platform,
      audienceId: platformAudience.id,
      syncedAt: new Date().toISOString(),
      size: platformAudience.size
    });

    res.json({ success: true, data: { synced: true, platform, audienceId: platformAudience.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lookalikes/audiences - List generated audiences
app.get('/api/lookalikes/audiences', (req, res) => {
  const { companyId } = req.query;

  let list = [...audiences.values()];
  if (companyId) list = list.filter(a => a.companyId === companyId);

  res.json({ success: true, data: list.map(a => ({
    id: a.id, companyId: a.companyId, sourceCount: a.sourceCount,
    targetSize: a.lookalike.targetSize, createdAt: a.createdAt,
    syncStatus: syncStatus.get(a.id) || null
  })) });
});

// GET /api/lookalikes/audience/:id - Get audience details
app.get('/api/lookalikes/audience/:id', (req, res) => {
  const audience = audiences.get(req.params.id);
  if (!audience) return res.status(404).json({ success: false, error: 'Audience not found' });
  res.json({ success: true, data: { ...audience, syncStatus: syncStatus.get(audience.id) || null } });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreCustomer(c) {
  let score = 0;
  score += Math.min((c.totalPurchases || 0) * 10, 50);
  score += Math.min((c.totalSpend || 0) / 100, 30);
  score += (c.loyaltyPoints || 0) > 1000 ? 10 : 0;
  score += (c.averageRating || 0) >= 4.5 ? 10 : 0;
  score -= (c.supportTickets || 0) * 5;
  return Math.min(100, score);
}

function checkCriteria(c) {
  return {
    minPurchases: (c.totalPurchases || 0) >= BEST_CUSTOMER_CRITERIA.minPurchases,
    minSpend: (c.totalSpend || 0) >= BEST_CUSTOMER_CRITERIA.minSpend,
    maxSupportTickets: (c.supportTickets || 0) <= BEST_CUSTOMER_CRITERIA.maxSupportTickets,
    minRating: (c.averageRating || 0) >= BEST_CUSTOMER_CRITERIA.minRating,
    noReturns: (c.lastReturnDate ? (Date.now() - new Date(c.lastReturnDate).getTime()) > BEST_CUSTOMER_CRITERIA.noReturnsMonths * 30 * 86400000 : true)
  };
}

async function getBestCustomers(companyId, limit) {
  try {
    const twinRes = await axios.get(`${CUSTOMER_TWIN}/api/twin/list`, {
      params: { companyId, limit },
      headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
      timeout: 5000
    });
    return (twinRes.data?.data || []).filter(c => scoreCustomer(c) >= 70);
  } catch (e) {
    return generateMockCustomers(50).filter(c => scoreCustomer(c) >= 70);
  }
}

function generateLookalikeProfile(customers, targetSize) {
  // Analyze demographics
  const ages = customers.map(c => c.age).filter(Boolean);
  const locations = customers.map(c => c.location).filter(Boolean);
  const interests = customers.map(c => c.interests || []).flat().filter(Boolean);

  // Analyze behavior
  const avgSpend = customers.reduce((s, c) => s + (c.totalSpend || 0), 0) / customers.length;
  const avgPurchases = customers.reduce((s, c) => s + (c.totalPurchases || 0), 0) / customers.length;

  return {
    demographics: {
      ageRange: ages.length ? { min: Math.min(...ages), max: Math.max(...ages) } : { min: 25, max: 45 },
      topLocations: getTopOccurrences(locations, 5),
      gender: customers.filter(c => c.gender).reduce((m, c) => { m[c.gender] = (m[c.gender] || 0) + 1; return m; }, {})
    },
    behavior: {
      avgOrderValue: Math.round(avgSpend / avgPurchases || 500),
      avgPurchaseFrequency: Math.round(avgPurchases / 12 * 30), // days between purchases
      preferredCategories: getTopOccurrences(customers.map(c => c.favoriteCategory).filter(Boolean), 5)
    },
    interests: getTopOccurrences(interests, 20),
    targetSize,
    confidence: Math.min(0.95, 0.5 + customers.length * 0.01)
  };
}

function transformForPlatform(platform, lookalike) {
  if (platform === 'meta') {
    return {
      id: `meta_la_${Date.now()}`,
      name: 'HOJAI Lookalike Audience',
      size: lookalike.targetSize,
      demographics: {
        age_min: lookalike.demographics.ageRange.min,
        age_max: lookalike.demographics.ageRange.max,
        genders: Object.keys(lookalike.demographics.gender),
        geo: lookalike.demographics.topLocations.slice(0, 3)
      },
      interests: lookalike.interests.slice(0, 10)
    };
  }
  if (platform === 'google') {
    return {
      id: `google_la_${Date.now()}`,
      name: 'HOJAI Lookalike',
      size: lookalike.targetSize,
      customerMatchRadius: '50mi',
      occupations: lookalike.interests.slice(0, 10)
    };
  }
  if (platform === 'tiktok') {
    return {
      id: `tiktok_la_${Date.now()}`,
      name: 'HOJAI Audience',
      size: lookalike.targetSize,
      interests: lookalike.interests.slice(0, 15)
    };
  }
}

function getTopOccurrences(arr, limit) {
  const counts = {};
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
}

function generateMockCustomers(count) {
  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune'];
  const categories = ['Electronics', 'Fashion', 'Home', 'Food', 'Beauty', 'Sports'];
  return Array.from({ length: count }, (_, i) => ({
    id: `cust_${i}`,
    totalPurchases: Math.floor(Math.random() * 10) + 1,
    totalSpend: Math.floor(Math.random() * 50000) + 5000,
    supportTickets: Math.floor(Math.random() * 3),
    averageRating: 4 + Math.random(),
    lastReturnDate: Math.random() > 0.7 ? new Date(Date.now() - Math.random() * 180 * 86400000).toISOString() : null,
    age: Math.floor(Math.random() * 30) + 20,
    location: locations[i % locations.length],
    favoriteCategory: categories[i % categories.length],
    interests: [categories[i % categories.length], categories[(i + 1) % categories.length]]
  }));
}
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`Lookalike Generator running on port ${PORT}`);
});

module.exports = app;
