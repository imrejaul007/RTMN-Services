/**
 * InvestorOS - Complete Investment Management System
 * Port: 4802
 *
 * Modules:
 * - CapTableOS: Shareholders, equity, dilution
 * - FundraisingOS: Deals, SAFEs, YCCSAs
 * - ESOPOS: Options, vesting, exercise
 * - BoardOS: Meetings, resolutions
 * - DataRoomOS: Due diligence
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const PORT = process.env.PORT || 4802;

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

// Routes
const investorRoutes = require('./routes/investorOSRoutes');

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'investor-os',
    version: '1.0.0',
    port: PORT,
    modules: {
      capTable: true,
      fundraising: true,
      esop: true,
      board: true,
      dataRoom: true
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'InvestorOS',
    description: 'Complete investment management system',
    modules: [
      'CapTableOS - Shareholders, equity, dilution',
      'FundraisingOS - Deals, SAFEs, YCCSAs',
      'ESOPOS - Options, vesting, exercise',
      'BoardOS - Meetings, resolutions',
      'DataRoomOS - Due diligence'
    ]
  });
});

// ============================================================
// API ROUTES
// ============================================================

// All routes
app.use('/api', investorRoutes);

// ============================================================
// DASHBOARD ENDPOINTS
// ============================================================

app.get('/api/dashboard/:companyId', (req, res) => {
  // Redirect to routes
  res.redirect(`/api/dashboard/${req.params.companyId}`);
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`\nInvestorOS v1.0.0 running on port ${PORT}`);
  console.log(`\nModules:`);
  console.log(`  CapTableOS - Shareholders, equity, dilution`);
  console.log(`  FundraisingOS - Deals, SAFEs, YCCSAs`);
  console.log(`  ESOPOS - Options, vesting, exercise`);
  console.log(`  BoardOS - Meetings, resolutions`);
  console.log(`  DataRoomOS - Due diligence`);
  console.log(`\nEndpoints:`);
  console.log(`  /api/company/* - Company management`);
  console.log(`  /api/cap-table/* - Cap table operations`);
  console.log(`  /api/rounds/* - Fundraising rounds`);
  console.log(`  /api/safes/* - SAFE investments`);
  console.log(`  /api/esop/* - ESOP grants`);
  console.log(`  /api/board/* - Board meetings`);
  console.log(`  /api/data-rooms/* - Data rooms`);
  console.log(`  /api/dashboard/* - Analytics`);
});

module.exports = app;
