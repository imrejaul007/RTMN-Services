import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4110'),
  serviceName: 'boa-sutar-bridge',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  boaOSUrl: process.env.BOA_OS_URL || 'http://localhost:4100',
  sutarGoalOSUrl: process.env.SUTAR_GOAL_OS_URL || 'http://localhost:4242',
  sutarDecisionEngineUrl: process.env.SUTAR_DECISION_ENGINE_URL || 'http://localhost:4240',
  sutarMonitoringUrl: process.env.SUTAR_MONITORING_URL || 'http://localhost:4255',
  eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '60000'),
  conflictAutoResolve: process.env.CONFLICT_AUTO_RESOLVE !== 'false',
};

export default config;
