/**
 * Date range validation utilities
 * ADMIN-015: Validate date ranges to prevent end before start
 */

/**
 * Validate that end date is after start date
 * @param startDate Start date
 * @param endDate End date
 * @returns true if valid, false if end is before or equal to start
 */
export function isValidDateRange(startDate: Date | string, endDate: Date | string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return end > start;
}

/**
 * Validate and return validation error if invalid
 * @param startDate Start date
 * @param endDate End date
 * @returns Error message or null if valid
 */
export function validateDateRange(startDate: Date | string, endDate: Date | string): string | null {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return 'Invalid start date';
  }

  if (isNaN(end.getTime())) {
    return 'Invalid end date';
  }

  if (end < start) {
    return 'End date must be after start date';
  }

  if (end.getTime() === start.getTime()) {
    return 'End date must be different from start date';
  }

  return null;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
