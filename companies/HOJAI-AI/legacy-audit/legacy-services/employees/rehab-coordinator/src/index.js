// Rehab Coordinator AI - Port 4834
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4834;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/schedule', (req, res) => res.json({ sessionId: `RH-${Date.now()}`, status: 'scheduled' }));
app.listen(PORT, () => console.log(`Rehab Coordinator running on port ${PORT}`));