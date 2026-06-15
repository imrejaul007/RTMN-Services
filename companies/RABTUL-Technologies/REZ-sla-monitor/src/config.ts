import dotenv from 'dotenv';
dotenv.config();
export const config = {
  port: parseInt(process.env.PORT || '4195'),
  serviceName: 'rez-sla-monitor',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  breachDetectorUrl: process.env.BREACH_DETECTOR_URL || 'http://localhost:4196',
  eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  monitoringIntervalMs: parseInt(process.env.MONITORING_INTERVAL_MS || '60000'),
};
export default config;
