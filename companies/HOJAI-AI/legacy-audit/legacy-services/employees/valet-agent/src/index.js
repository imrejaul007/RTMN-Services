// Valet Agent AI - Port 4847
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4847;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/park', (req, res) => res.json({ ticket: `V-${Date.now()}`, spot: 'A-15' }));
app.listen(PORT, () => console.log(`Valet running on ${PORT}`));