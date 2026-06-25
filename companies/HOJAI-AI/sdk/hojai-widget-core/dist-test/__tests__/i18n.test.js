/**
 * Tests for i18n + voice modules in HOJAI Widget Core.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStrings, applyI18n, LANGUAGES } from '../i18n.js';
import { createVoiceInput, isVoiceSupported, mapLanguageToSpeech } from '../voice.js';
// ─── i18n ──────────────────────────────────────────────────────────────
test('LANGUAGES has all required languages', () => {
    const required = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'hi', 'ar', 'tr'];
    for (const code of required) {
        assert.ok(LANGUAGES[code], `missing ${code}`);
    }
});
test('LANGUAGES has at least 18 languages', () => {
    assert.ok(Object.keys(LANGUAGES).length >= 18);
});
test('getStrings: returns English bundle for unknown language', () => {
    const s = getStrings('xx');
    assert.equal(s.inputPlaceholder, 'Type your message...');
});
test('getStrings: returns Spanish bundle', () => {
    const s = getStrings('es');
    assert.equal(s.inputPlaceholder, 'Escribe tu mensaje...');
    assert.ok(s.greetingPrefix.includes('Hola'));
});
test('getStrings: returns Chinese bundle', () => {
    const s = getStrings('zh');
    assert.ok(s.inputPlaceholder.includes('输入消息'));
});
test('getStrings: returns Japanese bundle', () => {
    const s = getStrings('ja');
    assert.ok(s.inputPlaceholder.includes('メッセージ'));
});
test('getStrings: returns Arabic bundle (RTL)', () => {
    const s = getStrings('ar');
    assert.ok(s.inputPlaceholder.includes('اكتب'));
});
test('getStrings: every bundle has all required keys', () => {
    const requiredKeys = [
        'inputPlaceholder', 'sendButton', 'closeButton', 'openAriaLabel',
        'typing', 'errorGeneric', 'errorNetwork',
        'voiceNotSupported', 'voiceListening', 'voiceStop', 'voiceError',
        'greetingPrefix'
    ];
    for (const [code, bundle] of Object.entries(LANGUAGES)) {
        for (const key of requiredKeys) {
            assert.ok(bundle[key], `${code}.${key} missing`);
            assert.ok(bundle[key].length > 0, `${code}.${key} is empty`);
        }
    }
});
test('applyI18n: sets input placeholder from bundle', () => {
    const stubInput = { placeholder: '' };
    const stubEl = {
        querySelector: (sel) => sel === '.hojai-input' ? stubInput : null
    };
    applyI18n(stubEl, getStrings('es'));
    assert.equal(stubInput.placeholder, 'Escribe tu mensaje...');
});
test('applyI18n: sets bubble aria-label from bundle', () => {
    let capturedLabel = '';
    const stubBubble = {
        setAttribute: (k, v) => { if (k === 'aria-label')
            capturedLabel = v; }
    };
    const stubEl = {
        querySelector: (sel) => sel === '.hojai-bubble' ? stubBubble : null
    };
    applyI18n(stubEl, getStrings('fr'));
    assert.equal(capturedLabel, 'Ouvrir le chat');
});
// ─── voice ─────────────────────────────────────────────────────────────
test('isVoiceSupported: returns false in non-browser env', () => {
    // No window.SpeechRecognition in node test env
    assert.equal(isVoiceSupported(), false);
});
test('createVoiceInput: returns interface with start/stop/abort', () => {
    const voice = createVoiceInput();
    assert.equal(typeof voice.start, 'function');
    assert.equal(typeof voice.stop, 'function');
    assert.equal(typeof voice.abort, 'function');
    assert.equal(typeof voice.isSupported, 'function');
    assert.equal(typeof voice.isListening, 'function');
});
test('createVoiceInput: isSupported() returns false in node env', () => {
    const voice = createVoiceInput();
    assert.equal(voice.isSupported(), false);
});
test('createVoiceInput: start() emits not-supported error', () => {
    let capturedError = null;
    const voice = createVoiceInput({
        onError: (err) => { capturedError = err; }
    });
    voice.start();
    assert.equal(capturedError, 'not-supported');
});
test('createVoiceInput: start() then stop() does not throw', () => {
    const voice = createVoiceInput();
    voice.start();
    voice.stop(); // should be safe even though no recognition started
});
test('mapLanguageToSpeech: maps common codes to BCP-47', () => {
    assert.equal(mapLanguageToSpeech('en'), 'en-US');
    assert.equal(mapLanguageToSpeech('es'), 'es-ES');
    assert.equal(mapLanguageToSpeech('zh'), 'zh-CN');
    assert.equal(mapLanguageToSpeech('zh-TW'), 'zh-TW');
    assert.equal(mapLanguageToSpeech('ja'), 'ja-JP');
    assert.equal(mapLanguageToSpeech('hi'), 'hi-IN');
    assert.equal(mapLanguageToSpeech('ar'), 'ar-SA');
});
test('mapLanguageToSpeech: falls back to en-US for unknown', () => {
    assert.equal(mapLanguageToSpeech('xyz'), 'en-US');
    assert.equal(mapLanguageToSpeech(''), 'en-US');
});
