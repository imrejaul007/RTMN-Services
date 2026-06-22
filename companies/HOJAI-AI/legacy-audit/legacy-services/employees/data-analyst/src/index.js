// Data Analyst AI - Port 4788
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4788;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'data-analyst', port: PORT });
});

app.get('/api/dashboards/main', (req, res) => {
  res.json({
    metrics: {
      revenue: { value: 500000, change: 12 },
      customers: { value: 1250, change: 8 },
      conversion: { value: 3.2, change: -2 },
      retention: { value: 68, change: 5 }
    }
  });
});

app.post('/api/query', (req, res) => {
  const { question } = req.body;
  res.json({
    question,
    answer: 'Based on the data, Q1 showed 15% growth.',
    visualization: 'bar_chart'
  });
});

app.listen(PORT, () => {
  console.log(`Data Analyst running on port ${PORT}`);
});
