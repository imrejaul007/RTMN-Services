// Sommelier Agent AI - Port 4853
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4853;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/recommend', (req, res) => res.json({ wine: 'Cabernet Sauvignon', pairing: 'Grilled Steak' }));
app.listen(PORT, () => console.log(`Sommelier running on ${PORT}`));