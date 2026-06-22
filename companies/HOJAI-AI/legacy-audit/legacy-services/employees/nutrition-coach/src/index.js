// Nutrition Coach AI - Port 4835
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4835;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/meal-plan', (req, res) => res.json({ planId: `NP-${Date.now()}`, calories: 2000, status: 'created' }));
app.listen(PORT, () => console.log(`Nutrition Coach running on port ${PORT}`));