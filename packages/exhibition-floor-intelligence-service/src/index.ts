import express from 'express';

const app = express();
const PORT = 5061;

app.use(express.json());

// Mock data
const heatmaps = [
  { id: '1', zone: 'Hall A', timeRange: 'morning', intensity: 0.75, peakHours: ['10:00-11:00', '14:00-15:00'], avgVisitors: 450 },
  { id: '2', zone: 'Hall B', timeRange: 'afternoon', intensity: 0.85, peakHours: ['13:00-14:00', '15:00-16:00'], avgVisitors: 520 },
  { id: '3', zone: 'Hall C', timeRange: 'evening', intensity: 0.45, peakHours: ['16:00-17:00'], avgVisitors: 180 },
];

const booths = [
  { id: '1', exhibitorId: 'expo_001', name: 'TechCorp Booth', hall: 'A', position: { x: 10, y: 20 }, visits: 234, avgDwellTime: 180 },
  { id: '2', exhibitorId: 'expo_002', name: 'InnovateCo', hall: 'A', position: { x: 15, y: 25 }, visits: 156, avgDwellTime: 120 },
  { id: '3', exhibitorId: 'expo_003', name: 'StartupX', hall: 'B', position: { x: 30, y: 40 }, visits: 89, avgDwellTime: 90 },
];

const routes = [
  { id: '1', from: 'Entrance', to: 'Hall A', distance: '50m', estimatedTime: '2min', popularity: 0.9 },
  { id: '2', from: 'Entrance', to: 'Hall B', distance: '80m', estimatedTime: '3min', popularity: 0.7 },
  { id: '3', from: 'Hall A', to: 'Hall B', distance: '30m', estimatedTime: '1min', popularity: 0.85 },
];

const zones = [
  { id: '1', name: 'Registration', capacity: 100, currentOccupancy: 45, status: 'normal' },
  { id: '2', name: 'Hall A', capacity: 1000, currentOccupancy: 780, status: 'busy' },
  { id: '3', name: 'Hall B', capacity: 800, currentOccupancy: 520, status: 'normal' },
  { id: '4', name: 'Cafeteria', capacity: 200, currentOccupancy: 180, status: 'crowded' },
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-floor-intelligence-service', port: PORT });
});

// Get heatmaps
app.get('/api/heatmaps', (req, res) => {
  const { zone, timeRange } = req.query;
  let filtered = heatmaps;
  if (zone) filtered = filtered.filter(h => h.zone === zone);
  if (timeRange) filtered = filtered.filter(h => h.timeRange === timeRange);
  res.json({ success: true, data: filtered });
});

// Get heatmap by ID
app.get('/api/heatmaps/:id', (req, res) => {
  const heatmap = heatmaps.find(h => h.id === req.params.id);
  if (!heatmap) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Heatmap not found' } });
  }
  res.json({ success: true, data: heatmap });
});

// Get real-time heatmap data
app.get('/api/heatmaps/live', (req, res) => {
  const liveData = zones.map(z => ({
    zone: z.name,
    intensity: z.currentOccupancy / z.capacity,
    currentVisitors: z.currentOccupancy,
    status: z.status,
  }));
  res.json({ success: true, data: liveData });
});

// Get booths
app.get('/api/booths', (req, res) => {
  const { hall } = req.query;
  let filtered = booths;
  if (hall) filtered = filtered.filter(b => b.hall === hall);
  res.json({ success: true, data: filtered });
});

// Get booth by ID
app.get('/api/booths/:id', (req, res) => {
  const booth = booths.find(b => b.id === req.params.id);
  if (!booth) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booth not found' } });
  }
  res.json({ success: true, data: booth });
});

// Get navigation routes
app.get('/api/routes', (req, res) => {
  res.json({ success: true, data: routes });
});

// Calculate route
app.get('/api/routes/navigate', (req, res) => {
  const { from, to } = req.query;
  const route = routes.find(r => r.from === from && r.to === to);
  if (!route) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  }
  res.json({ success: true, data: route });
});

// Get zones
app.get('/api/zones', (req, res) => {
  const { status } = req.query;
  let filtered = zones;
  if (status) filtered = filtered.filter(z => z.status === status);
  res.json({ success: true, data: filtered });
});

// Get zone by ID
app.get('/api/zones/:id', (req, res) => {
  const zone = zones.find(z => z.id === req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Zone not found' } });
  }
  res.json({ success: true, data: zone });
});

// Update zone occupancy (for real-time updates)
app.patch('/api/zones/:id/occupancy', (req, res) => {
  const index = zones.findIndex(z => z.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Zone not found' } });
  }
  zones[index].currentOccupancy = req.body.occupancy;
  const occupancyRate = zones[index].currentOccupancy / zones[index].capacity;
  if (occupancyRate >= 0.9) zones[index].status = 'full';
  else if (occupancyRate >= 0.7) zones[index].status = 'crowded';
  else if (occupancyRate >= 0.5) zones[index].status = 'busy';
  else zones[index].status = 'normal';
  res.json({ success: true, data: zones[index] });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const totalVisitors = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const analytics = {
    totalVisitors,
    totalCapacity,
    overallOccupancy: `${Math.round((totalVisitors / totalCapacity) * 100)}%`,
    zoneBreakdown: zones.map(z => ({
      name: z.name,
      occupancy: `${Math.round((z.currentOccupancy / z.capacity) * 100)}%`,
      status: z.status,
    })),
    topBooths: booths.sort((a, b) => b.visits - a.visits).slice(0, 3).map(b => ({
      name: b.name,
      hall: b.hall,
      visits: b.visits,
      avgDwellTime: `${b.avgDwellTime}s`,
    })),
    busiestTime: '14:00-15:00',
    averageDwellTime: `${Math.round(booths.reduce((sum, b) => sum + b.avgDwellTime, 0) / booths.length)}s`,
  };
  res.json({ success: true, data: analytics });
});

app.listen(PORT, () => {
  console.log(`Exhibition Floor Intelligence Service running on port ${PORT}`);
});

export default app;
