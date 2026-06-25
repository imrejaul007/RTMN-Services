"use strict";
/**
 * Tests for the auto-init snippet (used by all installers).
 *
 * Loads the snippet as plain JS and checks it correctly reads both
 * data-* attributes AND window.hojaiWidgetConfig global.
 */
// jsdom-free DOM stub
const domStub = {
    currentScript: {
        getAttribute: (name) => domStub.attrs[name] || null
    },
    attrs: {},
    getElementsByTagName: () => [domStub.currentScript],
    readyState: 'complete',
    addEventListener: () => { },
    body: { appendChild: () => { } },
    head: { appendChild: () => { } },
    createElement: () => ({
        appendChild: () => { },
        setAttribute: () => { },
        set innerHTML(_) { },
        get innerHTML() { return ''; }
    })
};
global.window = global.window || {};
global.document = domStub;
const { test } = require('node:test');
const assert = require('node:assert/strict');
const SNIPPET_PATH = require.resolve('../snippet.js');
// Install a mock HojaiWidget, configure state, then load snippet.
// Returns the captured cfg (or null if no widget was instantiated).
// The caller must set window.HojaiWidget AND any window.hojaiWidgetConfig /
// domStub.attrs BEFORE calling this function.
function withMockWidget() {
    let captured = null;
    const MockWidget = function (cfg) {
        this.cfg = cfg;
        captured = this;
    };
    MockWidget.prototype.render = () => { };
    global.window.HojaiWidget = MockWidget;
    delete require.cache[SNIPPET_PATH];
    delete global.window.HojaiWidgetInstance;
    require('../snippet.js');
    return captured ? captured.cfg : null;
}
// Reset all module-level state and load snippet fresh (no mock widget).
function loadSnippet() {
    delete require.cache[SNIPPET_PATH];
    delete global.window.hojaiWidgetConfig;
    delete global.window.HojaiWidgetInstance;
    require('../snippet.js');
}
test('snippet: warns and returns when neither data-* nor window config present', () => {
    // Make sure no HojaiWidget is set for this test
    delete global.window.HojaiWidget;
    domStub.attrs = {};
    const origWarn = console.warn;
    const warns = [];
    console.warn = (msg) => warns.push(msg);
    try {
        loadSnippet();
        assert.ok(warns.some((w) => w.includes('apiKey and companyId are required')));
    }
    finally {
        console.warn = origWarn;
    }
});
test('snippet: reads apiKey + companyId from data-* attributes', () => {
    domStub.attrs = { 'data-key': 'pk_live_abc', 'data-company': 'maya' };
    const captured = withMockWidget();
    assert.equal(captured.apiKey, 'pk_live_abc');
    assert.equal(captured.companyId, 'maya');
});
test('snippet: reads color, position, name from data-* attributes', () => {
    domStub.attrs = {
        'data-key': 'pk_live_abc',
        'data-company': 'maya',
        'data-color': '#FF0000',
        'data-position': 'bottom-left',
        'data-name': 'Maya Assistant',
        'data-lang': 'hi',
        'data-greeting': 'नमस्ते!'
    };
    const captured = withMockWidget();
    assert.equal(captured.config.color, '#FF0000');
    assert.equal(captured.config.position, 'bottom-left');
    assert.equal(captured.config.name, 'Maya Assistant');
    assert.equal(captured.config.language, 'hi');
    assert.equal(captured.config.greeting, 'नमस्ते!');
});
test('snippet: falls back to window.hojaiWidgetConfig when no data-* attrs', () => {
    domStub.attrs = {};
    global.window.hojaiWidgetConfig = {
        apiKey: 'pk_live_global',
        companyId: 'global-co',
        color: '#00FF00',
        position: 'bottom-right',
        name: 'Global Assistant',
        greeting: 'Welcome!'
    };
    const captured = withMockWidget();
    assert.equal(captured.apiKey, 'pk_live_global');
    assert.equal(captured.companyId, 'global-co');
    assert.equal(captured.config.color, '#00FF00');
    assert.equal(captured.config.greeting, 'Welcome!');
});
test('snippet: accepts snake_case api_key / company_id in global config', () => {
    domStub.attrs = {};
    global.window.hojaiWidgetConfig = {
        api_key: 'pk_live_snake',
        company_id: 'snake-co'
    };
    const captured = withMockWidget();
    assert.equal(captured.apiKey, 'pk_live_snake');
    assert.equal(captured.companyId, 'snake-co');
});
test('snippet: data-* attributes take precedence over window config', () => {
    domStub.attrs = {
        'data-key': 'pk_live_data',
        'data-company': 'data-co',
        'data-color': '#0000FF'
    };
    global.window.hojaiWidgetConfig = {
        apiKey: 'pk_live_global',
        companyId: 'global-co',
        color: '#FF0000'
    };
    const captured = withMockWidget();
    assert.equal(captured.apiKey, 'pk_live_data');
    assert.equal(captured.companyId, 'data-co');
    assert.equal(captured.config.color, '#0000FF');
});
test('snippet: exposes instance as window.HojaiWidgetInstance', () => {
    domStub.attrs = { 'data-key': 'pk_live_abc', 'data-company': 'maya' };
    withMockWidget();
    assert.ok(global.window.HojaiWidgetInstance);
});
test('snippet: strips undefined fields from nested config', () => {
    domStub.attrs = {
        'data-key': 'pk_live_abc',
        'data-company': 'maya',
        'data-color': '#FF0000'
    };
    const captured = withMockWidget();
    assert.equal(captured.config.color, '#FF0000');
    assert.ok(!('position' in captured.config));
    assert.ok(!('name' in captured.config));
    assert.ok(!('greeting' in captured.config));
});
