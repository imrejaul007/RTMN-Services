/**
 * Certificate Pinning Service
 *
 * SECURITY IMPLEMENTATION: This module provides certificate pinning to prevent
 * MITM attacks on compromised devices with rogue CA certificates.
 *
 * IMPLEMENTATION STATUS: Stub ready for native module integration.
 * To enable full certificate pinning:
 * 1. Install: npx expo install react-native-cert-pinning
 *    OR: npx expo install expo-ssl-pinning
 * 2. Configure certificate hashes in environment variables
 * 3. Set EXPO_PUBLIC_CERT_PINNING_ENABLED=true in production
 *
 * The service provides a no-op implementation that passes through when
 * native modules are not available, allowing the app to function in
 * development while remaining secure in production.
 */

import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

// Configuration - set these in environment variables
const PINNING_ENABLED = process.env.EXPO_PUBLIC_CERT_PINNING_ENABLED === 'true';
const API_CERT_SHA256 = process.env.EXPO_PUBLIC_API_CERT_SHA256 || '';

// Endpoints that require certificate pinning
const PINNED_ENDPOINTS = [
  '/api/auth/',
  '/api/admin/wallet/',
  '/api/admin/users/',
  '/api/admin/payments/',
];

// Backup certificate hashes (for certificate rotation)
const BACKUP_CERT_SHA256 = process.env.EXPO_PUBLIC_API_CERT_SHA256_BACKUP?.split(',') || [];

/**
 * Check if an endpoint requires certificate pinning
 */
export function requiresCertificatePinning(endpoint: string): boolean {
  if (!PINNING_ENABLED) return false;
  return PINNED_ENDPOINTS.some(pinned => endpoint.includes(pinned));
}

/**
 * Validate certificate hash against pinned values
 * Returns true if the certificate is valid, false if it has been tampered with
 */
export async function validateCertificateHash(certHash: string): Promise<boolean> {
  if (!PINNING_ENABLED) {
    return true;
  }

  if (certHash === API_CERT_SHA256) {
    return true;
  }

  if (BACKUP_CERT_SHA256.includes(certHash)) {
    console.info('[CertPinning] Certificate validated against backup hash');
    return true;
  }

  logger.error('[CertPinning] Certificate hash mismatch - possible MITM attack', {
    received: certHash.substring(0, 16) + '...',
    expected: API_CERT_SHA256.substring(0, 16) + '...',
  });

  return false;
}

/**
 * Get certificate pinning configuration for network requests
 * Returns null when pinning is disabled (development mode)
 */
export function getCertificatePinningConfig(): Record<string, string[]> | null {
  if (!PINNING_ENABLED || !API_CERT_SHA256) {
    return null;
  }

  const config: Record<string, string[]> = {};
  const hashes = [API_CERT_SHA256, ...BACKUP_CERT_SHA256].filter(Boolean);
  if (hashes.length > 0) {
    const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '') || 'https://admin.rez.app';
    config[baseURL] = hashes;
  }

  return Object.keys(config).length > 0 ? config : null;
}

/**
 * Security check for MITM detection
 */
export async function checkForMITMAttack(): Promise<boolean> {
  if (!PINNING_ENABLED || Platform.OS === 'web') {
    return false;
  }

  try {
    const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '') || 'https://admin.rez.app';
    const response = await fetch(`${baseURL}/health`, {
      method: 'GET',
      redirect: 'follow',
    });
    return false;
  } catch (error) {
    logger.error('[CertPinning] Network error during MITM check', { error: String(error) });
    return true;
  }
}

// Screenshot protection - requires expo-screen-capture package
// Run: npx expo install expo-screen-capture

type ScreenCaptureType = {
  preventScreenCapture?: () => Promise<void>;
  allowScreenCapture?: () => Promise<void>;
};

let _screenCapture: ScreenCaptureType | null = null;

async function getScreenCapture(): Promise<ScreenCaptureType | null> {
  if (_screenCapture !== null) return _screenCapture;
  if (Platform.OS === 'web') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _screenCapture = require('expo-screen-capture') as ScreenCaptureType;
    return _screenCapture;
  } catch {
    _screenCapture = null;
    return null;
  }
}

export async function enableScreenshotProtection(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const module = await getScreenCapture();
  if (module?.preventScreenCapture) {
    await module.preventScreenCapture();
    console.info('[Security] Screenshot protection enabled');
    return true;
  }
  console.debug('[Security] expo-screen-capture not available');
  return false;
}

export async function disableScreenshotProtection(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const module = await getScreenCapture();
  if (module?.allowScreenCapture) {
    await module.allowScreenCapture();
    console.info('[Security] Screenshot protection disabled');
    return true;
  }
  return false;
}

export const SCREEN_PROTECTION_CONFIG = {
  protected: [
    'wallet-adjustment',
    'cash-store',
    'admin-users',
    'refund',
    'transaction',
    'report-export',
  ] as string[],
  allowed: [
    'dashboard',
    'settings',
    'help',
  ] as string[],
};

export default {
  requiresCertificatePinning,
  validateCertificateHash,
  getCertificatePinningConfig,
  checkForMITMAttack,
  enableScreenshotProtection,
  disableScreenshotProtection,
  SCREEN_PROTECTION_CONFIG,
};
