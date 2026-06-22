/**
 * RTMN Shared Security Middleware (CJS mirror)
 *
 * Same API as ./index.js but loadable via require(). Used by the 24 CJS
 * SUTAR services. Keep in sync with the ESM file.
 */

const helmet = require('helmet');
const cors = require('cors');
const express = require('express');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:4399',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:8080',
];

const DEFAULT_JSON_LIMIT = '1mb';

const defaultLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' },
  },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Slow down — rate limit hit.' },
  },
});

function preventPrototypePollution(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete obj[key];
      continue;
    }
    obj[key] = preventPrototypePollution(obj[key]);
  }
  return obj;
}

function sanitiseBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    preventPrototypePollution(req.body);
  }
  next();
}

function setupSecurity(app, options = {}) {
  const {
    serviceName = 'sutar-service',
    corsOrigins = DEFAULT_CORS_ORIGINS,
    jsonLimit = DEFAULT_JSON_LIMIT,
    applyRateLimit = true,
  } = options;

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Id'],
      maxAge: 600,
    })
  );

  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ extended: false, limit: jsonLimit }));
  app.use(sanitiseBody);
  app.use(
    morgan('combined', {
      stream: { write: (msg) => console.log(`[${serviceName}] ${msg.trim()}`) },
    })
  );

  if (applyRateLimit && process.env.NODE_ENV !== 'test') {
    app.use(defaultLimiter);
  }
}

module.exports = {
  setupSecurity,
  defaultLimiter,
  strictLimiter,
  preventPrototypePollution,
  sanitiseBody,
  DEFAULT_CORS_ORIGINS,
  DEFAULT_JSON_LIMIT,
};