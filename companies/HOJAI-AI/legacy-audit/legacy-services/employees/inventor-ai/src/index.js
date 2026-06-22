// Inventor AI - Port 4896
const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4896;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'inventor-ai', port: PORT });
});

app.post('/api/invent', (req, res) => {
  const { problem } = req.body;
  res.json({ problem, invention: 'Novel solution', patentable: true });
});

app.listen(PORT, () => {
  console.log(`Inventor AI running on port ${PORT}`);
});
