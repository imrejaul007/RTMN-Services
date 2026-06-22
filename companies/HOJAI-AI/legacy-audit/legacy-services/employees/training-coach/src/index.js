// Training Coach AI - Port 4807
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4807;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'training-coach', port: PORT });
});

app.post('/api/training/recommend', (req, res) => {
  const { employeeId } = req.body;
  res.json({ employeeId, courses: ['Leadership 101', 'Communication Skills'], priority: 'high' });
});

app.post('/api/training/progress', (req, res) => {
  const { employeeId } = req.body;
  res.json({ employeeId, completed: 3, inProgress: 2, score: 85 });
});

app.listen(PORT, () => {
  console.log(`Training Coach running on port ${PORT}`);
});
