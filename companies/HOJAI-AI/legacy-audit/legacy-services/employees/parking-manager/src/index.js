// Parking Manager AI - Port 4841
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4841;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/spot', (req, res) => res.json({ spotId: 'A-15', floor: 2, reserved: true }));
app.listen(PORT, () => console.log(`Parking Manager running on port ${PORT}`));