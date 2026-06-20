// Service-to-Service Auth Bridge (4779)
// Issues + verifies JWTs for inter-service auth. HMAC-SHA256 signed.
// Provides a mTLS-equivalent security model without needing cert infrastructure.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 4779;
const SERVICE = 'mtls-jwt-bridge';

// In production this would come from secrets-manager. Use env or fallback.
const SIGNING_SECRET = process.env.SERVICE_SIGNING_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_SEC = parseInt(process.env.TOKEN_TTL_SEC || '3600', 10);

// ---------- In-memory stores ----------
const services = new Map();     // serviceId -> { id, name, scopes, public_key, fingerprint, created }
const tokens = new Map();       // tokenId -> { id, jti, service_id, scopes, expires_at, revoked }
const revocations = new Map();  // jti -> { jti, reason, revoked_at }
const rotationLog = [];         // log of key rotations

// ---------- Token operations ----------
function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    nbf: now,
    exp: now + TOKEN_TTL_SEC,
    jti: uuid()
  };
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(claims)));
  const signature = crypto.createHmac('sha256', SIGNING_SECRET)
    .update(`${headerB64}.${payloadB64}`).digest();
  const sigB64 = base64url(signature);
  return { token: `${headerB64}.${payloadB64}.${sigB64}`, jti: claims.jti, claims };
}

function verify(tokenStr) {
  try {
    const [headerB64, payloadB64, sigB64] = tokenStr.split('.');
    const expectedSig = base64url(
      crypto.createHmac('sha256', SIGNING_SECRET).update(`${headerB64}.${payloadB64}`).digest()
    );
    if (expectedSig !== sigB64) return { valid: false, reason: 'invalid_signature' };
    const claims = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) return { valid: false, reason: 'expired' };
    if (claims.nbf > now) return { valid: false, reason: 'not_yet_valid' };
    if (revocations.has(claims.jti)) return { valid: false, reason: 'revoked' };
    return { valid: true, claims };
  } catch (e) {
    return { valid: false, reason: 'parse_error', error: e.message };
  }
}

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

// ---------- Seed ----------
function seed() {
  const serviceSeeds = [
    { name: 'sales-os', scopes: ['read:customers', 'write:leads', 'read:deals'] },
    { name: 'marketing-os', scopes: ['read:campaigns', 'write:audiences', 'read:analytics'] },
    { name: 'ai-intelligence', scopes: ['invoke:agents', 'read:models', 'write:inference'] },
    { name: 'memory-os', scopes: ['read:memories', 'write:memories', 'forget:memories'] },
    { name: 'twinos-hub', scopes: ['read:twins', 'write:twins', 'invoke:capabilities'] },
    { name: 'unified-os-hub', scopes: ['*'] }
  ];
  serviceSeeds.forEach(s => {
    const id = uuid();
    const pubKey = crypto.randomBytes(32).toString('hex');
    services.set(id, {
      id, ...s,
      public_key: pubKey,
      fingerprint: crypto.createHash('sha256').update(pubKey).digest('hex').slice(0, 16),
      created: new Date().toISOString()
    });
  });
}

// ---------- Routes ----------

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  token_ttl_sec: TOKEN_TTL_SEC,
  endpoints: ['/api/services', '/api/tokens/issue', '/api/tokens/verify', '/api/tokens/:jti/revoke',
              '/api/services/:id/rotate', '/api/keys/fingerprint']
})));

// Service registry
app.get('/api/services', (_req, res) => res.json(ok({ services: [...services.values()] })));
app.get('/api/services/:id', (req, res) => {
  const svc = services.get(req.params.id);
  if (!svc) return res.status(404).json(fail('service not found'));
  res.json(ok({ service: svc }));
});
app.post('/api/services', (req, res) => {
  const { name, scopes = [] } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const pubKey = crypto.randomBytes(32).toString('hex');
  const svc = {
    id, name, scopes,
    public_key: pubKey,
    fingerprint: crypto.createHash('sha256').update(pubKey).digest('hex').slice(0, 16),
    created: new Date().toISOString()
  };
  services.set(id, svc);
  res.status(201).json(ok({ service: svc }));
});

// Token issue
app.post('/api/tokens/issue', (req, res) => {
  const { service_id, scopes, audience = 'rtmn-internal' } = req.body || {};
  if (!service_id) return res.status(400).json(fail('service_id required'));
  const svc = services.get(service_id);
  if (!svc) return res.status(404).json(fail('service not registered'));
  const requestedScopes = scopes || svc.scopes;
  // Check that requested scopes are subset of service scopes (or service has '*')
  if (!svc.scopes.includes('*')) {
    const unauthorized = requestedScopes.filter(s => !svc.scopes.includes(s));
    if (unauthorized.length > 0) {
      return res.status(403).json(fail(`service lacks scopes: ${unauthorized.join(',')}`));
    }
  }
  const { token, jti, claims } = sign({
    sub: svc.name,
    sid: svc.id,
    scopes: requestedScopes,
    aud: audience,
    fp: svc.fingerprint
  });
  tokens.set(jti, {
    id: jti, jti, service_id: svc.id, scopes: requestedScopes,
    expires_at: new Date(claims.exp * 1000).toISOString(), revoked: false
  });
  res.status(201).json(ok({ token, jti, expires_at: claims.exp, scopes: requestedScopes }));
});

// Token verify
app.post('/api/tokens/verify', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json(fail('token required'));
  const result = verify(token);
  if (!result.valid) return res.status(401).json(fail(result.reason));
  res.json(ok({ valid: true, claims: result.claims }));
});

// Token revocation
app.post('/api/tokens/:jti/revoke', (req, res) => {
  const { reason = 'unspecified' } = req.body || {};
  if (!tokens.has(req.params.jti)) return res.status(404).json(fail('token not found'));
  const tok = tokens.get(req.params.jti);
  tok.revoked = true;
  tokens.set(tok.jti, tok);
  revocations.set(req.params.jti, { jti: req.params.jti, reason, revoked_at: new Date().toISOString() });
  res.json(ok({ revoked: true, jti: req.params.jti, reason }));
});

// Key rotation (simulates cert rotation)
app.post('/api/services/:id/rotate', (req, res) => {
  const svc = services.get(req.params.id);
  if (!svc) return res.status(404).json(fail('service not found'));
  const newPubKey = crypto.randomBytes(32).toString('hex');
  const newFp = crypto.createHash('sha256').update(newPubKey).digest('hex').slice(0, 16);
  svc.public_key = newPubKey;
  svc.fingerprint = newFp;
  svc.rotated_at = new Date().toISOString();
  services.set(svc.id, svc);
  rotationLog.push({ service_id: svc.id, service_name: svc.name, new_fingerprint: newFp, ts: new Date().toISOString() });
  res.json(ok({ service: svc, rotated: true }));
});

// Listing revocations
app.get('/api/revocations', (_req, res) => res.json(ok({ revocations: [...revocations.values()] })));
app.get('/api/rotations', (_req, res) => res.json(ok({ rotations: rotationLog })));

// Public key fingerprint (for the caller to include in the verify check)
app.get('/api/keys/fingerprint/:service_id', (req, res) => {
  const svc = services.get(req.params.service_id);
  if (!svc) return res.status(404).json(fail('service not found'));
  res.json(ok({ service_id: svc.id, name: svc.name, fingerprint: svc.fingerprint }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));