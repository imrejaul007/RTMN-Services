// Loyalty Manager AI - Port 4790
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4790;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'loyalty-manager', port: PORT });
});

app.post('/api/tiers/calculate', (req, res) => {
  const { points } = req.body;
  const tier = points > 10000 ? 'gold' : points > 5000 ? 'silver' : 'bronze';
  res.json({
    points,
    tier,
    nextTier: 'gold',
    pointsToNext: 10000 - points
  });
});

app.post('/api/rewards/calculate', (req, res) => {
  const { purchaseAmount } = req.body;
  res.json({
    points: Math.floor(purchaseAmount / 100),
    rewardValue: purchaseAmount * 0.05
  });
});

app.listen(PORT, () => {
  console.log(`Loyalty Manager running on port ${PORT}`);
});
