/**
 * Output helpers for the CLI.
 *
 * Supports two output modes:
 *   - human (default): colored, pretty-printed tables
 *   - json: machine-readable JSON
 */

const COLOR = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function color(c: keyof typeof COLOR, s: string): string {
  if (process.env.NO_COLOR) return s;
  return `${COLOR[c]}${s}${COLOR.reset}`;
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(rows: Array<Record<string, unknown>>, columns: string[]): void {
  if (rows.length === 0) {
    console.log(color('dim', '(no results)'));
    return;
  }
  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col] = Math.max(col.length, ...rows.map(r => String(r[col] ?? '').length));
  }
  // Header
  const header = columns.map(c => color('bold', c.padEnd(widths[c]))).join('  ');
  console.log(header);
  console.log(color('dim', columns.map(c => '─'.repeat(widths[c])).join('  ')));
  // Rows
  for (const row of rows) {
    const line = columns.map(c => String(row[c] ?? '').padEnd(widths[c])).join('  ');
    console.log(line);
  }
}

export function printSuccess(msg: string): void {
  console.log(`${color('green', '✓')} ${msg}`);
}

export function printError(msg: string): void {
  console.error(`${color('red', '✗')} ${msg}`);
}

export function printInfo(msg: string): void {
  console.log(`${color('cyan', 'ℹ')} ${msg}`);
}

export function printWarn(msg: string): void {
  console.warn(`${color('yellow', '!')} ${msg}`);
}

export function header(text: string): void {
  console.log('');
  console.log(color('bold', color('blue', text)));
  console.log(color('dim', '─'.repeat(text.length)));
}
