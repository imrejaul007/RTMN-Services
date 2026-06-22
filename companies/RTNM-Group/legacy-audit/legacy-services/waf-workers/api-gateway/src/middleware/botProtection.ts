/**
 * Bot Protection — Detect and block automated traffic
 */

import type { Middleware } from 'itty-router';

const BOT_UA_PATTERNS = [
  /curl/i,
  /wget/i,
  /httpie/i,
  /python-requests/i,
  /axios/i,
  /node-fetch/i,
  /got/i,
  /scrapy/i,
  /nmap/i,
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /hydra/i,
  /zap/i,
  /burp/i,
  / OWASP/i,
  /metasploit/i,
  /hydra/i,
];

const SUSPICIOUS_HEADERS = [
  { header: 'X-Requested-With', value: 'XMLHttpRequest', block: false }, // allow AJAX
];

export function withBotProtection(): Middleware {
  return async (request: Request): Promise<Response | undefined> => {
    const ua = request.headers.get('User-Agent') || '';
    const cfScore = request.headers.get('CF-Bot-Score'); // 0-100, higher = more likely bot

    // Block empty User-Agent
    if (!ua.trim()) {
      console.warn('[BotProtection] Empty User-Agent blocked');
      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'User-Agent header is required.',
        code: 'BOT_BLOCKED',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Block known bot tools
    for (const pattern of BOT_UA_PATTERNS) {
      if (pattern.test(ua)) {
        console.warn('[BotProtection] Known bot tool detected:', { ua });
        return new Response(JSON.stringify({
          error: 'Forbidden',
          message: 'Automated requests are not permitted.',
          code: 'BOT_BLOCKED',
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Challenge if Cloudflare Bot Score is high
    if (cfScore) {
      const score = parseInt(cfScore, 10);
      if (score >= 75) {
        console.warn('[BotProtection] High bot score detected:', { score, path: new URL(request.url).pathname });
        return new Response(JSON.stringify({
          error: 'Forbidden',
          message: 'Request flagged as automated. Please complete a challenge.',
          code: 'BOT_CHALLENGE',
        }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'CF-Bot-Score': String(score),
          },
        });
      }
    }

    return undefined;
  };
}
