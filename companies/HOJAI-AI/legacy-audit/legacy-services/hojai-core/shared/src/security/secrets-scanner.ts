/**
 * HOJAI AI - Secrets Scanner
 * 
 * Scans code and configs for exposed secrets
 */

import fs from 'fs';
import path from 'path';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium';
  description: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: 'critical',
    description: 'AWS Access Key ID exposed',
  },
  {
    name: 'AWS Secret Key',
    pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/,
    severity: 'critical',
    description: 'AWS Secret Access Key exposed',
  },
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,251}/,
    severity: 'critical',
    description: 'GitHub token exposed',
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    severity: 'critical',
    description: 'Private key exposed',
  },
  {
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey|api_secret)[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/i,
    severity: 'high',
    description: 'Generic API key detected',
  },
  {
    name: 'Generic Secret',
    pattern: /(?:secret|password|passwd|pwd)[=:]\s*['"]?([a-zA-Z0-9_-]{8,})['"]?/i,
    severity: 'high',
    description: 'Password or secret detected',
  },
  {
    name: 'Bearer Token',
    pattern: /Bearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    severity: 'high',
    description: 'Bearer JWT token detected',
  },
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/,
    severity: 'high',
    description: 'Slack token exposed',
  },
  {
    name: 'Stripe Key',
    pattern: /sk_live_[0-9a-zA-Z]{24,}/,
    severity: 'critical',
    description: 'Stripe live key exposed',
  },
  {
    name: 'Database URL',
    pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/i,
    severity: 'critical',
    description: 'Database connection string with credentials',
  },
];

interface ScanResult {
  file: string;
  line: number;
  column: number;
  secret: string;
  pattern: SecretPattern;
  masked: string;
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) return '*'.repeat(secret.length);
  return secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4);
}

export function scanFile(filePath: string): ScanResult[] {
  const results: ScanResult[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      for (const secretPattern of SECRET_PATTERNS) {
        const match = secretPattern.pattern.exec(line);
        if (match) {
          results.push({
            file: filePath,
            line: lineNum + 1,
            column: match.index + 1,
            secret: match[0],
            pattern: secretPattern,
            masked: maskSecret(match[0]),
          });
        }
      }
    }
  } catch (error) {
    // File read error, skip
  }

  return results;
}

export function scanDirectory(dirPath: string, extensions: string[] = ['.ts', '.js', '.json', '.env', '.yaml', '.yml']): ScanResult[] {
  const results: ScanResult[] = [];

  function walkDir(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.name === 'node_modules' || entry.name === '.git') continue;

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            results.push(...scanFile(fullPath));
          }
        }
      }
    } catch {
      // Permission error, skip
    }
  }

  walkDir(dirPath);
  return results;
}

export function generateReport(results: ScanResult[]): string {
  const critical = results.filter(r => r.pattern.severity === 'critical');
  const high = results.filter(r => r.pattern.severity === 'high');
  const medium = results.filter(r => r.pattern.severity === 'medium');

  let report = `# Secrets Scan Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Secrets Found:** ${results.length}\n`;
  report += `- **Critical:** ${critical.length}\n`;
  report += `- **High:** ${high.length}\n`;
  report += `- **Medium:** ${medium.length}\n\n`;

  if (critical.length > 0) {
    report += `## Critical Secrets\n\n`;
    for (const r of critical) {
      report += `- **${r.pattern.name}** in ${r.file}:${r.line}\n`;
      report += `  \`${r.masked}\`\n\n`;
    }
  }

  return report;
}

export default {
  scanFile,
  scanDirectory,
  generateReport,
  SECRET_PATTERNS,
};
