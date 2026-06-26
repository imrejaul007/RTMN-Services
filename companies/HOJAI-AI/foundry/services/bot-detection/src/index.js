/**
 * HOJAI Studio - Bot Detection Service
 * Protect against automated attacks
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4782;
app.use(express.json());

const detections = []; // bot detections
const patterns = [
  { type: 'user_agent', pattern: 'bot|crawler|spider|scraper', score: 30 },
  { type: 'behavior', pattern: 'rapid_fire', score: 40 },
  { type: 'headless', pattern: 'selenium|phantom|puppeteer', score: 50 },
  { type: 'proxy', pattern: 'vpn|tor|proxy', score: 20 },
  { type: 'datacenter', pattern: 'datacenter|cloud', score: 15 }
];

// REST API - Check Request
app.post('/api/check', (req, res) => {
  const { ip, userAgent, headers, requestData } = req.body;

  let score = 0;
  const reasons = [];

  // Check user agent
  if (userAgent) {
    patterns.filter(p => p.type === 'user_agent').forEach(p => {
      if (new RegExp(p.pattern, 'i').test(userAgent)) {
        score += p.score;
        reasons.push(`Suspicious UA: ${p.pattern}`);
      }
    });
  }

  // Check for headless browsers
  if (headers) {
    const webdriver = headers['webdriver'] || headers['x-webdriver'];
    if (webdriver) { score += 50; reasons.push('Webdriver detected'); }

    const selenium = headers['selenium'] || headers['__selenium_evaluate'];
    if (selenium) { score += 50; reasons.push('Selenium detected'); }
  }

  // Check for missing headers
  const normalHeaders = ['accept', 'accept-language', 'accept-encoding'];
  if (headers) {
    normalHeaders.forEach(h => {
      if (!headers[h.toLowerCase()] && !headers[h]) {
        score += 5;
        reasons.push(`Missing header: ${h}`);
      }
    });
  }

  const isBot = score >= 50;
  const detection = {
    id: uuidv4(),
    ip,
    score,
    isBot,
    reasons,
    action: isBot ? 'block' : 'allow',
    timestamp: new Date().toISOString()
  };

  if (isBot) detections.push(detection);

  res.json(detection);
});

// REST API - Verify Challenge (CAPTCHA)
app.post('/api/challenge', (req, res) => {
  const { token } = req.body;
  // In production, verify with reCAPTCHA/hCaptcha
  res.json({ valid: Math.random() > 0.2, token });
});

// REST API - Analytics
app.get('/api/analytics', (req, res) => {
  const { period = '24h' } = req.query;
  const cutoff = Date.now() - (period === '24h' ? 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000);
  const recent = detections.filter(d => new Date(d.timestamp) > cutoff);

  res.json({
    period,
    total: recent.length,
    byReason: recent.reduce((acc, d) => {
      d.reasons.forEach(r => { acc[r] = (acc[r] || 0) + 1; });
      return acc;
    }, {}),
    blockRate: `${(recent.length / (recent.length + 10000) * 100).toFixed(2)}%`
  });
});

// REST API - Add Pattern
app.post('/api/patterns', (req, res) => {
  const { type, pattern, score } = req.body;
  patterns.push({ id: uuidv4(), type, pattern, score });
  res.json({ added: true, patterns: patterns.length });
});

// REST API - Detection History
app.get('/api/detections', (req, res) => {
  const { limit = 100 } = req.query;
  res.json(detections.slice(-parseInt(limit)));
});

// REST API - Whitelist
const whitelist = new Set();
app.post('/api/whitelist', (req, res) => {
  const { ip } = req.body;
  whitelist.add(ip);
  res.json({ whitelisted: ip });
});

app.delete('/api/whitelist/:ip', (req, res) => {
  whitelist.delete(req.params.ip);
  res.json({ removed: true });
});

app.get('/api/whitelist', (req, res) => res.json(Array.from(whitelist)));

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'bot-detection', patterns: patterns.length, detections: detections.length }));
app.listen(PORT, () => console.log(`Bot Detection running on port ${PORT}`));
