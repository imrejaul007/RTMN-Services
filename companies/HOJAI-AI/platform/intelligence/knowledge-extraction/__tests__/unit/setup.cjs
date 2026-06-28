/**
 * Test setup — runs BEFORE any test module is loaded (CJS runs before ESM linking).
 * Sets auth bypass env vars so @rtmn/shared/auth createAuthMiddleware
 * returns next() instead of blocking.
 */
'use strict';
process.env.KNOWLEDGE_EXTRACTION_REQUIRE_AUTH = 'false';
process.env.REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';
// PORT intentionally not set — let the app use its default (4784)
