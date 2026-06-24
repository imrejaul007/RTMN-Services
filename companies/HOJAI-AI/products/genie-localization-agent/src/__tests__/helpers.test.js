const { test } = require('node:test');
const assert = require('node:assert/strict');

const { detectLanguage, applyIdioms, analyzeBrandVoice, LANGUAGES } = require('../index.js');

// ─── detectLanguage ────────────────────────────────────────────────────

test('detectLanguage: English default', () => {
  assert.equal(detectLanguage('This is a test message.'), 'en');
});

test('detectLanguage: French via "le" "la"', () => {
  assert.equal(detectLanguage("C'est une belle journée et le soleil brille"), 'fr');
});

test('detectLanguage: Spanish via "el" "una"', () => {
  assert.equal(detectLanguage('El gato y una mesa están en la cocina'), 'es');
});

test('detectLanguage: German via "der" "ist"', () => {
  assert.equal(detectLanguage('Der Hund ist groß und das Auto ist schnell'), 'de');
});

test('detectLanguage: Italian via distinctive words', () => {
  assert.equal(detectLanguage('Questo è un gatto della nostra famiglia con gli occhi blu'), 'it');
});

test('detectLanguage: Portuguese via distinctive words', () => {
  assert.equal(detectLanguage('O nosso livro está aqui, não está muito longe da nossa casa'), 'pt');
});

test('detectLanguage: Chinese via CJK', () => {
  assert.equal(detectLanguage('你好世界'), 'zh');
});

test('detectLanguage: Japanese via hiragana', () => {
  assert.equal(detectLanguage('こんにちは'), 'ja');
});

test('detectLanguage: Korean via Hangul', () => {
  assert.equal(detectLanguage('안녕하세요 세계'), 'ko');
});

test('detectLanguage: Arabic via Arabic script', () => {
  assert.equal(detectLanguage('مرحبا بالعالم'), 'ar');
});

test('detectLanguage: Hindi via Devanagari', () => {
  assert.equal(detectLanguage('नमस्ते दुनिया'), 'hi');
});

test('detectLanguage: Russian via Cyrillic', () => {
  assert.equal(detectLanguage('Привет мир'), 'ru');
});

// ─── applyIdioms ───────────────────────────────────────────────────────

test('applyIdioms: translates "piece of cake" to French', () => {
  const result = applyIdioms('That test was a piece of cake!', 'fr');
  assert.ok(result.some((r) => r.original === 'piece of cake' && r.localized === "C'est du gâteau"));
});

test('applyIdioms: translates "piece of cake" to German', () => {
  const result = applyIdioms('Piece of cake!', 'de');
  assert.ok(result.some((r) => r.localized === 'Ein Kinderspiel'));
});

test('applyIdioms: translates "break a leg" to French', () => {
  const result = applyIdioms('Break a leg tomorrow!', 'fr');
  assert.ok(result.some((r) => r.localized === 'Merde'));
});

test('applyIdioms: empty for non-idiom text', () => {
  const result = applyIdioms('This is a normal sentence.', 'fr');
  assert.equal(result.length, 0);
});

test('applyIdioms: returns empty for unsupported target language', () => {
  const result = applyIdioms('That was a piece of cake', 'sw');
  assert.equal(result.length, 0);
});

test('applyIdioms: case-insensitive matching', () => {
  const result = applyIdioms('PIECE OF CAKE!', 'fr');
  assert.ok(result.length > 0);
});

// ─── analyzeBrandVoice ─────────────────────────────────────────────────

test('analyzeBrandVoice: detects casual friendly tone', () => {
  const voice = analyzeBrandVoice([
    "Hey there! We're so excited to share what's coming!",
    "Can't wait to show you what we've built! 🎉",
    "Hope you love it as much as we do!"
  ]);
  assert.equal(voice.tone, 'friendly-enthusiastic');
  assert.equal(voice.formality, 'casual');
  assert.equal(voice.enthusiasm, 'high');
});

test('analyzeBrandVoice: detects formal professional tone', () => {
  const voice = analyzeBrandVoice([
    "Our company is committed to delivering excellence to our clients.",
    "We strive to maintain the highest standards in all that we do.",
    "Our products are designed to serve the needs of discerning professionals."
  ]);
  assert.ok(voice.tone.includes('formal'));
  assert.equal(voice.formality, 'formal');
});

test('analyzeBrandVoice: detects themes', () => {
  const voice = analyzeBrandVoice([
    "Innovation drives everything we do. We innovate to stay ahead.",
    "Customer success is our top priority. Our customers love our innovative approach."
  ]);
  assert.ok(voice.themes.length > 0);
  assert.ok(voice.themes.some((t) => t.theme === 'innovation'));
});

test('analyzeBrandVoice: includes summary', () => {
  const voice = analyzeBrandVoice(['Hello world!']);
  assert.ok(voice.summary);
  assert.ok(voice.summary.length > 0);
});

test('analyzeBrandVoice: returns sampleCount', () => {
  const voice = analyzeBrandVoice(['a', 'b', 'c']);
  assert.equal(voice.sampleCount, 3);
});

test('analyzeBrandVoice: requires at least one sample', () => {
  // Test doesn't error on empty (the endpoint rejects, but the helper doesn't crash)
  const voice = analyzeBrandVoice([]);
  assert.equal(voice.sampleCount, 0);
});

// ─── LANGUAGES ─────────────────────────────────────────────────────────

test('LANGUAGES has at least 25 languages', () => {
  assert.ok(Object.keys(LANGUAGES).length >= 25);
});

test('LANGUAGES includes English, Spanish, French, German, Japanese, Chinese', () => {
  for (const code of ['en', 'es', 'fr', 'de', 'ja', 'zh']) {
    assert.ok(LANGUAGES[code], `missing ${code}`);
    assert.ok(LANGUAGES[code].name);
    assert.ok(LANGUAGES[code].nativeName);
  }
});

test('LANGUAGES marks Arabic and Hebrew as RTL', () => {
  assert.equal(LANGUAGES['ar'].rtl, true);
  assert.equal(LANGUAGES['he'].rtl, true);
  assert.equal(LANGUAGES['en'].rtl, false);
});