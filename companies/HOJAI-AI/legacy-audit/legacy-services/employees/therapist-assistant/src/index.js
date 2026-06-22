// Therapist Assistant AI - Port 4857
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4857;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/notes', (req, res) => res.json({ sessionId: `T-${Date.now()}`, progress: 'documented' }));
app.listen(PORT, () => console.log(`Therapist running on ${PORT}`));