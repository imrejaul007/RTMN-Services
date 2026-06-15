import dotenv from 'dotenv'; dotenv.config();
export const config = {
  port: parseInt(process.env.PORT || '4196'),
  serviceName: 'rez-breach-detector', version: '1.0.0', environment: process.env.NODE_ENV || 'development',
  slaMonitorUrl: process.env.SLA_MONITOR_URL || 'http://localhost:4195',
  eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  detectionIntervalMs: parseInt(process.env.DETECTION_INTERVAL_MS || '30000'),
};
export default config;
