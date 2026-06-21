import crypto from 'crypto';

export const GUEST_ID_PREFIX = process.env.GUEST_ID_PREFIX || 'GST-';

export function generateGuestId(): string {
  // 8 random alphanumeric characters, uppercase, no easily-confused chars
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += CHARS[bytes[i] % CHARS.length];
  }
  return `${GUEST_ID_PREFIX}${id}`;
}

export function generateRatingId(): string {
  return `RAT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function generateOtp(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(crypto.randomInt(min, max + 1));
}

export function generatePromoCode(): string {
  return `NEXHA${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}
