import express from 'express';

const app = express();
const PORT = 5056;

app.use(express.json());

// Mock data
const requests = [
  { id: '1', type: 'power', location: 'Hall A, Booth 5', status: 'pending', priority: 'high' },
  { id: '2', type: 'internet', location: 'Hall B, Booth 12', status: 'approved', priority: 'medium' },
  { id: '3', type: 'furniture', location: 'Hall C, Booth 3', status: 'completed', priority: 'low' },
];

const infrastructure = [
  { id: '1', name: 'Power Supply', available: true, capacity: '500kW', utilized: '320kW' },
  { id: '2', name: 'WiFi Network', available: true, capacity: '10Gbps', utilized: '6Gbps' },
  { id: '3', name: 'HVAC', available: true, capacity: 'Full', utilized: '80%' },
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-venue-ops-service', port: PORT });
});

// Get all requests
app.get('/api/requests', (req, res) => {
  const { status } = req.query;
  const filtered = status ? requests.filter(r => r.status === status) : requests;
  res.json({ success: true, data: filtered });
});

// Create infrastructure request
app.post('/api/requests', (req, res) => {
  const newRequest = {
    id: String(requests.length + 1),
    ...req.body,
    status: 'pending',
  };
  requests.push(newRequest);
  res.status(201).json({ success: true, data: newRequest });
});

// Get request by ID
app.get('/api/requests/:id', (req, res) => {
  const request = requests.find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
  }
  res.json({ success: true, data: request });
});

// Update request status
app.patch('/api/requests/:id', (req, res) => {
  const index = requests.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
  }
  requests[index] = { ...requests[index], ...req.body };
  res.json({ success: true, data: requests[index] });
});

// Get infrastructure status
app.get('/api/infrastructure', (req, res) => {
  res.json({ success: true, data: infrastructure });
});

// Get specific infrastructure item
app.get('/api/infrastructure/:id', (req, res) => {
  const item = infrastructure.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Infrastructure item not found' } });
  }
  res.json({ success: true, data: item });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const analytics = {
    totalRequests: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
    byType: {
      power: requests.filter(r => r.type === 'power').length,
      internet: requests.filter(r => r.type === 'internet').length,
      furniture: requests.filter(r => r.type === 'furniture').length,
    },
    infrastructureHealth: 'operational',
  };
  res.json({ success: true, data: analytics });
});

app.listen(PORT, () => {
  console.log(`Exhibition Venue Ops Service running on port ${PORT}`);
});

export default app;
