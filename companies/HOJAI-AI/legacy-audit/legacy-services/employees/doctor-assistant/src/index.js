// Doctor Assistant AI - Port 4854
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4854;
app.get('/health', (req, res) => res.json({ status: 'healthy', port: PORT }));
app.post('/api/scribe', (req, res) => res.json({ notes: 'Patient presents with...', summary: 'Generated' }));
app.listen(PORT, () => console.log(`Doctor running on ${PORT}`));