// Spa Manager AI - Port 4840
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4840;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/book', (req, res) => res.json({ bookingId: `SPA-${Date.now()}`, status: 'confirmed' }));
app.listen(PORT, () => console.log(`Spa Manager running on port ${PORT}`));