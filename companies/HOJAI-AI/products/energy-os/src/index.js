/**
 * Energy OS - Smart Grid, Renewables, Carbon & Trading
 * Part of RTMN Ecosystem
 */

import express from 'express';
import helmet from 'helmet';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import { smartGridRoutes } from './routes/smartGrid.js';
import { renewableRoutes } from './routes/renewable.js';
import { carbonRoutes } from './routes/carbon.js';
import { tradingRoutes } from './routes/trading.js';
import { energyTwinRoutes } from './routes/energyTwins.js';
import { energyAgentRoutes } from './routes/energyAgents.js';

const app = express();
const PORT = process.env.PORT || 4296;

// Middleware
app.use(cors());
app.use(express.json());

app.use(helmet());

// Request logging
app.use((req, res, next) => {
  console.log(`[Energy OS] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'energy-os',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/smart-grid', smartGridRoutes);
app.use('/api/renewable', renewableRoutes);
app.use('/api/carbon', carbonRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/twins', energyTwinRoutes);
app.use('/api/agents', energyAgentRoutes);

// Dashboard summary
app.get('/api/dashboard', (req, res) => {
  res.json({
    overview: {
      totalGeneration: '2,847 MWh',
      renewablePercentage: 68,
      carbonSaved: '1,423 tons CO2',
      gridStability: 99.2,
      activeTrades: 12,
      savingsUSD: 45600
    },
    generation: {
      solar: { current: '1,245 kW', daily: '8,920 kWh', efficiency: 94 },
      wind: { current: '890 kW', daily: '6,230 kWh', efficiency: 87 },
      hydro: { current: '340 kW', daily: '2,840 kWh', efficiency: 91 },
      battery: { charge: 78, capacity: '4,200 kWh', status: 'discharging' }
    },
    grid: {
      load: '2,415 kW',
      demand: '2,560 kW',
      frequency: 50.02,
      voltage: 415,
      stabilityIndex: 98.7
    },
    carbon: {
      avoided: '1,423 tons',
      target: '2,000 tons',
      progress: 71,
      creditsAvailable: 340,
      creditsValue: 8500
    },
    market: {
      currentPrice: 0.12,
      peakPrice: 0.18,
      averagePrice: 0.14,
      predictions: {
        nextHour: 'stable',
        nextDay: 'increasing'
      }
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Energy OS Error]', err);
  res.status(500).json({ error: 'Internal server error', service: 'energy-os' });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`⚡ Energy OS running on port ${PORT}`);
  console.log(`   Smart Grid: http://localhost:${PORT}/api/smart-grid`);
  console.log(`   Renewables: http://localhost:${PORT}/api/renewable`);
  console.log(`   Carbon: http://localhost:${PORT}/api/carbon`);
  console.log(`   Trading: http://localhost:${PORT}/api/trading`);
  console.log(`   Dashboard: http://localhost:${PORT}/api/dashboard`);
});
installGracefulShutdown(server);

export default app;
