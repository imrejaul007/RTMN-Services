// Nurse Assistant AI - Port 4855
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4855;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/vitals', (req, res) => res.json({ vitalsId: `V-${Date.now()}`, status: 'recorded' }));
app.listen(PORT, () => console.log(`Nurse running on ${PORT}`));