/**
 * Tests for @hojai/widget-react public surface.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = globalThis.window || {};
globalThis.document = globalThis.document || {
    createElement: () => ({
        setAttribute: () => { },
        classList: { add: () => { }, remove: () => { }, contains: () => false },
        style: {},
        appendChild: () => { },
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => { },
        removeEventListener: () => { },
        set innerHTML(_) { },
        get innerHTML() { return ''; }
    }),
    body: { appendChild: () => { } },
    head: { appendChild: () => { } },
    querySelector: () => null,
    addEventListener: () => { },
    getElementsByTagName: () => []
};
test('module exports HojaiChat, useHojaiWidget', async () => {
    const mod = await import('../index.js');
    assert.ok(mod.HojaiChat, 'HojaiChat should be exported');
    assert.equal(typeof mod.useHojaiWidget, 'function', 'useHojaiWidget should be a function');
});
test('HojaiWidget re-exported from @hojai/widget-core', async () => {
    const mod = await import('../index.js');
    const coreMod = await import('@hojai/widget-core');
    assert.equal(mod.HojaiWidget, coreMod.HojaiWidget);
});
test('HojaiChat renders without throwing (server-side)', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');
    const { HojaiChat } = await import('../index.js');
    const el = React.createElement(HojaiChat, {
        apiKey: 'pk_live_x',
        companyId: 'maya',
        config: { name: 'Maya Assistant', color: '#FF0000' }
    });
    const html = ReactDOMServer.renderToString(el);
    assert.ok(html, 'renderToString should return a string');
    assert.ok(html.length > 0);
});
