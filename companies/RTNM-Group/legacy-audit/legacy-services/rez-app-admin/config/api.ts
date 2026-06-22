import Constants from 'expo-constants';
import { logger } from '../utils/logger';

// Environment detection
const isDevelopment = process.env.EXPO_PUBLIC_ENVIRONMENT !== 'production';
const isProduction = process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';

// Production guard: warn if API URL env var is missing
if (!process.env.EXPO_PUBLIC_API_URL && !__DEV__) {
  logger.error('[CRITICAL] EXPO_PUBLIC_API_URL not set in production!');
}

// Extract BASE_URL as a standalone constant to break circular reference in API_CONFIG
const _computedBaseUrl = (() => {
  const url =
    Constants.expoConfig?.extra?.apiBaseUrl ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL;
  if (isProduction && !url) {
    throw new Error(
      '[ADMIN API] FATAL: Production must have EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_API_URL set'
    );
  }
  const finalUrl = url || (isDevelopment ? 'http://localhost:5001/api' : null);
  if (!finalUrl) {
    throw new Error('[ADMIN API] FATAL: API URL must be configured');
  }
  if (isProduction && !finalUrl.startsWith('https://')) {
    throw new Error(`[ADMIN API] FATAL: Production API URL must use HTTPS. Got: ${finalUrl}`);
  }
  return finalUrl;
})();

// Extract SOCKET_URL using the computed base URL instead of referencing API_CONFIG
const _computedSocketUrl = (() => {
  const explicitUrl = Constants.expoConfig?.extra?.socketUrl || process.env.EXPO_PUBLIC_SOCKET_URL;
  if (explicitUrl) return explicitUrl;
  // Strip /api suffix from BASE_URL to get the socket.io host
  const socketHost = _computedBaseUrl.endsWith('/api')
    ? _computedBaseUrl.slice(0, -4)
    : _computedBaseUrl;
  if (isProduction) {
    if (!socketHost.startsWith('https://')) {
      throw new Error(`[ADMIN API] FATAL: Production socket host must use HTTPS. Got: ${socketHost}`);
    }
    return socketHost;
  }
  return 'http://localhost:5001';
})();

// API Configuration
export const API_CONFIG = {
  BASE_URL: _computedBaseUrl,
  DEV_URL: process.env.EXPO_PUBLIC_DEV_API_URL || 'http://localhost:5001/api',
  PROD_URL: process.env.EXPO_PUBLIC_PROD_API_URL || null,
  TIMEOUT: parseInt(
    Constants.expoConfig?.extra?.apiTimeout || process.env.EXPO_PUBLIC_API_TIMEOUT || '60000'
  ),
  SOCKET_URL: _computedSocketUrl,
  SOCKET_TIMEOUT: parseInt(
    Constants.expoConfig?.extra?.socketTimeout || process.env.EXPO_PUBLIC_SOCKET_TIMEOUT || '5000'
  ),
};

// Helper function to get the correct API URL based on environment
export const getApiUrl = (endpoint?: string): string => {
  const baseUrl = (() => {
    if (isProduction && API_CONFIG.PROD_URL) {
      return API_CONFIG.PROD_URL;
    }
    if (isDevelopment && API_CONFIG.DEV_URL) {
      return API_CONFIG.DEV_URL;
    }
    return API_CONFIG.BASE_URL;
  })();

  if (!endpoint) {
    return baseUrl;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  const fullUrl = `${cleanBaseUrl}/${cleanEndpoint}`;
  if (isDevelopment) {
    logger.info(`🌐 [ADMIN API] Constructed URL: ${fullUrl}`);
  }
  return fullUrl;
};

// Helper function to construct API URLs with endpoint
export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  const baseUrl = API_CONFIG.BASE_URL.endsWith('/')
    ? API_CONFIG.BASE_URL.slice(0, -1)
    : API_CONFIG.BASE_URL;

  const fullUrl = `${baseUrl}/${cleanEndpoint}`;
  if (isDevelopment) {
    logger.info(`🌐 [ADMIN API] Constructed URL: ${fullUrl}`);
  }
  return fullUrl;
};

// Log the current configuration for debugging
if (isDevelopment) {
  logger.info('🔧 [ADMIN API] Configuration:', {
    environment: isProduction ? 'production' : 'development',
    baseUrl: API_CONFIG.BASE_URL,
    devUrl: API_CONFIG.DEV_URL,
    prodUrl: API_CONFIG.PROD_URL,
    timeout: API_CONFIG.TIMEOUT,
    socketUrl: API_CONFIG.SOCKET_URL,
    socketTimeout: API_CONFIG.SOCKET_TIMEOUT,
    resolvedUrl: getApiUrl(),
  });
}
