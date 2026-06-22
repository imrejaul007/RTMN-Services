// Mental Health Advisor AI - Port 4837
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4837;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/wellness/check', (req, res) => res.json({ score: 75, recommendations: ['Meditation', 'Breathing exercises'] }));
app.listen(PORT, () => console.log(`Mental Health Advisor running on port ${PORT}`));