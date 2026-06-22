// Placement Officer AI - Port 4800
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4800;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'placement-officer', port: PORT });
});

app.post('/api/jobs/match', (req, res) => {
  const { studentId } = req.body;
  res.json({ studentId, matches: [{ jobId: 'j1', company: 'Tech Corp', match: 0.88 }] });
});

app.listen(PORT, () => {
  console.log(`Placement Officer running on port ${PORT}`);
});
