/**
 * WAF — OWASP Top 10 Protection
 * Blocks SQL injection, XSS, path traversal, command injection
 */

import type { Middleware } from 'itty-router';

type WAFRule = {
  pattern: RegExp;
  name: string;
  severity: 'block' | 'log' | 'allow';
};

const WAF_RULES: WAFRule[] = [
  // ── SQL Injection ────────────────────────────────────────────────
  {
    name: 'SQL Injection — UNION-based',
    pattern: /(\bunion\b.*\bselect\b|\bunion\b.*\ball\b)/i,
    severity: 'block',
  },
  {
    name: 'SQL Injection — OR-based',
    pattern: /(\bor\b\s*\d+\s*=\s*\d+|\bor\b\s*'\w+'\s*=\s*')/i,
    severity: 'block',
  },
  {
    name: 'SQL Injection — DROP/DELETE',
    pattern: /(\bdrop\b\s*\btable\b|\bdelete\b\s*\bfrom\b|\binsert\b\s*\binto\b|\bupdate\b\s*\bset\b)/i,
    severity: 'block',
  },
  {
    name: 'SQL Injection — comment injection',
    pattern: /(--|\#|\/\*|\*\/)/,
    severity: 'block',
  },
  {
    name: 'SQL Injection — hex encoding',
    pattern: /(0x[0-9a-f]+)/i,
    severity: 'log',
  },

  // ── XSS ────────────────────────────────────────────────────────
  {
    name: 'XSS — script tag',
    pattern: /<script[^>]*>.*?<\/script>/gi,
    severity: 'block',
  },
  {
    name: 'XSS — event handlers',
    pattern: /\bon\w+\s*=/gi,
    severity: 'block',
  },
  {
    name: 'XSS — javascript: URI',
    pattern: /javascript\s*:/gi,
    severity: 'block',
  },
  {
    name: 'XSS — data: URI',
    pattern: /data\s*:\s*text\/html/gi,
    severity: 'block',
  },
  {
    name: 'XSS — SVG injection',
    pattern: /<svg[^>]*>.*?<\/svg>/gi,
    severity: 'block',
  },
  {
    name: 'XSS — template literals',
    pattern: /\{\{.*?\}\}/g,
    severity: 'log',
  },

  // ── Path Traversal ──────────────────────────────────────────────
  {
    name: 'Path Traversal — Unix',
    pattern: /(\.\.\/|\.\.\/|\%2e\%2e\%2f|\%2e\%2e\/|\.\.%2f)/gi,
    severity: 'block',
  },
  {
    name: 'Path Traversal — Windows',
    pattern: /(\.\.\\|\%2e\%2e\\)/gi,
    severity: 'block',
  },
  {
    name: 'Path Traversal — null byte',
    pattern: /(\%00|\x00)/,
    severity: 'block',
  },

  // ── Command Injection ─────────────────────────────────────────
  {
    name: 'Command Injection — shell metacharacters',
    pattern: /([;&|`$(){}[\]<>!#*?])/,
    severity: 'block',
  },
  {
    name: 'Command Injection — pipe',
    pattern: /\|/,
    severity: 'log',
  },

  // ── Protocol Attacks ──────────────────────────────────────────
  {
    name: 'HTTP Smuggling — CL:0',
    pattern: /content-length\s*:\s*0/gi,
    severity: 'block',
  },
  {
    name: 'HTTP Smuggling — Transfer encoding',
    pattern: /transfer-encoding\s*:\s*chunked/gi,
    severity: 'log',
  },
];

interface WAFResult {
  passed: boolean;
  violations: Array<{ name: string; severity: string; matched: string }>;
}

/**
 * Check a string against all WAF rules
 */
function checkWAF(value: string, rules: WAFRule[]): WAFResult {
  const violations: WAFResult['violations'] = [];

  for (const rule of rules) {
    const matches = value.match(rule.pattern);
    if (matches) {
      violations.push({
        name: rule.name,
        severity: rule.severity,
        matched: matches[0]?.slice(0, 50) || '(pattern match)',
      });

      // Block immediately on high-severity violations
      if (rule.severity === 'block') {
        return { passed: false, violations };
      }
    }
  }

  return { passed: violations.length === 0, violations };
}

export function withWAF(): Middleware {
  return async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response | undefined> => {
    const url = new URL(request.url);
    const method = request.method;

    // Only check non-GET requests (GET bodies are unusual)
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await request.text();

        // Check URL path
        const pathCheck = checkWAF(url.pathname, WAF_RULES);
        // Check query string
        const queryCheck = checkWAF(url.search, WAF_RULES);
        // Check body
        const bodyCheck = checkWAF(body, WAF_RULES);

        const allViolations = [
          ...pathCheck.violations,
          ...queryCheck.violations,
          ...bodyCheck.violations,
        ];

        // Log all violations
        if (allViolations.length > 0) {
          console.warn('[WAF] Violations detected:', {
            ip: request.headers.get('CF-Connecting-IP'),
            path: url.pathname,
            violations: allViolations,
          });
        }

        // Block requests with high-severity violations
        const hasBlockingViolation = allViolations.some(v => v.severity === 'block');
        if (hasBlockingViolation) {
          return new Response(JSON.stringify({
            error: 'Forbidden',
            message: 'Request blocked by security policy.',
            code: 'WAF_BLOCK',
            blockedAt: new Date().toISOString(),
          }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'X-WAF-Blocked': 'true',
              'X-WAF-Violation': allViolations.find(v => v.severity === 'block')?.name || 'UNKNOWN',
              'Cache-Control': 'no-store',
            },
          });
        }
      } catch {
        // Body is not text — skip body checks
      }
    }

    // Continue to next middleware/handler
    return undefined;
  };
}
