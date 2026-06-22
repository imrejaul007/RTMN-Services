// Dentist Assistant AI - Port 4856
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4856;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/records', (req, res) => res.json({ recordId: `D-${Date.now()}`, status: 'created' }));
app.listen(PORT, () => console.log(`Dentist running on ${PORT}`));