const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('smoke', () => {
  it('dist/index.js exists', () => {
    assert.ok(fs.existsSync('dist/index.js'));
  });
  it('dist/index.js is not empty', () => {
    assert.ok(fs.statSync('dist/index.js').size > 100);
  });
  it('shared/auth-middleware.js exists in dist', () => {
    assert.ok(fs.existsSync('dist/shared/auth-middleware.js'));
  });
  it('shared/auth-middleware.js is not empty', () => {
    assert.ok(fs.statSync('dist/shared/auth-middleware.js').size > 100);
  });
});
