import { Router } from 'express';
const router = Router();

const prices = [
  { commodity: 'Rice', market: 'Bangalore', price: 2500, unit: 'quintal', date: new Date().toISOString() },
  { commodity: 'Wheat', market: 'Bangalore', price: 2100, unit: 'quintal', date: new Date().toISOString() },
  { commodity: 'Tomato', market: 'KR Market', price: 1800, unit: 'quintal', date: new Date().toISOString() },
  { commodity: 'Onion', market: 'KR Market', price: 1500, unit: 'quintal', date: new Date().toISOString() },
  { commodity: 'Potato', market: 'KR Market', price: 1200, unit: 'quintal', date: new Date().toISOString() }
];

router.get('/prices', (req, res) => {
  const { commodity, market } = req.query;
  let filtered = prices;
  if (commodity) filtered = filtered.filter(p => p.commodity.toLowerCase().includes(commodity.toLowerCase()));
  if (market) filtered = filtered.filter(p => p.market.toLowerCase().includes(market.toLowerCase()));
  res.json({ success: true, prices: filtered });
});

router.get('/prices/:commodity', (req, res) => {
  const commodityPrices = prices.filter(p => p.commodity.toLowerCase() === req.params.commodity.toLowerCase());
  if (commodityPrices.length === 0) return res.status(404).json({ error: 'Commodity not found' });

  const avg = commodityPrices.reduce((sum, p) => sum + p.price, 0) / commodityPrices.length;
  res.json({ success: true, commodity: req.params.commodity, avgPrice: avg, markets: commodityPrices });
});

router.get('/trends', (req, res) => {
  res.json({ success: true, trends: [{ commodity: 'Tomato', trend: 'up', change: 5.2 }, { commodity: 'Onion', trend: 'down', change: -2.1 }] });
});

export default router;
