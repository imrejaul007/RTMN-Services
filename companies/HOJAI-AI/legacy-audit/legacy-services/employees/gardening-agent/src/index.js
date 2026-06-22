// Gardening Agent AI - Port 4850
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4850;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/schedule', (req, res) => res.json({ scheduleId: `G-${Date.now()}`, nextService: 'Tomorrow' }));
app.listen(PORT, () => console.log(`Gardening running on ${PORT}`));