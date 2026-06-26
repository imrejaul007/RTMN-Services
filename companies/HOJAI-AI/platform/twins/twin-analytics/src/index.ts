/**
 * Twin Analytics - Port: 4772
 * Analytics and insights
 */

import express from 'express';
const app = express();
const PORT = parseInt(process.env.PORT || '4772', 10);
app.use(express.json());

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'twin-analytics' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/analytics/:employeeId/insights', (req, res) => {
  res.json({ success: true, data: { employeeId: req.params.employeeId, insights: [], trends: {} } });
});

app.get('/api/analytics/:employeeId/productivity', (req, res) => {
  res.json({ success: true, data: { employeeId: req.params.employeeId, score: 85, improvement: 12 } });
});

const server = app.listen(PORT, () => console.log(`Twin Analytics - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
