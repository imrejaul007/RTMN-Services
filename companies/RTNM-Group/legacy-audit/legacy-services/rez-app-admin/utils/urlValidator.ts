/**
 * utils/urlValidator.ts
 *
 * URL validation utilities for BUG-005: Linking.openURL URL scheme validation.
 *
 * Server-returned URLs passed to Linking.openURL must be validated to prevent:
 * - javascript:, file:, or other dangerous URI schemes
 * - SSRF attacks via internal hostnames (localhost, 127.0.0.1, etc.)
 * - Phishing URLs with lookalike domains
 */

/**
 * Validates a URL before passing it to Linking.openURL.
 *
 * Security checks:
 * - URL must be a non-empty string under 500 chars
 * - Protocol must be https:// (http:// allowed only in __DEV__)
 * - Dangerous schemes (javascript:, file:, tel:, sms:, etc.) are rejected
 * - Blocked hostnames: localhost, 127.0.0.1, 0.0.0.0, ::1
 *
 * @param url - The URL to validate
 * @returns true if the URL is safe to open with Linking.openURL
 */
export function isAllowedOpenUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string' || url.length > 500) return false;

  try {
    const u = new URL(url);

    // Block all non-http(s) schemes. This catches javascript:, file:, tel:,
    // sms:, app-scheme:, and any other potentially dangerous URI schemes.
    const dangerousProtocols = [
      'javascript:',
      'file:',
      'tel:',
      'sms:',
      'mailto:',
      'ftp:',
      'data:',
      'blob:',
    ];
    if (dangerousProtocols.some((scheme) => u.protocol === scheme)) {
      return false;
    }

    // Production: require https only. Dev: allow http too.
    if (u.protocol === 'http:') {
      return !!__DEV__;
    }
    if (u.protocol !== 'https:') {
      return false;
    }

    // Block internal/network hostnames
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blockedHosts.includes(u.hostname)) {
      return !!__DEV__;
    }

    return true;
  } catch {
    return false;
  }
}
