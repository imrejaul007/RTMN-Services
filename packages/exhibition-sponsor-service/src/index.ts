import express from 'express';

const app = express();
const PORT = 5055;

app.use(express.json());

// Mock data
const sponsors = [
  { id: '1', name: 'TechCorp', tier: 'platinum', commitment: 50000, roi: 0, booth: 'A1' },
  { id: '2', name: 'InnovateCo', tier: 'gold', commitment: 25000, roi: 0, booth: 'B2' },
  { id: '3', name: 'StartUpX', tier: 'silver', commitment: 10000, roi: 0, booth: 'C3' },
];

const campaigns = [
  { id: '1', sponsorId: '1', type: 'keynote', status: 'active', leads: 0 },
  { id: '2', sponsorId: '2', type: 'booth', status: 'active', leads: 0 },
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-sponsor-service', port: PORT });
});

// Get all sponsors
app.get('/api/sponsors', (req, res) => {
  res.json({ success: true, data: sponsors });
});

// Get sponsor by ID
app.get('/api/sponsors/:id', (req, res) => {
  const sponsor = sponsors.find(s => s.id === req.params.id);
  if (!sponsor) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sponsor not found' } });
  }
  res.json({ success: true, data: sponsor });
});

// Create sponsor
app.post('/api/sponsors', (req, res) => {
  const newSponsor = {
    id: String(sponsors.length + 1),
    ...req.body,
    roi: 0,
  };
  sponsors.push(newSponsor);
  res.status(201).json({ success: true, data: newSponsor });
});

// Get campaigns
app.get('/api/campaigns', (req, res) => {
  res.json({ success: true, data: campaigns });
});

// Create campaign
app.post('/api/campaigns', (req, res) => {
  const newCampaign = {
    id: String(campaigns.length + 1),
    ...req.body,
    leads: 0,
  };
  campaigns.push(newCampaign);
  res.status(201).json({ success: true, data: newCampaign });
});

// Get sponsor ROI
app.get('/api/sponsors/:id/roi', (req, res) => {
  const sponsor = sponsors.find(s => s.id === req.params.id);
  if (!sponsor) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sponsor not found' } });
  }
  const roiData = {
    sponsorId: sponsor.id,
    sponsorName: sponsor.name,
    investment: sponsor.commitment,
    leads: Math.floor(Math.random() * 100),
    conversions: Math.floor(Math.random() * 20),
    estimatedROI: ((Math.random() * 2 - 0.5) * 100).toFixed(2),
  };
  res.json({ success: true, data: roiData });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const analytics = {
    totalSponsors: sponsors.length,
    totalInvestment: sponsors.reduce((sum, s) => sum + s.commitment, 0),
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    averageROI: '12.5',
    sponsorBreakdown: {
      platinum: sponsors.filter(s => s.tier === 'platinum').length,
      gold: sponsors.filter(s => s.tier === 'gold').length,
      silver: sponsors.filter(s => s.tier === 'silver').length,
    },
  };
  res.json({ success: true, data: analytics });
});

app.listen(PORT, () => {
  console.log(`Exhibition Sponsor Service running on port ${PORT}`);
});

export default app;
