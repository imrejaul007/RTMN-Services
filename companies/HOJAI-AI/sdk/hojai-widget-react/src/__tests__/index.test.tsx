/**
 * Tests for @hojai/widget-react public surface.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

(globalThis as any).window = (globalThis as any).window || {};
(globalThis as any).document = (globalThis as any).document || {
  createElement: () => ({
    setAttribute: () => {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    style: {},
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    set innerHTML(_: string) {},
    get innerHTML() { return ''; }
  }),
  body: { appendChild: () => {} },
  head: { appendChild: () => {} },
  querySelector: () => null,
  addEventListener: () => {},
  getElementsByTagName: () => []
};

test('module exports HojaiChat, useHojaiWidget', async () => {
  const mod: any = await import('../index.js');
  assert.ok(mod.HojaiChat, 'HojaiChat should be exported');
  assert.equal(typeof mod.useHojaiWidget, 'function', 'useHojaiWidget should be a function');
});

test('HojaiWidget re-exported from @hojai/widget-core', async () => {
  const mod: any = await import('../index.js');
  const coreMod: any = await import('@hojai/widget-core');
  assert.equal(mod.HojaiWidget, coreMod.HojaiWidget);
});

test('HojaiChat renders without throwing (server-side)', async () => {
  const React = await import('react');
  const ReactDOMServer = await import('react-dom/server');
  const { HojaiChat }: any = await import('../index.js');

  const el = React.createElement(HojaiChat, {
    apiKey: 'pk_live_x',
    companyId: 'maya',
    config: { name: 'Maya Assistant', color: '#FF0000' }
  });
  const html = ReactDOMServer.renderToString(el);
  assert.ok(html, 'renderToString should return a string');
  assert.ok(html.length > 0);
});
