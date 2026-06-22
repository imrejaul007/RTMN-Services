// Housekeeping Agent AI - Port 4845
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4845;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/assign', (req, res) => res.json({ taskId: `HK-${Date.now()}`, room: '201', assignedTo: 'Maria' }));
app.listen(PORT, () => console.log(`Housekeeping running on port ${PORT}`));