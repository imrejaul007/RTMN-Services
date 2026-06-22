/**
 * CSV export utility with special character handling
 * ADMIN-014: Properly escape CSV special characters to prevent injection
 */

/**
 * Escape a CSV field value to handle special characters
 * @param value The value to escape
 * @returns Escaped value safe for CSV
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the field contains comma, newline, or double quote, wrap it and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert array of objects to CSV string
 * @param data Array of objects to convert
 * @param headers Optional custom headers, defaults to object keys
 * @returns CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(data: T[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Build header row
  const headerRow = csvHeaders.map((h) => escapeCSVField(h)).join(',');

  // Build data rows
  const dataRows = data.map((row) =>
    csvHeaders.map((header) => escapeCSVField(row[header])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 * @param csv CSV string content
 * @param filename Filename for download
 */
export function downloadCSV(csv: string, filename: string = 'export.csv'): void {
  // Add BOM for UTF-8 encoding (helps with special characters in Excel)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  // Only works in browser/web environments
  if (typeof window !== 'undefined') {
    const nav = navigator as Navigator;
    if ((nav as any).msSaveBlob) {
      // IE 10+
      (nav as any).msSaveBlob(blob, filename);
    } else {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Convert and download CSV in one step
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string = 'export.csv',
  headers?: string[]
): void {
  const csv = arrayToCSV(data, headers);
  downloadCSV(csv, filename);
}
