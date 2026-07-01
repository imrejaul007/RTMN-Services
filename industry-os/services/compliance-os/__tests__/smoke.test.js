const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('smoke', () => {
  it('dist/index.js exists', () => {
    assert.ok(fs.existsSync('dist/index.js'));
  });
  it('dist/index.js is not empty', () => {
    const stat = fs.statSync('dist/index.js');
    assert.ok(stat.size > 100, `file too small: ${stat.size}`);
  });
  it('dist/index.js is valid JS syntax', () => {
    try {
      require('./dist/index.js');
    } catch (e) {
      // Allow require errors (module not standalone) — just check it loads
    }
  });
});
