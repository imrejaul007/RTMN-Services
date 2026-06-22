// Reporter AI - Port 4871
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4871;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'reporter-ai', port: PORT });
});

app.post('/api/report', (req, res) => {
  const { data } = req.body;
  res.json({ data, report: 'Generated', format: 'PDF' });
});

app.listen(PORT, () => {
  console.log(`Reporter AI running on port ${PORT}`);
});
