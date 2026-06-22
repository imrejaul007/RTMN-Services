/**
 * Hojai Model Registry Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '4711', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: 'hojai-model-registry',
  version: '1.0.0',
};

export default config;
