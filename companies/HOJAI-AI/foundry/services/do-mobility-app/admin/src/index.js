/**
 * DO Mobility - Admin Dashboard
 * Port: 4612
 */
import express from 'express';
import cors from 'cors';

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

app.use(cors(), express.json());

const PORT = 4612;

// Simulated stats
const stats = {
  activeRides: 47,
  onlineDrivers: 123,
  todayRevenue: 45600,
  todayTrips: 312,
  avgRating: 4.7,
  activeUsers: 1250
};

app.get('/health', (_, res) => res.json({ status: 'ok', app: 'do-mobility-admin', port: PORT }));

app.get('/api/stats', (_, res) => {
  res.json({ success: true, stats });
});

app.get('/api/dashboard', (_, res) => {
  res.json({
    success: true,
    metrics: [
      { label: 'Active Rides', value: stats.activeRides, trend: '+12%' },
      { label: 'Online Drivers', value: stats.onlineDrivers, trend: '+5%' },
      { label: "Today's Revenue", value: `₹${stats.todayRevenue}`, trend: '+18%' },
      { label: "Today's Trips", value: stats.todayTrips, trend: '+15%' },
      { label: 'Avg Rating', value: stats.avgRating, trend: '+0.2' },
      { label: 'Active Users', value: stats.activeUsers, trend: '+8%' }
    ]
  });
});

app.listen(PORT, () => console.log(`
╔═══════════════════════════╗
║  DO Mobility — Admin    ║
║  PORT ${PORT}             ║
╚═══════════════════════════╝
`));

export default app;
