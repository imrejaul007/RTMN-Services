// Career Coach AI - Port 4795
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4795;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'career-coach', port: PORT });
});

app.post('/api/career/path', (req, res) => {
  const { userId, skills } = req.body;
  res.json({ userId, paths: [{ title: 'Tech Lead', timeline: '3 years' }] });
});

app.listen(PORT, () => {
  console.log(`Career Coach running on port ${PORT}`);
});
