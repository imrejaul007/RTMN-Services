/**
 * ComplianceOS - Complete Compliance & Audit System
 * Port: 4803
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const PORT = process.env.PORT || 4803;

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

// Routes
const complianceRoutes = require('./routes/complianceRoutes');

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'compliance-os',
    version: '1.0.0',
    port: PORT,
    modules: {
      auditTrail: true,
      sox: true,
      aml: true,
      kyc: true,
      compliance: true,
      continuousAudit: true
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'ComplianceOS',
    description: 'Complete compliance and audit management system',
    modules: [
      'AuditTrail - Immutable audit logs',
      'SOX Controls - SOX compliance framework',
      'AML - Anti-money laundering monitoring',
      'KYC/KYB - Identity verification',
      'Compliance Tracker - Regulatory compliance',
      'Continuous Audit - Automated testing'
    ]
  });
});

// ============================================================
// API ROUTES
// ============================================================

app.use('/api', complianceRoutes);

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`\nComplianceOS v1.0.0 running on port ${PORT}`);
  console.log(`\nModules:`);
  console.log(`  AuditTrail - Immutable audit logs`);
  console.log(`  SOX Controls - SOX compliance framework`);
  console.log(`  AML - Anti-money laundering monitoring`);
  console.log(`  KYC/KYB - Identity verification`);
  console.log(`  Compliance Tracker - Regulatory compliance`);
  console.log(`  Continuous Audit - Automated testing`);
  console.log(`\nEndpoints:`);
  console.log(`  /api/audit/* - Audit trail`);
  console.log(`  /api/sox/* - SOX controls`);
  console.log(`  /api/aml/* - AML monitoring`);
  console.log(`  /api/kyb/* - KYB verification`);
  console.log(`  /api/compliance/* - Compliance tracker`);
  console.log(`  /api/continuous/* - Continuous audit`);
  console.log(`  /api/dashboard - Compliance dashboard`);
});

module.exports = app;
