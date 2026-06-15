/**
 * Validators for Indian business identity numbers
 * Format-only validation - real verification requires GSTN API integration
 */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

export function isValidGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.toUpperCase());
}

export function isValidPAN(pan: string): boolean {
  if (!pan) return false;
  return PAN_REGEX.test(pan.toUpperCase());
}

export function isValidIFSC(ifsc: string): boolean {
  if (!ifsc) return false;
  return IFSC_REGEX.test(ifsc.toUpperCase());
}

export function isValidPincode(pincode: string): boolean {
  if (!pincode) return false;
  return PINCODE_REGEX.test(pincode);
}

export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-]/g, '').replace(/^\+?91/, '');
  return PHONE_REGEX.test(cleaned);
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-]/g, '').replace(/^\+?91/, '');
  return cleaned.length === 10 ? cleaned : phone;
}

/**
 * Validate the GSTIN check digit using the Luhn-like mod 36 algorithm
 * defined by the Indian GST Network. This is a stronger format check
 * than the regex alone.
 */
export function isValidGSTINChecksum(gstin: string): boolean {
  if (!isValidGSTIN(gstin)) return false;
  const chars = gstin.toUpperCase();
  const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const charValues: Record<string, number> = {};
  for (let i = 0; i < ALPHABET.length; i++) charValues[ALPHABET[i]] = i;

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let val = charValues[chars[i]];
    if (i % 2 === 0) {
      val = val * 2;
      if (val > 35) val = Math.floor(val / 10) + (val % 10);
    }
    sum += val;
  }
  const checkDigit = (36 - (sum % 36)) % 36;
  return checkDigit === charValues[chars[14]];
}
