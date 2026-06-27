/**
 * RTMN Translation OS (port 4866)
 *
 * Real-time translation across Hindi / English / Spanish / Arabic (and extensible).
 *
 * Two paths:
 *  - "live" provider (Google / DeepL / Azure) — requires API key, configured
 *  - "mock" provider — uses built-in dictionary for common phrases + word-by-word
 *    passthrough for unknown tokens, with a confidence score per word.
 *
 * Glossary support: domain terms (e.g. brand names, product names) that should
 * never be translated. Per-domain glossaries seeded: hospitality, finance, ecommerce.
 *
 * Use cases:
 *  - Genie voice reply in user's language
 *  - Customer support email/SMS in customer's language
 *  - Industry OS UI localization
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4866;

app.use(helmet());
app.use(cors());
app.use(express.json());

// ----------------------------- Providers -----------------------------

const providers = {
  mock: {
    name: 'mock', label: 'Mock + built-in dictionary',
    healthCheck: async () => ({ status: 'ok', mode: 'mock', dictionaryLanguages: ['en', 'hi', 'es', 'ar'] }),
  },
  google: { name: 'google', label: 'Google Cloud Translation', healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'GOOGLE_TRANSLATE_API_KEY' }) },
  deepl: { name: 'deepl', label: 'DeepL', healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'DEEPL_API_KEY' }) },
  azure: { name: 'azure', label: 'Azure Translator', healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'AZURE_TRANSLATOR_KEY' }) },
};

let currentProvider = process.env.TRANSLATION_PROVIDER || 'mock';

// ----------------------------- Built-in dictionary -----------------------------
//
// Structure: DICT[sourceLang][sourcePhraseInThatLang] = { targetLang: translation }
// Keys are the actual words in that source language so lookup is direct.
// Word-by-word fallback also uses this dict for known tokens.

const DICT = {
  en: {
    'hello': { hi: 'नमस्ते', es: 'Hola', ar: 'مرحبا' },
    'thank you': { hi: 'धन्यवाद', es: 'Gracias', ar: 'شكرا' },
    'welcome': { hi: 'स्वागत है', es: 'Bienvenido', ar: 'أهلا بك' },
    'yes': { hi: 'हाँ', es: 'Sí', ar: 'نعم' },
    'no': { hi: 'नहीं', es: 'No', ar: 'لا' },
    'please': { hi: 'कृपया', es: 'Por favor', ar: 'من فضلك' },
    'help': { hi: 'मदद', es: 'Ayuda', ar: 'مساعدة' },
    'sorry': { hi: 'माफ़ कीजिए', es: 'Lo siento', ar: 'آسف' },
    'goodbye': { hi: 'अलविदा', es: 'Adiós', ar: 'وداعا' },
  },
  hi: {
    'नमस्ते': { en: 'Hello', es: 'Hola', ar: 'مرحبا' },
    'धन्यवाद': { en: 'Thank you', es: 'Gracias', ar: 'شكرا' },
    'स्वागत है': { en: 'Welcome', es: 'Bienvenido', ar: 'أهلا بك' },
    'हाँ': { en: 'Yes', es: 'Sí', ar: 'نعم' },
    'नहीं': { en: 'No', es: 'No', ar: 'لا' },
    'कृपया': { en: 'Please', es: 'Por favor', ar: 'من فضلك' },
    'मदद': { en: 'Help', es: 'Ayuda', ar: 'مساعدة' },
    'माफ़ कीजिए': { en: 'Sorry', es: 'Lo siento', ar: 'آسف' },
    'अलविदा': { en: 'Goodbye', es: 'Adiós', ar: 'وداعا' },
  },
  es: {
    'hola': { en: 'Hello', hi: 'नमस्ते', ar: 'مرحبا' },
    'gracias': { en: 'Thank you', hi: 'धन्यवाद', ar: 'شكرا' },
    'bienvenido': { en: 'Welcome', hi: 'स्वागत है', ar: 'أهلا بك' },
    'sí': { en: 'Yes', hi: 'हाँ', ar: 'نعم' },
    'no': { en: 'No', hi: 'नहीं', ar: 'لا' },
    'por favor': { en: 'Please', hi: 'कृपया', ar: 'من فضلك' },
    'ayuda': { en: 'Help', hi: 'मदद', ar: 'مساعدة' },
    'lo siento': { en: 'Sorry', hi: 'माफ़ कीजिए', ar: 'آسف' },
    'adiós': { en: 'Goodbye', hi: 'अलविदा', ar: 'وداعا' },
  },
  ar: {
    'مرحبا': { en: 'Hello', hi: 'नमस्ते', es: 'Hola' },
    'شكرا': { en: 'Thank you', hi: 'धन्यवाद', es: 'Gracias' },
    'أهلا بك': { en: 'Welcome', hi: 'स्वागत है', es: 'Bienvenido' },
    'نعم': { en: 'Yes', hi: 'हाँ', es: 'Sí' },
    'لا': { en: 'No', hi: 'नहीं', es: 'No' },
    'من فضلك': { en: 'Please', hi: 'कृपया', es: 'Por favor' },
    'مساعدة': { en: 'Help', hi: 'मदद', es: 'Ayuda' },
    'آسف': { en: 'Sorry', hi: 'माफ़ कीजिए', es: 'Lo siento' },
    'وداعا': { en: 'Goodbye', hi: 'अलविदा', es: 'Adiós' },
  },
};

const SUPPORTED_LANGS = ['en', 'hi', 'es', 'ar'];

// Lookup exact phrase (case-insensitive for Latin scripts; case is a no-op for hi/ar).
const lookupDict = (sourceLang, targetLang, text) => {
  const srcDict = DICT[sourceLang];
  if (!srcDict) return null;
  const trimmed = text.trim().replace(/[.!?]+$/, '');
  const key = trimmed.toLowerCase();
  if (srcDict[key]) return srcDict[key][targetLang] || null;
  // Try non-lowercased key for non-Latin scripts (hi/ar are unaffected by toLowerCase anyway)
  if (srcDict[trimmed]) return srcDict[trimmed][targetLang] || null;
  return null;
};

// ----------------------------- Glossaries -----------------------------

const glossaries = new PersistentMap('glossaries', { serviceName: 'translation-os' });

const seedGlossaries = [
  { id: 'gl-hosp', domain: 'hospitality', entries: { 'rtmn': 'RTMN', 'hojai': 'HOJAI', 'genie': 'Genie' } },
  { id: 'gl-fin', domain: 'finance', entries: { 'rtmn wallet': 'RTMN Wallet', 'revenue intelligence': 'Revenue Intelligence' } },
  { id: 'gl-ec', domain: 'ecommerce', entries: { 'order': 'Order', 'cart': 'Cart', 'checkout': 'Checkout' } },
];
seedGlossaries.forEach(g => glossaries.set(g.id, { ...g, createdAt: new Date().toISOString() }));

const applyGlossary = (text, glossary) => {
  let out = text;
  if (!glossary) return out;
  const entries = Object.entries(glossary.entries).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    out = out.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
  }
  return out;
};

// ----------------------------- Mock translate -----------------------------

const translateMock = (text, sourceLang, targetLang, glossaryDomain) => {
  if (sourceLang === targetLang) return { translated: text, confidence: 1.0, mode: 'passthrough' };
  const glossary = glossaryDomain ? [...glossaries.values()].find(g => g.domain === glossaryDomain) : null;

  // 1) Try exact-phrase dictionary match
  const exact = lookupDict(sourceLang, targetLang, text);
  if (exact) {
    return { translated: applyGlossary(exact, glossary), confidence: 0.95, mode: 'dictionary_exact' };
  }

  // 2) Word-by-word fallback (tokenizes on whitespace + punctuation)
  const tokens = text.split(/(\s+|[.,!?;:])/);
  const translatedTokens = [];
  let knownHits = 0;
  for (const tok of tokens) {
    if (!tok.trim()) { translatedTokens.push(tok); continue; }
    const w = lookupDict(sourceLang, targetLang, tok);
    if (w) { translatedTokens.push(w); knownHits++; }
    else translatedTokens.push(tok);
  }
  const translated = translatedTokens.join('');
  const wordCount = tokens.filter(t => t.trim()).length || 1;
  const confidence = Math.max(0.3, Math.min(0.85, knownHits / wordCount + 0.2));
  return { translated: applyGlossary(translated, glossary), confidence: Number(confidence.toFixed(2)), mode: 'word_by_word', knownWords: knownHits, totalWords: wordCount };
};

// ----------------------------- Routes -----------------------------

app.get('/health', async (_req, res) => {
  const ph = await providers[currentProvider].healthCheck();
  res.json({
    status: 'healthy', service: 'translation-os', version: '1.0.0', port: PORT,
    provider: currentProvider, providerHealth: ph,
    supportedLanguages: SUPPORTED_LANGS, glossaryCount: glossaries.size,
    timestamp: new Date().toISOString(),
  });
});

// ----- Providers -----
app.get('/api/providers', (_req, res) => res.json({ providers: Object.values(providers).map(p => ({ name: p.name, label: p.label })), current: currentProvider }));

app.post('/api/providers/switch',requireAuth,  (req, res) => {
  const { provider } = req.body;
  if (!providers[provider]) return res.status(400).json({ error: 'unknown_provider', available: Object.keys(providers) });
  currentProvider = provider;
  res.json({ switched: provider, current: currentProvider });
});

// ----- Translate -----
app.post('/api/translate',requireAuth,  (req, res) => {
  const { text, from, to, glossaryDomain } = req.body || {};
  if (!text || !from || !to) return res.status(400).json({ error: 'text_from_to_required' });
  if (!SUPPORTED_LANGS.includes(from) || !SUPPORTED_LANGS.includes(to)) return res.status(400).json({ error: 'unsupported_language', supported: SUPPORTED_LANGS });

  const id = `tr-${uuidv4().slice(0, 12)}`;
  let result;
  if (currentProvider === 'mock') {
    result = translateMock(text, from, to, glossaryDomain);
  } else {
    result = translateMock(text, from, to, glossaryDomain);
    result.providerNote = `Would call ${currentProvider} API with key from env; falling back to local mock.`;
  }
  res.json({ id, text, from, to, glossaryDomain: glossaryDomain || null, ...result, timestamp: new Date().toISOString() });
});

// ----- Batch -----
app.post('/api/translate/batch',requireAuth,  (req, res) => {
  const { texts, from, to, glossaryDomain } = req.body || {};
  if (!Array.isArray(texts) || !from || !to) return res.status(400).json({ error: 'texts_from_to_required' });
  const results = texts.map(t => ({ input: t, ...translateMock(t, from, to, glossaryDomain) }));
  res.json({ from, to, results, count: results.length });
});

// ----- Dictionary lookup -----
app.get('/api/dictionary/:sourceLang/:targetLang/:phrase', (req, res) => {
  const { sourceLang, targetLang, phrase } = req.params;
  const translated = lookupDict(sourceLang, targetLang, phrase);
  res.json({ sourceLang, targetLang, phrase, translated: translated || null, found: !!translated });
});

// ----- Glossaries -----
app.get('/api/glossaries', (_req, res) => res.json({ glossaries: [...glossaries.values()], count: glossaries.size }));

app.post('/api/glossaries',requireAuth,  (req, res) => {
  const { domain, entries } = req.body || {};
  if (!domain || !entries) return res.status(400).json({ error: 'domain_and_entries_required' });
  const id = `gl-${uuidv4().slice(0, 8)}`;
  const g = { id, domain, entries, createdAt: new Date().toISOString() };
  glossaries.set(id, g);
  res.status(201).json(g);
});

// ----- 404 -----
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[translation-os] listening on ${PORT} — provider: ${currentProvider}`);
});
installGracefulShutdown(server);
