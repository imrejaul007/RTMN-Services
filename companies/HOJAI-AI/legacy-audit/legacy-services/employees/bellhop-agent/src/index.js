// Bellhop Agent AI - Port 4852
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4852;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/deliver', (req, res) => res.json({ requestId: `B-${Date.now()}`, eta: '5 min' }));
app.listen(PORT, () => console.log(`Bellhop running on ${PORT}`));