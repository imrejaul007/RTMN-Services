/**
 * Twin Dashboard - Port: 4770
 * Unified dashboard for all twins
 */

import express from 'express';
const app = express();
const PORT = parseInt(process.env.PORT || '4770', 10);
app.use(express.json());

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'twin-dashboard' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.get('/api/dashboard/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  res.json({
    success: true,
    data: {
      employeeId,
      overview: { twinsActive: 9, healthScore: 85, productivityGain: 23 },
      twins: {
        communication: { status: 'active', confidence: 78 },
        workflow: { status: 'active', confidence: 65 },
        decision: { status: 'active', confidence: 72 },
        relationship: { status: 'active', confidence: 60 },
        behavioral: { status: 'active', confidence: 55 },
        knowledge: { status: 'active', confidence: 48 },
        reputation: { status: 'active', confidence: 70 }
      }
    }
  });
});

const server = app.listen(PORT, () => console.log(`Twin Dashboard - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
