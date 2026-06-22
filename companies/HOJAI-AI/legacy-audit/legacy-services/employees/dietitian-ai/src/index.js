// Dietitian AI - Port 4839
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4839;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/diet', (req, res) => res.json({ dietId: `DT-${Date.now()}`, plan: 'Keto', status: 'created' }));
app.listen(PORT, () => console.log(`Dietitian running on port ${PORT}`));