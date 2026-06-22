/**
 * HOJAI Grocery Briefing Service
 * FreshMart 8AM Story: "Good Morning Ramesh"
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

const briefingRoutes = require('./routes/briefing.routes');

const app = express();
const PORT = process.env.PORT || 4708;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hojai-grocery-briefing-service', version: '1.0.0' });
});

app.use('/api/briefing', briefingRoutes);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery-briefing')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Schedule briefings at 8AM daily
cron.schedule('0 8 * * *', async () => {
  console.log('📊 Generating 8AM briefings for all stores...');
  // In production, iterate through all stores and generate briefings
});

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 HOJAI Grocery Briefing Service');
  console.log('📖 FreshMart 8AM: Good Morning Ramesh');
  console.log('═══════════════════════════════════════════════════');
  console.log('Port:', PORT);
  console.log('Endpoints:');
  console.log('  POST /api/briefing/generate');
  console.log('  GET  /api/briefing/:ownerId');
  console.log('  GET  /api/briefing/:ownerId/history');
  console.log('═══════════════════════════════════════════════════');
});

module.exports = app;
