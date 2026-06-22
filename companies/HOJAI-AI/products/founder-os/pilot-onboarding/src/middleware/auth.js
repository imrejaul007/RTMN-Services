import jwt from 'jsonwebtoken';
import store from '../utils/store.js';
import logger from '../utils/logger.js';

export function signToken(client) {
  return jwt.sign(
    { sub: client.id, email: client.email, company: client.companyName },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'Missing bearer token' });

    const payload = jwt.verify(m[1], process.env.JWT_SECRET);
    const client = await store.getClientById(payload.sub);
    if (!client) return res.status(401).json({ error: 'Invalid token' });
    if (client.status !== 'active') return res.status(403).json({ error: 'Account not verified' });

    req.client = client;
    next();
  } catch (err) {
    logger.warn('Auth failure', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
