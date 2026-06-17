/**
 * Config
 */
export const config = {
  port: parseInt(process.env.PORT || '4970', 10),
  nodeEnv: process.env.NODE_ENV || 'development'
};
export function validateConfig() {
  console.log('[Config] Verification service configuration loaded');
}
