/**
 * Hojai AI - Complete Data Connectors Index
 * All 15 sources connected
 */
export { emitHealthSignals } from './src/risacare';
export { emitCommerceSignals } from './src/commerce';
export { emitMobilitySignals } from './src/mobility';
export { emitTravelSignals } from './src/travel';
export { emitHospitalitySignals } from './src/hospitality';
export { emitEmploymentSignals } from './src/employment';
export { emitLocalSignals } from './src/buzzlocal';
export { emitFinanceSignals } from './src/finance';
export { emitRelationshipSignals } from './src/rendez';
export { emitKarmaSignals } from './src/karma';
export { emitCosmicSignals } from './src/cosmic';
export { emitRealEstateSignals } from './src/realestate';
export { emitEventSignals } from './src/events';
export { emitEducationSignals } from './src/campus';
export { emitBusinessSignals } from './src/merchant';


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-data-connectors',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
