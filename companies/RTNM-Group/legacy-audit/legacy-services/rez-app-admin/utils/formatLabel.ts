/**
 * Format label by converting underscores to spaces and capitalizing words
 * e.g., "drive_thru" -> "Drive Thru", "pending_payment" -> "Pending Payment"
 */
export const formatLabel = (value: string): string => {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
