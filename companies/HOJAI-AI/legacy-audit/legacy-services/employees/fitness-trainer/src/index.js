// Fitness Trainer AI - Port 4836
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4836;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/workout', (req, res) => res.json({ planId: `WP-${Date.now()}`, exercises: ['Squats', 'Lunges'], status: 'created' }));
app.listen(PORT, () => console.log(`Fitness Trainer running on port ${PORT}`));