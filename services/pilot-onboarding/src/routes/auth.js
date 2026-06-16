import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import store from '../utils/store.js';
import logger from '../utils/logger.js';
import { signupSchema, loginSchema } from '../validators/schemas.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../emails/email.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /v1/auth/signup
router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { email, password, companyName, contactName, phone } = parsed.data;

  const existing = await store.getClientByEmail(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await store.createClient({ email, passwordHash, companyName, contactName, phone });

  // Verification token (24h)
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await store.saveVerificationToken({ clientId: client.id, token, expiresAt });

  const verifyUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/verify?token=${token}`;
  await sendVerificationEmail({ to: email, name: contactName, verifyUrl });

  logger.info(`Client signup: ${email} (id=${client.id})`);
  res.status(201).json({
    id: client.id,
    email: client.email,
    status: client.status,
    message: 'Verification email sent',
    devVerifyUrl: process.env.NODE_ENV === 'development' ? verifyUrl : undefined
  });
});

// GET /v1/auth/verify/:token
router.get('/verify/:token', async (req, res) => {
  const rec = await store.consumeVerificationToken(req.params.token);
  if (!rec) return res.status(400).json({ error: 'Invalid or expired token' });

  const client = await store.verifyClient(rec.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  await sendWelcomeEmail({
    to: client.email,
    name: client.contactName,
    dashboardUrl: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/dashboard`
  });

  res.json({ ok: true, message: 'Email verified', client: { id: client.id, email: client.email, status: client.status } });
});

// POST /v1/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });

  const { email, password } = parsed.data;
  const client = await store.getClientByEmail(email);
  if (!client) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, client.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  if (client.status !== 'active') {
    return res.status(403).json({ error: 'Email not verified', status: client.status });
  }

  const token = signToken(client);
  res.json({
    token,
    client: { id: client.id, email: client.email, company: client.companyName, contact: client.contactName }
  });
});

// GET /v1/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const c = req.client;
  res.json({
    id: c.id, email: c.email, companyName: c.companyName, contactName: c.contactName,
    phone: c.phone, status: c.status, createdAt: c.createdAt, services: c.services
  });
});

export default router;
