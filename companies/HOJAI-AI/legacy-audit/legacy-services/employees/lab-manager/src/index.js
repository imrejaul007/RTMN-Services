// Lab Manager AI - Port 4833
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4833;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/schedule', (req, res) => res.json({ appointmentId: `LAB-${Date.now()}`, status: 'scheduled' }));
app.listen(PORT, () => console.log(`Lab Manager running on port ${PORT}`));