// Pharmacist AI - Port 4838
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4838;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/interactions', (req, res) => res.json({ safe: true, warnings: [] }));
app.listen(PORT, () => console.log(`Pharmacist running on port ${PORT}`));