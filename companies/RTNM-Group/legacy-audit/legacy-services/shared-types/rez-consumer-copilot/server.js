const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4021;

app.use(cors());
app.use(express.json());

// Serve static files from root directory
app.use(express.static(__dirname));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'rez-consumer-copilot' });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  logger.info(REZ Consumer Copilot running on port ${PORT}`);
});
