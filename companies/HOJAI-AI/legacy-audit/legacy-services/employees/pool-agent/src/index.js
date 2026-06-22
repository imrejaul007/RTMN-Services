// Pool Agent AI - Port 4851
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4851;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/check', (req, res) => res.json({ status: 'optimal', chlorine: 3.5, ph: 7.2 }));
app.listen(PORT, () => console.log(`Pool running on ${PORT}`));