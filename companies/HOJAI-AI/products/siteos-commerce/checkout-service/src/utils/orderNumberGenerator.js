/**
 * Generate a unique order number
 * Format: HOJAI-{YYYYMMDD}-{6digit}
 */
export function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Generate random 6-digit number
  const randomPart = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `HOJAI-${dateStr}-${randomPart}`;
}

/**
 * Validate order number format
 */
export function isValidOrderNumber(orderNumber) {
  const regex = /^HOJAI-\d{8}-\d{6}$/;
  return regex.test(orderNumber);
}

/**
 * Parse order number to extract date
 */
export function parseOrderNumber(orderNumber) {
  const match = orderNumber.match(/^HOJAI-(\d{4})(\d{2})(\d{2})-\d{6}$/);
  if (!match) return null;

  return {
    year: parseInt(match[1]),
    month: parseInt(match[2]),
    day: parseInt(match[3])
  };
}