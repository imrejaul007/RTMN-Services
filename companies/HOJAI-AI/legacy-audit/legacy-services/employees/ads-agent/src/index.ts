/**
 * Ads Agent - Expert Employee
 * Port: 4776
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));
const PORT = 4776;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ads-agent', port: PORT });
});

app.post('/api/ads/copy', (req, res) => {
  const { product, platform } = req.body;
  const templates = {
    google: {
      headlines: [`Buy ${product} Online`, `${product} - Best Price`, `Free Shipping on ${product}`],
      descriptions: [`Shop ${product} at lowest prices. Free delivery.`, `${product} with warranty.`]
    },
    facebook: {
      primary: `${product} - Limited Time Offer!`,
      text: `Get ${product} at amazing prices. Free delivery on orders above ₹999.`,
      cta: 'Shop Now'
    }
  };
  res.json(templates[platform] || templates.google);
});

app.post('/api/ads/campaign', (req, res) => {
  const { objective, budget } = req.body;
  res.json({
    campaignId: `camp_${Date.now()}`,
    objective,
    budget,
    suggestedBid: budget / 1000,
    estimatedReach: budget * 50,
    duration: '30 days'
  });
});

app.listen(PORT, () => {
  console.log(`Ads Agent running on port ${PORT}`);
});
