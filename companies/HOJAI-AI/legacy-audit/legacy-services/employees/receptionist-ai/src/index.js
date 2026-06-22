// AI Receptionist - Port 4783
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4783;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'receptionist-ai', port: PORT });
});

app.post('/api/reception/greet', (req, res) => {
  const { visitorName, purpose } = req.body;
  res.json({
    greeting: `Welcome, ${visitorName}!`,
    message: 'Please have a seat. Someone will be with you shortly.',
    host: 'John will be with you in 5 minutes',
    visitorId: `vis_${Date.now()}`
  });
});

app.post('/api/reception/schedule', (req, res) => {
  const { visitorId, hostId, time } = req.body;
  res.json({
    appointmentId: `apt_${Date.now()}`,
    visitorId,
    hostId,
    time,
    status: 'confirmed',
    notification: 'Host notified'
  });
});

app.post('/api/reception/route', (req, res) => {
  const { query } = req.body;
  const routes = {
    sales: 'Sales team',
    support: 'Support desk',
    billing: 'Accounts'
  };
  const route = routes[query.toLowerCase()] || 'Reception';
  res.json({ routedTo: route });
});

app.listen(PORT, () => {
  console.log(`AI Receptionist running on port ${PORT}`);
});
