// Laundry Manager AI - Port 4844
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4844;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/pickup', (req, res) => res.json({ orderId: `LD-${Date.now()}`, status: 'scheduled' }));
app.listen(PORT, () => console.log(`Laundry Manager running on port ${PORT}`));