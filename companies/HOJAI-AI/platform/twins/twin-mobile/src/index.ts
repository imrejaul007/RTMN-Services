/**
 * Twin Mobile API - Port: 4771
 * Mobile companion app backend
 */

import express from 'express';
const app = express();
const PORT = parseInt(process.env.PORT || '4771', 10);
app.use(express.json());

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'twin-mobile' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/mobile/:employeeId/summary', (req, res) => {
  res.json({ success: true, data: { employeeId: req.params.employeeId, tasks: 5, suggestions: 3, twinStatus: 'active' } });
});

app.post('/api/mobile/:employeeId/voice', (req, res) => {
  res.json({ success: true, data: { transcribed: 'What tasks do I have?', action: 'query_tasks' } });
});

const server = app.listen(PORT, () => console.log(`Twin Mobile API - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
