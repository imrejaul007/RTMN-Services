/**
 * Catalog Routes — Worker marketplace catalog
 */

import { Router } from 'express';
import { WORKER_REGISTRY } from '../registry.js';

const router = Router();

// GET /api/catalog/featured
router.get('/featured', (req, res) => {
  const featured = WORKER_REGISTRY
    .filter(w => ['vendor-acquisition', 'catalog-normalization', 'recommendation'].includes(w.id))
    .map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      price: w.pricing.basePrice,
      popular: true,
      category: w.category,
    }));

  res.json({
    featured,
    total: featured.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/catalog/browse
router.get('/browse', (req, res) => {
  const { category, search, sort } = req.query;

  let workers = [...WORKER_REGISTRY];

  // Filter by category
  if (category) {
    workers = workers.filter(w => w.category === category);
  }

  // Filter by search
  if (search) {
    const s = String(search).toLowerCase();
    workers = workers.filter(
      w =>
        w.name.toLowerCase().includes(s) ||
        w.description.toLowerCase().includes(s) ||
        w.skills.some(skill => skill.name.toLowerCase().includes(s))
    );
  }

  // Sort
  if (sort === 'price_low') {
    workers.sort((a, b) => a.pricing.basePrice - b.pricing.basePrice);
  } else if (sort === 'price_high') {
    workers.sort((a, b) => b.pricing.basePrice - a.pricing.basePrice);
  } else if (sort === 'popular') {
    workers.sort((a, b) => b.skills.length - a.skills.length);
  }

  res.json({
    workers,
    total: workers.length,
    categories: [...new Set(WORKER_REGISTRY.map(w => w.category))],
    timestamp: new Date().toISOString(),
  });
});

// GET /api/catalog/categories
router.get('/categories', (req, res) => {
  const categories = WORKER_REGISTRY.reduce((acc, w) => {
    const cat = w.category;
    if (!acc[cat]) {
      acc[cat] = {
        name: cat,
        count: 0,
        workers: [],
      };
    }
    acc[cat].count += 1;
    acc[cat].workers.push(w.id);
    return acc;
  }, {} as Record<string, any>);

  res.json({
    categories: Object.values(categories),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/catalog/top-rated
router.get('/top-rated', (req, res) => {
  const topRated = WORKER_REGISTRY
    .map(w => ({
      ...w,
      rating: 4.5 + Math.random() * 0.5,
      installs: Math.floor(Math.random() * 10000) + 1000,
    }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  res.json({
    topRated,
    timestamp: new Date().toISOString(),
  });
});

export default router;
